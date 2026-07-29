/**
 * MODELAGIX — examen et réparation des volumes
 *
 * Un fichier 3D trouvé sur internet, ou exporté par un autre logiciel, est très
 * souvent défectueux sans que rien ne le montre à l'écran : il s'affiche
 * parfaitement et refuse de s'imprimer. C'est le genre de mur contre lequel un
 * élève bute sans comprendre, parce que le défaut est INVISIBLE.
 *
 * ── Quatre défauts, tous détectables d'un seul parcours ───────────────────
 *
 * 1. TROUS. Le moteur tient, pour chaque arête, le nombre de faces qui s'y
 *    appuient : 2 est normal, 1 signale un bord libre — la surface s'arrête là.
 *
 * 2. ARÊTES SURCHARGÉES. Le même nombre à 3 ou plus : deux morceaux de matière
 *    se rejoignent le long d'une même arête, comme les pages d'un livre. Aucun
 *    objet réel ne fait cela.
 *
 * 3. MORCEAUX SÉPARÉS. Un volume sculpté sans retenue finit souvent en
 *    plusieurs morceaux qui ne se touchent plus. À l'écran ils se confondent
 *    avec le reste ; à l'impression ils tombent.
 *
 * 4. TRIANGLES EN AIGUILLE. Les éclats pointus et les lamelles sans épaisseur
 *    qui hérissent une forme malmenée.
 *
 * Les deux premiers étaient seuls surveillés au départ. Jean-Jacques a malmené
 * une forme jusqu'à la rendre manifestement inimprimable — pénétrations
 * mutuelles, parois en lame de rasoir, éclats — sans déclencher la moindre
 * alerte : la topologie dynamique referme la surface au fur et à mesure, si
 * bien que le maillage reste FERMÉ tout en devenant impossible. Un maillage
 * fermé n'est pas un maillage sain.
 *
 * ── Deux autres, qui demandent l'octree ───────────────────────────────────
 *
 * 5. PAROIS TROP MINCES.  6. AUTO-INTERSECTIONS.
 *
 * Ceux-là ne se lisent pas dans la liste des faces mais dans leur disposition
 * dans l'espace : il faut lancer des rayons. Trop coûteux pour une surveillance
 * continue, ils forment un EXAMEN APPROFONDI, déclenché par le bouton
 * « Vérifier et réparer ». Voir `ExamenProfond.js`.
 *
 * Conséquence à ne pas perdre de vue : l'examen approfondi ÉCHANTILLONNE. Il
 * prouve la présence d'un défaut, jamais son absence. Les textes affichés disent
 * donc « au moins », jamais « aucun ».
 *
 * ── Ce qu'on répare ───────────────────────────────────────────────────────
 *
 * Deux remèdes, de portée très différente :
 *
 * • REBOUCHER : `editing/HoleFilling.js` repère toutes les boucles de bord et
 *   les referme par front d'avancée. Chirurgical, sans perte.
 *
 * • REFONDRE : le remaillage par voxels du moteur reconstruit une surface
 *   propre à partir du volume occupé. Il efface d'un coup TOUT ce qui précède —
 *   morceaux séparés, aiguilles, pénétrations, arêtes surchargées — parce qu'il
 *   ne reprend rien de l'ancien maillage. Le prix est le détail fin, qui ne
 *   survit pas. C'est le remède du dernier recours, et il doit se présenter
 *   comme tel.
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
import Utils from 'misc/Utils';
import ExamenProfond from 'modelagix/ExamenProfond';

/** Marque du quatrième sommet absent : la face est un triangle. */
var TRI = Utils.TRI_INDEX;

/**
 * Nombre de morceaux SÉPARÉS dans un maillage.
 *
 * Un volume sculpté sans retenue finit souvent en plusieurs morceaux qui ne se
 * touchent plus : des éclats détachés, un fragment resté en arrière. À l'écran
 * ils se confondent avec le reste ; à l'impression ils tombent.
 *
 * Méthode : union-find sur les sommets, en parcourant les faces. On n'utilise
 * que la liste des faces, donc cela marche aussi bien sur un maillage statique
 * que dynamique — les anneaux de voisinage, eux, ne sont pas stockés de la même
 * façon dans les deux cas.
 */
