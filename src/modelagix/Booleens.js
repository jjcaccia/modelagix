/**
 * MODELAGIX — combiner deux volumes
 *
 * Addition, soustraction, intersection. Ce que Meshmixer et les modeleurs de
 * CAO appellent des opérations booléennes.
 *
 * ── Comment ça marche, en une phrase ──────────────────────────────────────
 *
 * On ne fait pas se croiser des triangles — c'est le chemin fragile, celui qui
 * produit des maillages troués dès que deux surfaces se frôlent. On passe par
 * le VOLUME : chaque objet est converti en un champ de distance signée, négatif
 * dedans, positif dehors ; les champs se combinent par de simples minimums et
 * maximums ; une surface est ensuite extraite du résultat.
 *
 *     addition      : min(a, b)      — est dedans ce qui est dans l'un OU l'autre
 *     intersection  : max(a, b)      — dedans ce qui est dans les DEUX
 *     soustraction  : max(a, −b)     — dedans A, et dehors B
 *
 * Le prix de cette robustesse : le résultat est REMAILLÉ de bout en bout. La
 * densité choisie ailleurs est perdue, comme pour le remaillage volumétrique du
 * moteur. C'est le compromis habituel de cette famille d'opérations.
 *
 * ── Ce qu'on réutilise du moteur, et pourquoi ─────────────────────────────
 *
 * Toute la machinerie existait déjà pour son « Remaillage volumétrique » :
 * voxelisation, remplissage depuis l'extérieur, extraction de surface. Elle
 * était seulement inatteignable — les fonctions étaient privées au fichier.
 * `Remesh.js` les publie désormais, sans qu'une seule de ses lignes change.
 *
 * `Remesh.remesh` ne pouvait pas servir tel quel : il voxelise TOUS les
 * maillages dans un champ unique, ce qui donne toujours l'addition et interdit
 * les deux autres opérations.
 *
 * ── Deux pièges rencontrés ────────────────────────────────────────────────
 *
 * 1. `creerVoxels` puise dans un tampon de travail PARTAGÉ (`Utils.getMemory`).
 *    Deux champs ne peuvent donc pas coexister : on recopie chaque champ dans
 *    un tableau à nous juste après l'avoir calculé, avant de passer au suivant.
 * 2. `preparerMaillages` MODIFIE les maillages qu'on lui donne — il y fige la
 *    matrice et bouche les trous. On lui passe donc des copies du tableau, et on
 *    le rappelle pour chaque volume afin que tous soient mesurés dans la même
 *    boîte.
 */

import Mesh from 'mesh/Mesh';
import MeshDynamic from 'mesh/dynamic/MeshDynamic';
import MeshStatic from 'mesh/meshStatic/MeshStatic';
import Remesh from 'editing/Remesh';
import SurfaceNets from 'editing/SurfaceNets';

/**
 * ── Le raccord en fondu ───────────────────────────────────────────────────
 *
 * L'addition ordinaire prend le minimum des deux distances : là où les deux
 * volumes se rencontrent, la surface fait un angle vif. C'est juste, et c'est
 * laid — deux formes qui se pénètrent ne se raccordent pas ainsi dans la
 * matière, où la pâte forme un congé.
 *
 * Le MINIMUM ADOUCI arrondit cette rencontre. Sa forme est celle qu'emploient
 * les modeleurs par fonctions implicites depuis longtemps :
 *
 *     h = max(k − |a − b|, 0) / k
 *     min(a, b) − k · h² / 4
 *
 * `k` est la largeur du raccord, en unités du monde. Loin de la rencontre,
 * `|a − b|` dépasse `k`, `h` vaut zéro et l'on retrouve exactement le minimum :
 * le fondu ne coûte rien là où il n'a rien à faire. C'est ce qui le rend sûr —
 * il ne déforme QUE le voisinage de la jonction.
 *
 * La soustraction a son pendant : on adoucit `max(a, −b)` de la même façon, ce
 * qui donne un creux au bord arrondi plutôt qu'une arête coupante.
 */
var LARGEUR_FONDU = 0;

var minAdouci = function (a, b, k) {
  if (k <= 0) return a < b ? a : b;
  var h = Math.max(k - Math.abs(a - b), 0) / k;
  return (a < b ? a : b) - k * h * h * 0.25;
};

var maxAdouci = function (a, b, k) {
  // max adouci = −min adouci des opposés : une seule formule à vérifier.
  return -minAdouci(-a, -b, k);
};

