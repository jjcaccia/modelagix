/**
 * MODELAGIX — l'examen approfondi : parois minces et auto-intersections
 *
 * Les quatre premiers défauts (trous, arêtes surchargées, morceaux séparés,
 * éclats) se lisent dans un seul parcours des tableaux : on peut les surveiller
 * en continu. Ces deux-ci sont d'une autre nature — ils ne se voient pas dans la
 * LISTE des faces mais dans leur DISPOSITION dans l'espace. Il faut interroger
 * l'octree, ce qui coûte, d'où un examen à la demande.
 *
 * ── Parois trop minces ────────────────────────────────────────────────────
 *
 * On part d'un sommet, on rentre légèrement sous la surface, et on lance un
 * rayon vers l'intérieur, le long de la normale inversée. La première surface
 * rencontrée est la paroi d'en face : la distance parcourue EST l'épaisseur de
 * matière à cet endroit.
 *
 * C'est la mesure que fait un préparateur d'impression avant de lancer une
 * machine, et c'est celle qui manquait : une lame de rasoir modelée par
 * inadvertance s'affiche parfaitement et ne s'imprime pas.
 *
 * ── Auto-intersections ────────────────────────────────────────────────────
 *
 * Deux parties du MÊME volume qui se traversent. La surface reste fermée, tous
 * les comptages restent bons, et pourtant l'objet n'a plus d'intérieur défini —
 * la machine ne sait plus ce qui est plein et ce qui est vide.
 *
 * On prend un triangle, on demande à l'octree les faces contenues dans sa
 * sphère englobante, et l'on teste les triangles qui ne lui sont PAS voisins.
 * Deux triangles se traversent lorsqu'une arête de l'un perce l'autre : six
 * segments à tester, avec la fonction du moteur, déjà éprouvée.
 *
 * ── Pourquoi on échantillonne ─────────────────────────────────────────────
 *
 * Tout examiner sur deux cent mille faces prendrait des dizaines de secondes.
 * On tire un échantillon régulier — un sommet sur N, une face sur N — ce qui
 * donne une réponse en une seconde. **Un échantillon ne prouve pas l'absence de
 * défaut**, seulement sa présence : le compte rendu doit donc dire « au moins »
 * et jamais « aucun ». C'est écrit dans les textes affichés.
 *
 * ── Le piège du tampon partagé ────────────────────────────────────────────
 *
 * `mesh.intersectRay` et `mesh.intersectSphere` écrivent tous deux dans le
 * tampon de travail commun (`Utils.getMemory`). Deux appels successifs se
 * marchent dessus. On COPIE donc le résultat avant tout autre appel — même
 * piège que pour les booléens, deuxième fois qu'il se présente.
 */

import { vec3 } from 'gl-matrix';
import Geometry from 'math3d/Geometry';
import Utils from 'misc/Utils';

var TRI = Utils.TRI_INDEX;

/**
 * Épaisseur en dessous de laquelle on alerte, en proportion de la diagonale de
 * l'objet. 0,6 % : sur une pièce de 100 mm cela fait 0,6 mm, à peu près la
 * limite d'une buse de 0,4 mm. C'est le nombre à revoir si l'atelier change de
 * machine.
 */
var EPAISSEUR_MINIMALE = 0.006;

/** Nombre de sondages. Au-delà, on gagne en certitude et on perd en patience. */
var SONDAGES_EPAISSEUR = 700;
var SONDAGES_INTERSECTION = 500;

var _v1 = [0, 0, 0];
var _v2 = [0, 0, 0];
var _v3 = [0, 0, 0];
var _w1 = [0, 0, 0];
var _w2 = [0, 0, 0];
var _w3 = [0, 0, 0];
var _dir = [0, 0, 0];
var _orig = [0, 0, 0];
var _inter = [0, 0, 0];

var lireSommet = function (sortie, sommets, indice) {
  var i = indice * 3;
  sortie[0] = sommets[i];
  sortie[1] = sommets[i + 1];
  sortie[2] = sommets[i + 2];
  return sortie;
};