var compterLesMorceaux = function (maillage) {
  var faces = maillage.getFaces();
  var nbFaces = maillage.getNbFaces();
  var nbSommets = maillage.getNbVertices();
  var pere = new Int32Array(nbSommets);
  for (var i = 0; i < nbSommets; ++i) pere[i] = i;

  var racine = function (a) {
    while (pere[a] !== a) {
      pere[a] = pere[pere[a]]; // on aplatit le chemin au passage
      a = pere[a];
    }
    return a;
  };
  var unir = function (a, b) {
    var ra = racine(a);
    var rb = racine(b);
    if (ra !== rb) pere[rb] = ra;
  };

  var utilise = new Uint8Array(nbSommets);
  for (var f = 0; f < nbFaces; ++f) {
    var id = f * 4;
    var v1 = faces[id], v2 = faces[id + 1], v3 = faces[id + 2], v4 = faces[id + 3];
    utilise[v1] = utilise[v2] = utilise[v3] = 1;
    unir(v1, v2);
    unir(v2, v3);
    if (v4 !== TRI) { utilise[v4] = 1; unir(v3, v4); }
  }

  var morceaux = 0;
  for (var k = 0; k < nbSommets; ++k) {
    // Les sommets orphelins — plus référencés par aucune face — ne comptent pas
    // pour un morceau : ils ne sont rien à l'écran ni à l'impression.
    if (utilise[k] && racine(k) === k) ++morceaux;
  }
  return morceaux;
};

/**
 * Triangles en aiguille, et triangles plats.
 *
 * Un triangle sain est proche de l'équilatéral. On mesure sa QUALITÉ par
 * `4√3 × aire / (somme des carrés des côtés)` : 1 pour un équilatéral, 0 pour un
 * triangle écrasé. En dessous de 0,02, il n'a plus d'épaisseur utile — c'est une
 * aiguille ou une lamelle, ces éclats pointus qui hérissent une forme malmenée
 * et que l'imprimante ne saura pas rendre.
 *
 * La mesure est SANS DIMENSION : elle ne dépend ni de la taille de l'objet ni de
 * l'unité, donc aucun seuil à régler selon l'échelle.
 */
var QUALITE_MINIMALE = 0.02;
var RACINE12 = 4 * Math.sqrt(3);

var compterLesAiguilles = function (maillage) {
  var faces = maillage.getFaces();
  var sommets = maillage.getVertices();
  var nbFaces = maillage.getNbFaces();
  var mauvais = 0;

  for (var f = 0; f < nbFaces; ++f) {
    var id = f * 4;
    var v4 = faces[id + 3];
    // Un quadrilatère se juge sur ses deux triangles ; on regarde le premier,
    // ce qui suffit à repérer une face écrasée.
    var t = [faces[id], faces[id + 1], faces[id + 2]];
    if (v4 !== TRI) t[2] = faces[id + 2];

    var ax = sommets[t[0] * 3], ay = sommets[t[0] * 3 + 1], az = sommets[t[0] * 3 + 2];
    var bx = sommets[t[1] * 3], by = sommets[t[1] * 3 + 1], bz = sommets[t[1] * 3 + 2];
    var cx = sommets[t[2] * 3], cy = sommets[t[2] * 3 + 1], cz = sommets[t[2] * 3 + 2];

    var abx = bx - ax, aby = by - ay, abz = bz - az;
    var acx = cx - ax, acy = cy - ay, acz = cz - az;
    var bcx = cx - bx, bcy = cy - by, bcz = cz - bz;

    // Aire = demi-norme du produit vectoriel.
    var nx = aby * acz - abz * acy;
    var ny = abz * acx - abx * acz;
    var nz = abx * acy - aby * acx;
    var aire = Math.sqrt(nx * nx + ny * ny + nz * nz) * 0.5;

    var cotes = abx * abx + aby * aby + abz * abz +
      acx * acx + acy * acy + acz * acz +
      bcx * bcx + bcy * bcy + bcz * bcz;

    if (cotes === 0) { ++mauvais; continue; }
    if (RACINE12 * aire / cotes < QUALITE_MINIMALE) ++mauvais;
  }
  return mauvais;
};

/**
 * Examine un maillage.
 * @return {Object} {bordsLibres, trous, aretesSurchargees, morceaux, aiguilles, sain}
 */
