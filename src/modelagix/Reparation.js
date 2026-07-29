/**
 * MODELAGIX — examen et réparation des volumes
 *
 * Un fichier 3D trouvé sur internet, ou exporté par un autre logiciel, est très
 * souvent défectueux sans que rien ne le montre à l'écran : il s'affiche
 * parfaitement et refuse de s'imprimer. C'est le genre de mur contre lequel un
 * élève bute sans comprendre, parce que le défaut est INVISIBLE.
 *
 * ── Ce qu'on regarde ──────────────────────────────────────────────────────
 *
 * Le moteur tient déjà, pour chaque arête, le nombre de faces qui s'y appuient.
 * Ce seul nombre dit presque tout :
 *
 *   2  → normal. La matière a une face de chaque côté de l'arête.
 *   1  → BORD LIBRE. Il y a un trou : la surface s'arrête là.
 *   3+ → ARÊTE PARTAGÉE par trop de faces. Deux morceaux de matière se
 *        rejoignent le long d'une même arête, ce qu'aucun objet réel ne fait.
 *
 * Un objet imprimable est un objet FERMÉ : aucun bord libre, aucune arête
 * partagée par plus de deux faces. Compter ces arêtes coûte un seul parcours,
 * on peut donc le refaire à chaque changement sans que cela se sente.
 *
 * ── Ce qu'on répare ───────────────────────────────────────────────────────
 *
 * Les trous, et eux seuls. `editing/HoleFilling.js` — présent dans le moteur
 * depuis SculptGL, et jusqu'ici utilisé par le seul remaillage — repère TOUTES
 * les boucles de bord et les rebouche d'un coup, par front d'avancée.
 *
 * Les arêtes surchargées, elles, ne se réparent pas automatiquement : il faut
 * décider quelle moitié garder, et c'est un choix de forme. On les SIGNALE.
 *
 * ── Le piège du maillage sans contexte graphique ──────────────────────────
 *
 * `HoleFilling.createClosedMesh` construit un `MeshStatic` SANS contexte WebGL :
 * il servait d'étape intermédiaire au remaillage, qui rebâtissait ensuite le
 * maillage définitif. Tel quel, ce maillage ne peut pas s'afficher. On reprend
 * donc sa géométrie dans un maillage neuf, construit avec le contexte — le même
 * détour que pour les booléens.
 */

import HoleFilling from 'editing/HoleFilling';
import Mesh from 'mesh/Mesh';
import MeshStatic from 'mesh/meshStatic/MeshStatic';

/**
 * Examine un maillage.
 * @return {Object} {bordsLibres, trous, aretesSurchargees, sain}
 */
var examinerUnMaillage = function (maillage) {
  var aretes = maillage.getEdges();
  var bordsLibres = 0;
  var surchargees = 0;

  for (var i = 0, n = aretes.length; i < n; ++i) {
    var faces = aretes[i];
    if (faces === 1) ++bordsLibres;
    else if (faces > 2) ++surchargees;
  }

  // Le nombre de BOUCLES ne se déduit pas du nombre d'arêtes de bord : un
  // maillage peut avoir un seul grand trou de deux cents arêtes, ou deux cents
  // petits. C'est le nombre de boucles qui parle à l'utilisateur, et il ne se
  // compte qu'en les suivant — d'où cet appel, plus coûteux, réservé au cas où
  // il y a effectivement quelque chose à suivre.
  var trous = bordsLibres > 0 ? HoleFilling.detecterLesTrous(maillage).length : 0;

  return {
    bordsLibres: bordsLibres,
    trous: trous,
    aretesSurchargees: surchargees,
    sain: bordsLibres === 0 && surchargees === 0
  };
};

/**
 * Un maillage neuf, affichable, à partir de la géométrie d'un autre.
 *
 * `MeshStatic` prend un contexte WebGL, pas un maillage : ce n'est pas un
 * constructeur de copie. `Mesh.OPTIMIZE` est coupé le temps de l'initialisation,
 * sans quoi les sommets seraient réordonnés.
 */
var enMaillageAffichable = function (source, modele) {
  var nouveau = new MeshStatic(modele.getGL());
  nouveau.setID(modele.getID());
  nouveau.setTransformData(modele.getTransformData());

  var nbv = source.getNbVertices() * 3;
  nouveau.setVertices(source.getVertices().subarray(0, nbv));
  nouveau.setColors(source.getColors().subarray(0, nbv));
  nouveau.setMaterials(source.getMaterials().subarray(0, nbv));
  nouveau.setFaces(source.getFaces().subarray(0, source.getNbFaces() * 4));

  Mesh.OPTIMIZE = false;
  nouveau.init();
  Mesh.OPTIMIZE = true;

  nouveau.setRenderData(modele.getRenderData());
  nouveau.initRender();
  return nouveau;
};

var Reparation = {};

/**
 * Examine tous les volumes de la scène.
 * @return {Object} {volumes:[…], trous, aretesSurchargees, sain}
 */
Reparation.examiner = function (main) {
  var maillages = main.getMeshes();
  var bilan = { volumes: [], trous: 0, aretesSurchargees: 0, sain: true };

  for (var i = 0; i < maillages.length; ++i) {
    var etat = examinerUnMaillage(maillages[i]);
    etat.maillage = maillages[i];
    bilan.volumes.push(etat);
    bilan.trous += etat.trous;
    bilan.aretesSurchargees += etat.aretesSurchargees;
    if (!etat.sain) bilan.sain = false;
  }
  return bilan;
};

/**
 * Rebouche les trous de tous les volumes qui en ont.
 *
 * Une seule étape d'historique pour l'ensemble : on remplace des volumes, et
 * l'utilisateur a fait UN geste. `StateAddRemove` porte les deux moitiés.
 *
 * @return {Object} {volumesReparés, trousBouchés}
 */
Reparation.reparer = function (main) {
  var bilan = Reparation.examiner(main);
  var anciens = [];
  var nouveaux = [];
  var trous = 0;

  for (var i = 0; i < bilan.volumes.length; ++i) {
    var etat = bilan.volumes[i];
    if (etat.trous === 0) continue;

    var ferme = HoleFilling.createClosedMesh(etat.maillage);
    // Prudence : si la fermeture n'a rien changé, ne pas remplacer le maillage
    // pour rien — un remplacement coûte les tampons d'affichage.
    if (ferme === etat.maillage) continue;

    anciens.push(etat.maillage);
    nouveaux.push(enMaillageAffichable(ferme, etat.maillage));
    trous += etat.trous;
  }

  if (!anciens.length) return { volumesRepares: 0, trousBouches: 0 };

  var selection = main.getSelectedMeshes().slice();
  var liste = main.getMeshes();
  for (var j = 0; j < anciens.length; ++j) {
    liste[main.getIndexMesh(anciens[j])] = nouveaux[j];
  }

  main.getStateManager().pushStateAddRemove(nouveaux.slice(), anciens.slice());
  var etape = main.getStateManager().getCurrentState();
  if (etape) etape._selectMeshes = selection;

  // `setMesh` vide la sélection et y met SON maillage : les suivants seulement
  // sont à ajouter, sans quoi le premier y figurerait deux fois.
  main.setMesh(nouveaux[0]);
  for (var k = 1; k < nouveaux.length; ++k) main.getSelectedMeshes().push(nouveaux[k]);

  main.render();
  return { volumesRepares: nouveaux.length, trousBouches: trous };
};

export default Reparation;