/** Les opérations, et ce qu'elles font d'un couple de distances. */
var OPERATIONS = {
  addition: function (a, b) { return a < b ? a : b; },
  intersection: function (a, b) { return a > b ? a : b; },
  soustraction: function (a, b) { return a > -b ? a : -b; },
  fondu: function (a, b) { return minAdouci(a, b, LARGEUR_FONDU); },
  creuxFondu: function (a, b) { return maxAdouci(a, -b, LARGEUR_FONDU); }
};

var LIBELLES = {
  addition: 'Additionner',
  intersection: 'Intersection',
  soustraction: 'Soustraire',
  fondu: 'Fusionner en fondu',
  creuxFondu: 'Creuser en fondu'
};

/** Les opérations qui demandent une largeur de raccord. */
var AVEC_FONDU = { fondu: true, creuxFondu: true };

/**
 * La boîte qui contient tous les volumes, et les maillages préparés.
 *
 * On prépare TOUT ensemble une première fois pour connaître la boîte commune :
 * les champs doivent partager la même grille, sans quoi ils ne se combinent
 * pas case à case.
 */
var preparer = function (meshes) {
  var copies = meshes.slice();
  var boite = Remesh.preparerMaillages(copies);
  return { boite: boite, maillages: copies };
};

/**
 * Le champ de distance signée d'un maillage, dans une grille donnée.
 * @return {Float32Array} une copie, indépendante du tampon partagé
 */
var champDe = function (maillage, boite) {
  var voxels = Remesh.creerVoxels(boite);
  Remesh.voxeliser(maillage, voxels);
  Remesh.remplirDepuisLExterieur(voxels);
  // ── Tout est recopié, pas seulement les distances ─────────────────────
  //
  // Le tampon est partagé : au prochain appel, TOUS les tableaux de `voxels`
  // pointeront sur les données du maillage suivant. N'avoir recopié que le
  // champ de distance laissait les couleurs et les matières du premier volume
  // écrasées par celles du second — la moitié du résultat sortait noire, et
  // rien ne laissait deviner que la cause était ailleurs que dans la géométrie.
  return {
    champ: new Float32Array(voxels.distanceField),
    couleurs: new Float32Array(voxels.colorField),
    matieres: new Float32Array(voxels.materialField),
    voxels: voxels
  };
};

/**
 * Un maillage statique équivalent.
 *
 * `MeshStatic` prend un contexte WebGL, pas un maillage : ce n'est pas un
 * constructeur de copie. On reprend donc la conversion du moteur
 * (`GuiTopology.convertToStaticMesh`) telle quelle. `Mesh.OPTIMIZE` est coupé le
 * temps de l'initialisation, sans quoi les sommets seraient réordonnés et les
 * tableaux ne correspondraient plus.
 */
var enStatique = function (maillage) {
  if (!maillage.isDynamic) return maillage;

  var nouveau = new MeshStatic(maillage.getGL());
  nouveau.setID(maillage.getID());
  nouveau.setTransformData(maillage.getTransformData());
  var nbv = maillage.getNbVertices() * 3;
  nouveau.setVertices(maillage.getVertices().subarray(0, nbv));
  nouveau.setColors(maillage.getColors().subarray(0, nbv));
  nouveau.setMaterials(maillage.getMaterials().subarray(0, nbv));
  nouveau.setFaces(maillage.getFaces().subarray(0, maillage.getNbFaces() * 4));

  Mesh.OPTIMIZE = false;
  nouveau.init();
  Mesh.OPTIMIZE = true;

  nouveau.setRenderData(maillage.getRenderData());
  nouveau.initRender();
  return nouveau;
};

var Booleens = {};

Booleens.OPERATIONS = Object.keys(OPERATIONS);
Booleens.LIBELLES = LIBELLES;

/**
 * Largeur du raccord, en proportion de la diagonale des volumes combinés.
 *
 * 6 % : assez pour qu'on voie un congé franc, assez peu pour qu'une petite
 * forme posée sur une grande ne soit pas absorbée. Réglable — c'est le seul
 * nombre à toucher si le fondu paraît trop mou ou trop sec.
 */
Booleens.FONDU = 0.06;

/**
 * Combine les volumes sélectionnés.
 *
 * @param {Object} main       l'application
 * @param {string} operation  'addition' | 'soustraction' | 'intersection'
 * @return {Object|null} le maillage produit, ou null si l'opération n'a pas lieu
 */