var examinerUnMaillage = function (maillage) {
  var bordsLibres = 0;
  var surchargees = 0;

  // Seul le maillage STATIQUE tient le compte des faces par arête. Un maillage
  // dynamique n'en a pas besoin : sa topologie part d'une primitive fermée et
  // le reste — les trous arrivent par importation, et un fichier importé est
  // statique. On ne peut donc pas conclure sur ces deux points, et l'on ne
  // conclut pas.
  var aretes = maillage.getEdges();
  if (aretes) {
    for (var i = 0, n = aretes.length; i < n; ++i) {
      var faces = aretes[i];
      if (faces === 1) ++bordsLibres;
      else if (faces > 2) ++surchargees;
    }
  }

  // Le nombre de BOUCLES ne se déduit pas du nombre d'arêtes de bord : un
  // maillage peut avoir un seul grand trou de deux cents arêtes, ou deux cents
  // petits. C'est le nombre de boucles qui parle à l'utilisateur, et il ne se
  // compte qu'en les suivant — d'où cet appel, plus coûteux, réservé au cas où
  // il y a effectivement quelque chose à suivre.
  var trous = bordsLibres > 0 ? HoleFilling.detecterLesTrous(maillage).length : 0;
  var morceaux = compterLesMorceaux(maillage);
  var aiguilles = compterLesAiguilles(maillage);

  return {
    bordsLibres: bordsLibres,
    trous: trous,
    aretesSurchargees: surchargees,
    morceaux: morceaux,
    aiguilles: aiguilles,
    sain: bordsLibres === 0 && surchargees === 0 && morceaux <= 1 && aiguilles === 0
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
 *
 * @param {Object} main
 * @param {boolean} [profond]  ajoute la mesure des parois et la recherche
 *   d'auto-intersections. Coûteux — réservé à une demande explicite.
 * @return {Object} bilan
 */
Reparation.examiner = function (main, profond, densite) {
  var maillages = main.getMeshes();
  var bilan = {
    volumes: [], trous: 0, aretesSurchargees: 0,
    morceauxEnTrop: 0, aiguilles: 0,
    // `null` et non zéro : « pas encore regardé » n'est pas « rien trouvé ».
    paroisMinces: null, epaisseurMinimale: null, intersections: null,
    profond: !!profond,
    densite: profond ? (densite || 1) : 0,
    sain: true
  };

  for (var i = 0; i < maillages.length; ++i) {
    var etat = examinerUnMaillage(maillages[i]);
    etat.maillage = maillages[i];
    bilan.volumes.push(etat);
    bilan.trous += etat.trous;
    bilan.aretesSurchargees += etat.aretesSurchargees;
    // Un volume EST un morceau : ce sont les morceaux au-delà du premier qui
    // signalent un éclat détaché.
    bilan.morceauxEnTrop += Math.max(0, etat.morceaux - 1);
    bilan.aiguilles += etat.aiguilles;
    if (!etat.sain) bilan.sain = false;

    if (profond) {
      var fond = ExamenProfond.examiner(maillages[i], densite);
      etat.parois = fond.parois;
      etat.intersections = fond.intersections;
      bilan.paroisMinces = (bilan.paroisMinces || 0) + fond.parois.minces;
      bilan.intersections = (bilan.intersections || 0) + fond.intersections.trouvees;
      if (bilan.epaisseurMinimale === null || fond.parois.minimum < bilan.epaisseurMinimale) {
        bilan.epaisseurMinimale = fond.parois.minimum;
      }
      if (fond.parois.minces > 0 || fond.intersections.trouvees > 0) {
        etat.sain = false;
        bilan.sain = false;
      }
    }
  }
  return bilan;
};

/** Le seuil d'épaisseur, en proportion de la diagonale de l'objet. */
Reparation.EPAISSEUR_MINIMALE = ExamenProfond.EPAISSEUR_MINIMALE;
Reparation.DENSITE_SURVEILLANCE = ExamenProfond.DENSITE_SURVEILLANCE;

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

/**
 * Refond les volumes sélectionnés en une surface propre.
 *
 * On PILOTE le réglage du moteur (`GuiTopology.remesh`) au lieu de recopier son
 * travail : il gère déjà la conversion des maillages dynamiques, la fusion de
 * la sélection et l'étape d'historique. Recopier reviendrait à entretenir deux
 * versions du même code, dont l'une finirait par diverger.
 */
Reparation.refondre = function (gui) {
  var topologie = gui._ctrlTopology;
  if (!topologie) return false;
  topologie.remesh();
  return true;
};

export default Reparation;