/** La diagonale de la boîte englobante — l'étalon de toutes les distances. */
var diagonale = function (maillage) {
  var b = maillage.getLocalBound();
  var dx = b[3] - b[0], dy = b[4] - b[1], dz = b[5] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// ===================================================================
//  Parois minces
// ===================================================================

/**
 * @return {Object} {minimum, minces, sondes} — épaisseurs en proportion de la
 *   diagonale ; `minces` compte les sondages sous le seuil.
 */
var mesurerLesParois = function (maillage) {
  var sommets = maillage.getVertices();
  var normales = maillage.getNormals();
  var faces = maillage.getFaces();
  var nbSommets = maillage.getNbVertices();
  var taille = diagonale(maillage);
  if (!taille || !nbSommets) return { minimum: 1, minces: 0, sondes: 0 };

  // Le point de départ est enfoncé sous la surface, sinon le rayon ressort
  // aussitôt par la face qui porte le sommet lui-même.
  var retrait = taille * 0.0015;
  var pas = Math.max(1, Math.floor(nbSommets / SONDAGES_EPAISSEUR));

  var minimum = Infinity;
  var minces = 0;
  var sondes = 0;

  for (var s = 0; s < nbSommets; s += pas) {
    var i = s * 3;
    _dir[0] = -normales[i];
    _dir[1] = -normales[i + 1];
    _dir[2] = -normales[i + 2];
    var norme = Math.sqrt(_dir[0] * _dir[0] + _dir[1] * _dir[1] + _dir[2] * _dir[2]);
    if (norme < 1e-9) continue;
    _dir[0] /= norme; _dir[1] /= norme; _dir[2] /= norme;

    _orig[0] = sommets[i] + _dir[0] * retrait;
    _orig[1] = sommets[i + 1] + _dir[1] * retrait;
    _orig[2] = sommets[i + 2] + _dir[2] * retrait;

    var candidates = maillage.intersectRay(_orig, _dir);
    var distance = Infinity;

    for (var c = 0; c < candidates.length; ++c) {
      var idf = candidates[c] * 4;
      lireSommet(_v1, sommets, faces[idf]);
      lireSommet(_v2, sommets, faces[idf + 1]);
      lireSommet(_v3, sommets, faces[idf + 2]);
      var d = Geometry.intersectionRayTriangle(_orig, _dir, _v1, _v2, _v3, _inter);
      if (d < 0 && faces[idf + 3] !== TRI) {
        lireSommet(_w1, sommets, faces[idf + 3]);
        d = Geometry.intersectionRayTriangle(_orig, _dir, _v1, _v3, _w1, _inter);
      }
      if (d >= 0 && d < distance) distance = d;
    }

    if (distance === Infinity) continue; // rien en face : pas une paroi
    ++sondes;
    var epaisseur = (distance + retrait) / taille;
    if (epaisseur < minimum) minimum = epaisseur;
    if (epaisseur < EPAISSEUR_MINIMALE) ++minces;
  }

  return {
    minimum: minimum === Infinity ? 1 : minimum,
    minces: minces,
    sondes: sondes
  };
};

// ===================================================================
//  Auto-intersections
// ===================================================================

/** Deux triangles partagent-ils au moins un sommet ? */
var voisins = function (a, b) {
  for (var i = 0; i < 3; ++i) {
    for (var j = 0; j < 3; ++j) {
      if (a[i] === b[j]) return true;
    }
  }
  return false;
};

/**
 * Une arête du triangle A perce-t-elle le triangle B ?
 * On lance le rayon depuis le premier point de l'arête et l'on vérifie que le
 * point percé tombe AVANT le second — sinon la droite coupe le plan au-delà de
 * l'arête, et les triangles ne se touchent pas.
 */
var areteTraverse = function (p, q, b1, b2, b3) {
  vec3.sub(_dir, q, p);
  var longueur = vec3.length(_dir);
  if (longueur < 1e-12) return false;
  vec3.scale(_dir, _dir, 1 / longueur);
  var d = Geometry.intersectionRayTriangle(p, _dir, b1, b2, b3, _inter);
  return d >= 0 && d <= longueur;
};

var trianglesSeTraversent = function (a1, a2, a3, b1, b2, b3) {
  return areteTraverse(a1, a2, b1, b2, b3) ||
    areteTraverse(a2, a3, b1, b2, b3) ||
    areteTraverse(a3, a1, b1, b2, b3) ||
    areteTraverse(b1, b2, a1, a2, a3) ||
    areteTraverse(b2, b3, a1, a2, a3) ||
    areteTraverse(b3, b1, a1, a2, a3);
};

/** @return {Object} {trouvees, sondes} */
var chercherLesIntersections = function (maillage) {
  var sommets = maillage.getVertices();
  var faces = maillage.getFaces();
  var nbFaces = maillage.getNbFaces();
  if (!nbFaces) return { trouvees: 0, sondes: 0 };

  var pas = Math.max(1, Math.floor(nbFaces / SONDAGES_INTERSECTION));
  var trouvees = 0;
  var sondes = 0;
  var centre = [0, 0, 0];
  var triA = [0, 0, 0];

  for (var f = 0; f < nbFaces; f += pas) {
    var idf = f * 4;
    triA[0] = faces[idf]; triA[1] = faces[idf + 1]; triA[2] = faces[idf + 2];
    lireSommet(_v1, sommets, triA[0]);
    lireSommet(_v2, sommets, triA[1]);
    lireSommet(_v3, sommets, triA[2]);

    centre[0] = (_v1[0] + _v2[0] + _v3[0]) / 3;
    centre[1] = (_v1[1] + _v2[1] + _v3[1]) / 3;
    centre[2] = (_v1[2] + _v2[2] + _v3[2]) / 3;
    var rayon2 = Math.max(
      vec3.sqrDist(centre, _v1), vec3.sqrDist(centre, _v2), vec3.sqrDist(centre, _v3));

    // COPIE obligatoire : le tampon rendu par l'octree est partagé, et il sera
    // réécrit au sondage suivant.
    var candidates = Array.prototype.slice.call(maillage.intersectSphere(centre, rayon2));
    ++sondes;

    var touche = false;
    for (var c = 0; c < candidates.length && !touche; ++c) {
      var g = candidates[c];
      if (g === f) continue;
      var idg = g * 4;
      var triB = [faces[idg], faces[idg + 1], faces[idg + 2]];
      if (voisins(triA, triB)) continue;

      lireSommet(_w1, sommets, triB[0]);
      lireSommet(_w2, sommets, triB[1]);
      lireSommet(_w3, sommets, triB[2]);
      if (trianglesSeTraversent(_v1, _v2, _v3, _w1, _w2, _w3)) touche = true;
    }
    if (touche) ++trouvees;
  }

  return { trouvees: trouvees, sondes: sondes };
};

var ExamenProfond = {};

ExamenProfond.EPAISSEUR_MINIMALE = EPAISSEUR_MINIMALE;

/**
 * Examine un maillage en profondeur.
 * @return {Object} {parois:{minimum, minces, sondes}, intersections:{trouvees, sondes}}
 */
ExamenProfond.examiner = function (maillage) {
  return {
    parois: mesurerLesParois(maillage),
    intersections: chercherLesIntersections(maillage)
  };
};

export default ExamenProfond;