/**
 * La résolution de voxelisation qui convient à un maillage.
 *
 * ── Pourquoi ce n'est pas un simple « mettre plus haut » ──────────────────
 *
 * Le booléen passe par une grille de voxels : il redécoupe TOUT le volume à ce
 * pas, y compris les parties qu'on ne touchait pas. C'est là que la finesse se
 * perd, et Jean-Jacques l'a vu.
 *
 * On ne peut pas simplement monter la résolution : la grille est cubique, et sa
 * mémoire croît au CUBE. À 150, elle occupe déjà une centaine de mégaoctets par
 * volume — champ de distance, couleurs et matières confondus, et le calcul en
 * tient deux copies. À 300, ce serait plus d'un gigaoctet et le navigateur
 * rendrait les armes.
 *
 * On vise donc un pas de voxel proche de l'arête moyenne du maillage — assez
 * fin pour ne pas perdre ce qui existe, pas plus — et l'on borne à 220, valeur
 * au-delà de laquelle la mémoire devient déraisonnable.
 */
Booleens.resolutionPour = function (maillage) {
  if (!maillage) return Booleens.RESOLUTION_MINIMALE;

  var boite = maillage.getLocalBound();
  var cote = Math.max(boite[3] - boite[0], boite[4] - boite[1], boite[5] - boite[2]);
  if (!(cote > 0)) return Booleens.RESOLUTION_MINIMALE;

  // Arête moyenne, estimée sur un échantillon de faces : la mesurer toutes
  // coûterait plus cher que le booléen lui-même sur les gros maillages.
  var faces = maillage.getFaces();
  var sommets = maillage.getVertices();
  var nbFaces = maillage.getNbFaces();
  var pas = Math.max(1, Math.floor(nbFaces / 400));
  var somme = 0, compte = 0;

  for (var f = 0; f < nbFaces; f += pas) {
    var id = f * 4;
    var a = faces[id] * 3, b = faces[id + 1] * 3;
    var dx = sommets[a] - sommets[b];
    var dy = sommets[a + 1] - sommets[b + 1];
    var dz = sommets[a + 2] - sommets[b + 2];
    somme += Math.sqrt(dx * dx + dy * dy + dz * dz);
    ++compte;
  }
  if (!compte || !somme) return Booleens.RESOLUTION_MINIMALE;

  var arete = somme / compte;
  // ── Le facteur 1,7, mesuré et non deviné ─────────────────────────────
  //
  // On pourrait croire qu'une grille de N voxels par côté rend un maillage dont
  // les arêtes valent un N-ième du côté. C'est faux : les surface nets posent
  // environ une facette par voxel de surface, là où un maillage subdivisé en
  // porte deux fois et demie sur la même aire.
  //
  // Mesuré : la sphère de départ (196 608 faces, arête = côté/145) ressort à
  // 65 856 faces après un booléen à 150. Il faut donc 150 × √(196608/65856),
  // soit environ 1,7 fois l'estimation naïve, pour retrouver la même finesse.
  var voulue = Math.round(cote / arete * 1.7);
  return Math.max(Booleens.RESOLUTION_MINIMALE,
    Math.min(Booleens.RESOLUTION_MAXIMALE, voulue));
};

/** Résolution du moteur, gardée comme plancher. */
Booleens.RESOLUTION_MINIMALE = 150;
/**
 * Plafond. Au-delà, la grille dépasse le demi-gigaoctet — la mémoire d'une
 * grille cubique croît au cube de sa résolution, ce qui va très vite.
 */
Booleens.RESOLUTION_MAXIMALE = 220;

/**
 * @param {Object} main
 * @param {string} operation
 * @param {number} [resolution]  pas de la grille ; celle du moteur par défaut
 */
Booleens.combiner = function (main, operation, resolution) {
  var combiner = OPERATIONS[operation];
  if (!combiner) return null;

  var selection = main.getSelectedMeshes().slice();
  if (selection.length < 2) return null;

  var courant = main.getMesh();
  var etaitDynamique = courant && courant.isDynamic;

  // Le moteur ne voxelise que des maillages statiques.
  var statiques = selection.map(enStatique);

  // La résolution du moteur est un réglage GLOBAL, partagé avec le remaillage :
  // on la pose le temps du calcul et on la remet, sinon un booléen changerait
  // en douce le comportement d'un autre outil.
  var resolutionAvant = Remesh.RESOLUTION;
  if (resolution) Remesh.RESOLUTION = resolution;

  var prepare = preparer(statiques);
  var boite = prepare.boite;
  var maillages = prepare.maillages;

  // ── La largeur du raccord se mesure sur la scène ─────────────────────
  //
  // Une valeur en unités absolues n'aurait pas de sens : le même nombre ferait
  // un congé imperceptible sur une grande pièce et fondrait entièrement une
  // petite. On la prend donc en proportion de la diagonale de la boîte
  // commune, ce qui la rend juste à toutes les échelles.
  if (AVEC_FONDU[operation]) {
    var dx = boite[3] - boite[0], dy = boite[4] - boite[1], dz = boite[5] - boite[2];
    LARGEUR_FONDU = Math.sqrt(dx * dx + dy * dy + dz * dz) * Booleens.FONDU;
  }

  // ── L'ORDRE COMPTE pour la soustraction ──────────────────────────────
  // On retire les autres au PREMIER sélectionné. Ce n'est pas arbitraire :
  // c'est l'ordre dans lequel l'utilisateur a cliqué, donc celui qu'il a en
  // tête. Pour l'addition et l'intersection, l'ordre est sans effet.
  var premier = champDe(maillages[0], boite);
  var resultat = premier.champ;
  var voxels = premier.voxels;

  var couleurs = premier.couleurs;
  var matieres = premier.matieres;

  for (var i = 1; i < maillages.length; ++i) {
    var suivant = champDe(maillages[i], boite);
    for (var c = 0; c < resultat.length; ++c) {
      var combine = combiner(resultat[c], suivant.champ[c]);
      // ── L'aspect suit le volume qui l'emporte ────────────────────────
      //
      // Chaque champ ne porte de couleur et de matière QUE là où sa propre
      // surface est passée : ailleurs il vaut −1, qui se rend en noir. Ne
      // garder que l'aspect du premier volume laissait donc toute la région du
      // second en noir — c'est ce qu'on voyait, et la géométrie n'y était pour
      // rien. On reprend l'aspect de celui dont la distance a gagné.
      if (combine !== resultat[c]) {
        var t = c * 3;
        couleurs[t] = suivant.couleurs[t];
        couleurs[t + 1] = suivant.couleurs[t + 1];
        couleurs[t + 2] = suivant.couleurs[t + 2];
        matieres[t] = suivant.matieres[t];
        matieres[t + 1] = suivant.matieres[t + 1];
        matieres[t + 2] = suivant.matieres[t + 2];
      }
      resultat[c] = combine;
    }
  }

  // La grille du dernier passage sert de support : seules ses dimensions, son
  // pas et son origine comptent. Les trois tableaux, eux, sont les nôtres —
  // ceux du premier volume, dont le résultat hérite de l'aspect.
  voxels.distanceField = resultat;
  voxels.colorField = couleurs;
  voxels.materialField = matieres;

  var surface = SurfaceNets.computeSurface(voxels);
  Remesh.RESOLUTION = resolutionAvant;
  if (!surface || !surface.vertices || !surface.vertices.length) return null;

  var support = courant || selection[0];
  var nouveau = Remesh.creerMaillage(support, surface.faces, surface.vertices,
    surface.colors, surface.materials);
  Remesh.recalerSurLaBoite(nouveau, boite);

  // On suit EXACTEMENT ce que fait le moteur après son propre remaillage
  // (`GuiTopology.remesh`) : pas d'enveloppe multirésolution. En ajouter une
  // laissait la moitié du résultat noire — ses normales n'étaient plus celles
  // du maillage affiché.
  if (etaitDynamique) nouveau = new MeshDynamic(nouveau);

  // Un seul état d'annulation pour l'ensemble : ce qui disparaît et ce qui
  // apparaît font partie du même geste.
  main.getStateManager().pushStateAddRemove(nouveau, selection);
  main.removeMeshes(selection);
  main.getMeshes().push(nouveau);
  main.setMesh(nouveau);
  main.render();
  return nouveau;
};

/**
 * Supprime les volumes sélectionnés.
 * @return {number} combien ont été retirés
 */
Booleens.supprimer = function (main) {
  var selection = main.getSelectedMeshes().slice();
  if (!selection.length) return 0;
  // On ne laisse pas la scène vide : il faut toujours quelque chose à sculpter.
  if (selection.length >= main.getMeshes().length) return 0;

  main.getStateManager().pushStateRemove(selection);
  main.removeMeshes(selection);
  main.setMesh(main.getMeshes()[main.getMeshes().length - 1] || null);
  main.render();
  return selection.length;
};

export default Booleens;
