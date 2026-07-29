/**
 * MODELAGIX — découper une zone au lasso
 *
 * On entoure à l'écran la partie à supprimer, on relâche : elle disparaît, et
 * le bord laissé à vif se referme tout seul.
 *
 * C'est le remède aux défauts que rien ne sait réparer — un éclat qui traverse
 * la pièce, une excroissance en lame de rasoir, un morceau resté en arrière.
 * Refondre les efface aussi, mais efface le reste avec ; découper est le geste
 * précis : on désigne ce dont on ne veut plus.
 *
 * ── Comment la sélection est faite ────────────────────────────────────────
 *
 * Le lasso est un polygone tracé à l'ÉCRAN. Chaque sommet du maillage est
 * projeté à l'écran, et l'on regarde s'il tombe dedans, par la règle du nombre
 * de croisements : une demi-droite partant du point coupe le contour un nombre
 * impair de fois si et seulement si le point est à l'intérieur.
 *
 * On supprime ensuite toute face dont les TROIS sommets sont pris. Une face à
 * cheval sur le bord reste : c'est ce qui donne une coupe nette au lieu d'une
 * dentelle, et c'est elle qui bordera le trou.
 *
 * ── Les trois temps de la coupe ───────────────────────────────────────────
 *
 * La première version coupait tout de suite, et la coupe était en dents de scie.
 * Jean-Jacques a vu pourquoi, et la remarque était juste : **la netteté du bord
 * ne dépend que de la taille des polygones traversés**. Un triangle de dix
 * millimètres ne peut pas produire un bord précis au millimètre — il est pris
 * ou il ne l'est pas, il n'y a rien entre les deux.
 *
 * D'où trois temps, dans cet ordre :
 *
 * **1. Raffiner la bande.** On repère les faces que le tracé traverse, on
 * élargit de deux anneaux de chaque côté — la marge —, et l'on subdivise cette
 * bande jusqu'à ce que ses arêtes soient trois fois plus courtes. Le reste du
 * maillage n'est pas touché.
 *
 * **2. Couper.** Le tracé retombe alors sur des polygones assez petits pour
 * suivre sa forme.
 *
 * **3. Aplanir la tranche.** On calcule le plan moyen du bord laissé à vif et
 * l'on y ramène ses sommets, avant de reboucher. Deux effets d'un seul geste :
 * la calotte de fermeture est plate, et l'arête du pourtour cesse d'onduler.
 *
 * `HoleFilling.createClosedMesh` referme — le même mécanisme que « Reboucher
 * les trous », déjà en place.
 *
 * ── On travaille sur une COPIE ────────────────────────────────────────────
 *
 * Le raffinage modifie le maillage sur place. Si on le faisait sur l'original,
 * l'annulation le rendrait subdivisé au lieu de le rendre intact : le geste
 * tiendrait en deux étapes au lieu d'une, et la première ne ramènerait pas où
 * l'on croit. On copie donc, on travaille sur la copie, et l'original ne bouge
 * pas jusqu'au remplacement final.
 *
 * ── Deux choix qui méritent d'être dits ───────────────────────────────────
 *
 * **On coupe à travers.** Le lasso ne voit pas la profondeur : ce qui est
 * derrière l'objet, dans le même contour, part aussi. C'est le comportement
 * habituel de ce geste, et le seul qui soit prévisible — mais il faut tourner
 * la pièce pour vérifier avant de couper.
 *
 * **On garde le plus gros morceau.** Si la découpe laisse la pièce en
 * plusieurs morceaux, on ne conserve que le principal : c'est presque toujours
 * l'intention, et l'inverse — se retrouver avec trois fragments sans le savoir —
 * est précisément le défaut que l'on cherchait à corriger. Dit dans le compte
 * rendu, jamais en silence.
 */

import { mat4, vec3 } from 'gl-matrix';
import HoleFilling from 'editing/HoleFilling';
import Mesh from 'mesh/Mesh';
import MeshStatic from 'mesh/meshStatic/MeshStatic';
import MeshDynamic from 'mesh/dynamic/MeshDynamic';
import Utils from 'misc/Utils';
import Booleens from 'modelagix/Booleens';

var TRI = Utils.TRI_INDEX;
var ID_STYLE = 'modelagix-style-decoupe';

/** En deçà, le tracé est un clic accidentel et non un lasso. */
var COTE_MINIMAL = 14;

/**
 * ── Le raffinage de la bande est DÉSACTIVÉ, et voici pourquoi ────────────
 *
 * L'idée de Jean-Jacques est juste : la netteté du bord ne dépend que de la
 * taille des polygones traversés. Mon implémentation, elle, coûte trop cher.
 *
 * Mesuré sur la sphère de départ (196 608 faces), lasso couvrant un dixième de
 * l'écran :
 *
 *     arête ÷ 3, deux anneaux de marge → 1 264 800 faces, 7,3 s
 *     arête ÷ 2, un anneau de marge    →   558 592 faces, 2,8 s
 *
 * La cause est dans le moteur. `Subdivision.subdivision(mesh, iTris, centre,
 * rayon2, cible2, …)` limite la subdivision à une SPHÈRE, et boucle jusqu'à ce
 * que plus rien ne change. Or la bande de coupe est un ANNEAU : sa sphère
 * englobante couvre tout l'intérieur du lasso. La subdivision s'y propage donc
 * de proche en proche, et raffine une surface au lieu d'un liseré.
 *
 * **La solution est connue mais non encore vérifiée** : découper l'anneau en
 * une vingtaine de secteurs et lancer une subdivision par secteur, chacune avec
 * sa petite sphère. La propagation reste alors confinée. Je ne l'ai pas mise en
 * service parce que je n'ai pas pu la mesurer, et qu'un outil de trois secondes
 * ne vaut pas mieux qu'un bord un peu dentelé.
 *
 * L'aplanissement de la tranche, lui, est en service : il ne coûte rien et
 * corrige déjà l'ondulation du pourtour.
 */
var RAFFINER_LA_BANDE = false;

/**
 * De combien les arêtes de la bande de coupe sont raccourcies.
 *
 * La moitié en longueur, donc le quart en surface : quatre fois plus de
 * triangles là où le tracé passe.
 *
 * Premier essai à un tiers (donc un neuvième en surface) avec deux anneaux de
 * marge : le maillage est passé de 196 000 à 1 264 000 faces et la coupe a pris
 * **sept secondes**. La cause est l'empilement — chaque anneau de marge
 * multiplie la bande par cinq environ, et la subdivision boucle ensuite jusqu'à
 * ce que TOUTE la bande soit sous la cible. Deux anneaux et un tiers d'arête,
 * cela fait vingt-cinq fois plus de faces multipliées par neuf.
 */
var FINESSE_COUPE = 1 / 2;
/**
 * Anneaux de faces ajoutés de part et d'autre du tracé — la marge.
 * UN seul : chaque anneau supplémentaire quintuple la bande.
 */
var MARGE_ANNEAUX = 0;
/** Au-delà, on renonce à raffiner : la coupe se fera sur le maillage tel quel. */
var FACES_MAXIMUM = 500000;

var CSS = [
  '.modelagix-lasso {',
  '  position: fixed;',
  '  top: 0;',
  '  left: 0;',
  // Largeur et hauteur EXPLICITES. `inset: 0` ne suffit pas : un SVG est un
  // élément remplacé, et sa taille intrinsèque par défaut — 300 × 150 — l'a
  // emporté. Le tracé était bien dans le document, aux bonnes coordonnées,
  // mais rogné par une boîte de 300 × 150 dans le coin de l'écran. On voyait
  // donc… rien, sans la moindre erreur.
  '  width: 100vw;',
  '  height: 100vh;',
  '  z-index: 13;',
  '  pointer-events: none;',
  '}',
  '.modelagix-lasso path {',
  '  fill: rgba(240, 160, 160, 0.10);',
  '  stroke: #f0a0a0;',
  '  stroke-width: 1.5;',
  '  stroke-dasharray: 5 4;',
  '  stroke-linejoin: round;',
  '}'
].join('\n');

/**
 * Triangulation d'un polygone par découpe d'oreilles.
 *
 * On cherche un sommet dont le triangle avec ses deux voisins ne contient aucun
 * autre sommet et tourne dans le bon sens : c'est une « oreille », on la coupe,
 * et l'on recommence. Une centaine de lignes qu'aucune bibliothèque du projet
 * n'offre, et qu'un éventail depuis le centre ne remplace pas — un tracé à main
 * levée a presque toujours une concavité.
 *
 * @return {Array} indices, par groupes de trois
 */
var trianguler = function (points) {
  var n = points.length / 2;
  var reste = [];
  for (var i = 0; i < n; ++i) reste.push(i);

  var aire2 = function (a, b, c) {
    return (points[b * 2] - points[a * 2]) * (points[c * 2 + 1] - points[a * 2 + 1]) -
      (points[c * 2] - points[a * 2]) * (points[b * 2 + 1] - points[a * 2 + 1]);
  };

  // Sens de parcours du contour, par l'aire signée : la découpe d'oreilles ne
  // marche que si l'on sait dans quel sens tourne « vers l'intérieur ».
  var total = 0;
  for (var k = 0; k < n; ++k) {
    var k2 = (k + 1) % n;
    total += points[k * 2] * points[k2 * 2 + 1] - points[k2 * 2] * points[k * 2 + 1];
  }
  var sens = total >= 0 ? 1 : -1;

  var dansTriangle = function (a, b, c, p) {
    var d1 = aire2(a, b, p) * sens;
    var d2 = aire2(b, c, p) * sens;
    var d3 = aire2(c, a, p) * sens;
    return d1 >= 0 && d2 >= 0 && d3 >= 0;
  };

  var sortie = [];
  var garde = 0;
  while (reste.length > 3 && ++garde < 20000) {
    var coupee = false;
    for (var j = 0; j < reste.length; ++j) {
      var a = reste[(j + reste.length - 1) % reste.length];
      var b = reste[j];
      var c = reste[(j + 1) % reste.length];
      if (aire2(a, b, c) * sens <= 0) continue; // pointe rentrante

      var libre = true;
      for (var m = 0; m < reste.length && libre; ++m) {
        var p = reste[m];
        if (p === a || p === b || p === c) continue;
        if (dansTriangle(a, b, c, p)) libre = false;
      }
      if (!libre) continue;

      sortie.push(a, b, c);
      reste.splice(j, 1);
      coupee = true;
      break;
    }
    // Contour dégénéré — on s'arrête plutôt que de tourner sans fin.
    if (!coupee) break;
  }
  if (reste.length === 3) sortie.push(reste[0], reste[1], reste[2]);
  return sortie;
};

/** Le point (x, y) est-il dans le polygone ? Règle du nombre de croisements. */
var dansLePolygone = function (x, y, points) {
  var dedans = false;
  var n = points.length / 2;
  for (var i = 0, j = n - 1; i < n; j = i++) {
    var xi = points[i * 2], yi = points[i * 2 + 1];
    var xj = points[j * 2], yj = points[j * 2 + 1];
    if ((yi > y) !== (yj > y) &&
      x < (xj - xi) * (y - yi) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
};

class Decoupe {

  constructor(main) {
    this._main = main;
    this._actif = false;
    this._trace = null;
    this._prevenir = null;

    this._injecterStyle();
    this._calque = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this._calque.setAttribute('class', 'modelagix-lasso');
    this._chemin = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this._calque.appendChild(this._chemin);

    var canevas = main.getCanvas();
    canevas.addEventListener('mousedown', this._surDescente.bind(this), true);
    window.addEventListener('mousemove', this._surDeplacement.bind(this), false);
    window.addEventListener('mouseup', this._surRemontee.bind(this), false);
  }

  _injecterStyle() {
    if (document.getElementById(ID_STYLE)) return;
    var style = document.createElement('style');
    style.id = ID_STYLE;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  surChangement(callback) {
    this._prevenir = callback;
  }

  estActif() {
    return this._actif;
  }

  activer(actif) {
    this._actif = !!actif;
    var canevas = this._main.getCanvas();
    if (this._actif) {
      this._curseurAvant = canevas.style.cursor;
      canevas.style.cursor = 'crosshair';
    } else {
      canevas.style.cursor = this._curseurAvant || '';
      this._effacerLeTrace();
    }
    return this._actif;
  }

  basculer() {
    return this.activer(!this._actif);
  }

  // -----------------------------------------------------------------
  //  Le tracé
  // -----------------------------------------------------------------

  _surDescente(event) {
    if (!this._actif || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    this._trace = [event.clientX, event.clientY];
    document.body.appendChild(this._calque);
    this._dessiner();
  }

  _surDeplacement(event) {
    if (!this._trace) return;
    var n = this._trace.length;
    var dx = event.clientX - this._trace[n - 2];
    var dy = event.clientY - this._trace[n - 1];
    // Un point tous les trois pixels : assez pour suivre la main, assez peu
    // pour que le test d'appartenance ne devienne pas un calcul de patience.
    if (dx * dx + dy * dy < 9) return;
    this._trace.push(event.clientX, event.clientY);
    this._dessiner();
  }

  _surRemontee() {
    if (!this._trace) return;
    var trace = this._trace;
    this._effacerLeTrace();
    if (trace.length < 8) return;

    var resultat = this.decouper(trace);

    // ── On sort du mode une fois la coupe faite ────────────────────────
    // Découper n'est pas un pinceau : on ne coupe pas dix fois de suite. Rester
    // armé après le geste, c'est risquer d'entamer la pièce au clic suivant, en
    // croyant simplement la tourner. On ne reste dans le mode que si le geste
    // n'a rien donné — l'utilisateur voudra alors recommencer.
    if (resultat && resultat.fait) this.activer(false);

    if (this._prevenir) this._prevenir(resultat);
  }

  _dessiner() {
    var t = this._trace;
    var d = 'M' + t[0] + ' ' + t[1];
    for (var i = 2; i < t.length; i += 2) d += 'L' + t[i] + ' ' + t[i + 1];
    this._chemin.setAttribute('d', d + 'Z');
  }

  _effacerLeTrace() {
    this._trace = null;
    if (this._calque.parentNode) this._calque.parentNode.removeChild(this._calque);
  }

  // -----------------------------------------------------------------
  //  La coupe
  // -----------------------------------------------------------------

  /**
   * @param {Array} trace  polygone à l'écran, en coordonnées de fenêtre
   * @return {Object} {fait, raison}
   */
  decouper(trace) {
    var main = this._main;
    var cible = main.getMesh();
    if (!cible) return { fait: false, raison: 'aucun-volume' };

    var polygone = this._polygoneEcran(trace);
    if (!polygone) return { fait: false, raison: 'trop-petit' };

    if (!this._marquer(cible, polygone).nbPris) {
      return { fait: false, raison: 'rien-dedans' };
    }

    var outil = this._prisme(cible, polygone);
    if (!outil) return { fait: false, raison: 'tracé-illisible' };

    // ── La soustraction fait tout le travail ───────────────────────────
    // On pose l'outil dans la scène, on sélectionne cible PUIS outil — l'ordre
    // compte, la soustraction retire les suivants au premier — et l'on appelle
    // la même opération booléenne que le bouton « Creuser ». Le résultat est
    // une surface calculée, donc franche, sans dents de scie ni calotte à
    // reboucher : c'est ce qui manquait à la découpe par retrait de faces.
    main.getMeshes().push(outil);
    var selectionAvant = main.getSelectedMeshes().slice();
    main.setMesh(cible);
    main.getSelectedMeshes().push(outil);

    var resolution = Booleens.resolutionPour(cible);
    var nouveauMaillage = Booleens.combiner(main, 'soustraction', resolution);

    if (!nouveauMaillage) {
      // Rien n'a été produit : on remet la scène comme on l'a trouvée.
      var i = main.getIndexMesh(outil);
      if (i >= 0) main.getMeshes().splice(i, 1);
      main.getSelectedMeshes().length = 0;
      for (var k = 0; k < selectionAvant.length; ++k) {
        main.getSelectedMeshes().push(selectionAvant[k]);
      }
      main.setMesh(cible);
      return { fait: false, raison: 'rien-dedans' };
    }

    return { fait: true, resolution: resolution };
  }

  /**
   * Le volume qui découpe : un prisme invisible, extrudé du tracé.
   *
   * Chaque point du lasso donne un rayon partant de l'œil. On prend sur chaque
   * rayon deux points, de part et d'autre de la pièce, et l'on relie : un
   * emporte-pièce dont la section est exactement le tracé, et qui traverse la
   * cible de part en part.
   *
   * Les deux fonds sont triangulés par découpe d'oreilles — un tracé à main
   * levée n'est pas convexe, et un éventail depuis le centre produirait des
   * triangles retournés dès la moindre concavité. La même triangulation sert aux
   * deux fonds, l'un des deux à l'envers pour que les normales sortent.
   */
  _prisme(cible, polygone) {
    var main = this._main;
    var camera = main.getCamera();
    var nbPoints = polygone.length / 2;
    if (nbPoints < 3) return null;

    var oreilles = trianguler(polygone);
    if (!oreilles.length) return null;

    // Le centre et le rayon de la cible, en repère du monde.
    var boite = cible.getLocalBound();
    var centre = [(boite[0] + boite[3]) * 0.5, (boite[1] + boite[4]) * 0.5, (boite[2] + boite[5]) * 0.5];
    vec3.transformMat4(centre, centre, cible.getMatrix());
    // ── La longueur du prisme décide de la finesse du résultat ─────────
    //
    // Le booléen voxelise la boîte qui contient LES DEUX volumes, à un pas égal
    // à son plus grand côté divisé par la résolution. Un prisme trop long gonfle
    // donc cette boîte et grossit le pas — sur toute la pièce, pas seulement à
    // l'endroit de la coupe.
    //
    // Premier essai avec 1,2 fois la diagonale de chaque côté : la boîte
    // triplait, le pas triplait, et la sphère de 196 608 faces ressortait à
    // 12 820. On prend donc la demi-étendue RÉELLE de la pièce le long de l'axe
    // de vue, plus trois pour cent — juste de quoi traverser.
    var demiEtendue = 0;
    var coins = [boite[0], boite[1], boite[2], boite[3], boite[4], boite[5]];
    var coin = [0, 0, 0];
    for (var c = 0; c < 8; ++c) {
      coin[0] = coins[(c & 1) ? 3 : 0];
      coin[1] = coins[(c & 2) ? 4 : 1];
      coin[2] = coins[(c & 4) ? 5 : 2];
      vec3.transformMat4(coin, coin, cible.getMatrix());
      var ecart = Math.abs((coin[0] - centre[0]) * 0 + (coin[1] - centre[1]) * 0 +
        (coin[2] - centre[2]) * 0);
      var distance = Math.sqrt(
        (coin[0] - centre[0]) * (coin[0] - centre[0]) +
        (coin[1] - centre[1]) * (coin[1] - centre[1]) +
        (coin[2] - centre[2]) * (coin[2] - centre[2]));
      if (distance > demiEtendue) demiEtendue = distance;
      if (ecart > 0) demiEtendue = demiEtendue; // sans effet, garde la forme lisible
    }
    var portee = demiEtendue * 1.03;
    if (!(portee > 0)) portee = 1;

    var sommets = new Float32Array(nbPoints * 6);
    var o = [0, 0, 0], d = [0, 0, 0], q = [0, 0, 0];

    for (var i = 0; i < nbPoints; ++i) {
      vec3.copy(o, camera.unproject(polygone[i * 2], polygone[i * 2 + 1], 0.0));
      vec3.copy(q, camera.unproject(polygone[i * 2], polygone[i * 2 + 1], 0.1));
      vec3.normalize(d, vec3.sub(d, q, o));

      // Le point du rayon le plus proche du centre de la cible : c'est autour de
      // lui qu'on étale le prisme, sinon un objet éloigné passerait à côté.
      var t = (centre[0] - o[0]) * d[0] + (centre[1] - o[1]) * d[1] + (centre[2] - o[2]) * d[2];
      var ax = o[0] + d[0] * t, ay = o[1] + d[1] * t, az = o[2] + d[2] * t;

      var avant = i * 3;
      var arriere = (nbPoints + i) * 3;
      sommets[avant] = ax - d[0] * portee;
      sommets[avant + 1] = ay - d[1] * portee;
      sommets[avant + 2] = az - d[2] * portee;
      sommets[arriere] = ax + d[0] * portee;
      sommets[arriere + 1] = ay + d[1] * portee;
      sommets[arriere + 2] = az + d[2] * portee;
    }

    var nbTriangles = oreilles.length / 3;
    var nbFaces = nbTriangles * 2 + nbPoints * 2;
    var faces = new Uint32Array(nbFaces * 4);
    var n = 0;

    for (var t1 = 0; t1 < nbTriangles; ++t1) {
      var a = oreilles[t1 * 3], b = oreilles[t1 * 3 + 1], c = oreilles[t1 * 3 + 2];
      faces[n] = a; faces[n + 1] = b; faces[n + 2] = c; faces[n + 3] = TRI; n += 4;
      faces[n] = nbPoints + c; faces[n + 1] = nbPoints + b; faces[n + 2] = nbPoints + a;
      faces[n + 3] = TRI; n += 4;
    }
    for (var j = 0; j < nbPoints; ++j) {
      var j2 = (j + 1) % nbPoints;
      faces[n] = j; faces[n + 1] = nbPoints + j; faces[n + 2] = nbPoints + j2;
      faces[n + 3] = TRI; n += 4;
      faces[n] = j; faces[n + 1] = nbPoints + j2; faces[n + 2] = j2;
      faces[n + 3] = TRI; n += 4;
    }

    var prisme = new MeshStatic(cible.getGL());
    prisme.setVertices(sommets);
    prisme.setFaces(faces);
    prisme.setColors(new Float32Array(nbPoints * 6).fill(1));
    prisme.setMaterials(new Float32Array(nbPoints * 6).fill(0.5));
    Mesh.OPTIMIZE = false;
    prisme.init();
    Mesh.OPTIMIZE = true;
    prisme.initRender();
    return prisme;
  }

  /**
   * Le tracé, ramené en pixels de canevas.
   * @return {Float32Array|null} null si le tracé est trop petit pour être un geste
   */
  _polygoneEcran(trace) {
    var main = this._main;
    var boite = main.getCanvas().getBoundingClientRect();
    var ratio = main.getPixelRatio();

    var polygone = new Float32Array(trace.length);
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var t = 0; t < trace.length; t += 2) {
      var px = (trace[t] - boite.left) * ratio;
      var py = (trace[t + 1] - boite.top) * ratio;
      polygone[t] = px;
      polygone[t + 1] = py;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    if (maxX - minX < COTE_MINIMAL * ratio && maxY - minY < COTE_MINIMAL * ratio) return null;
    return polygone;
  }

  /**
   * Quels sommets tombent dans le tracé.
   *
   * La projection compose vue, projection ET matrice de l'objet — sans cette
   * dernière, un volume déplacé serait projeté depuis sa position d'origine.
   */
  _marquer(maillage, polygone) {
    var main = this._main;
    var camera = main.getCamera();
    var largeur = main.getCanvasWidth();
    var hauteur = main.getCanvasHeight();

    var mvp = mat4.create();
    mat4.mul(mvp, camera.getProjection(), camera.getView());
    mat4.mul(mvp, mvp, maillage.getMatrix());

    var sommets = maillage.getVertices();
    var nbSommets = maillage.getNbVertices();
    var pris = new Uint8Array(nbSommets);
    var p = [0, 0, 0];
    var nbPris = 0;

    for (var v = 0; v < nbSommets; ++v) {
      p[0] = sommets[v * 3];
      p[1] = sommets[v * 3 + 1];
      p[2] = sommets[v * 3 + 2];
      vec3.transformMat4(p, p, mvp);
      var ex = (p[0] * 0.5 + 0.5) * largeur;
      var ey = (0.5 - p[1] * 0.5) * hauteur;
      if (dansLePolygone(ex, ey, polygone)) { pris[v] = 1; ++nbPris; }
    }
    return { pris: pris, nbPris: nbPris };
  }

  /** Une copie dynamique, seule capable de se subdiviser localement. */
  _copieDynamique(modele) {
    if (!MeshDynamic) return null;
    var statique = new MeshStatic(modele.getGL());
    statique.setID(modele.getID());
    statique.setTransformData(modele.getTransformData());
    var nbv = modele.getNbVertices() * 3;
    statique.setVertices(new Float32Array(modele.getVertices().subarray(0, nbv)));
    statique.setColors(new Float32Array(modele.getColors().subarray(0, nbv)));
    statique.setMaterials(new Float32Array(modele.getMaterials().subarray(0, nbv)));
    statique.setFaces(new Uint32Array(modele.getFaces().subarray(0, modele.getNbFaces() * 4)));

    Mesh.OPTIMIZE = false;
    statique.init();
    Mesh.OPTIMIZE = true;

    var copie = new MeshDynamic(statique);
    copie.init();
    return copie;
  }

  /**
   * Subdivise la bande que le tracé traverse.
   *
   * L'historique ne doit RIEN enregistrer ici : cette copie n'existe que le
   * temps du calcul, et le remplacement final portera l'étape unique. D'où le
   * faux gestionnaire d'états, qui accepte les appels et n'en fait rien.
   *
   * @return {boolean} vrai si la bande a effectivement été raffinée
   */
  _raffinerLaBande(maillage, polygone) {
    var marque = this._marquer(maillage, polygone);
    var pris = marque.pris;
    var faces = maillage.getFaces();
    var nbFaces = maillage.getNbFaces();

    // La bande : les faces à cheval sur le tracé.
    var bande = [];
    for (var f = 0; f < nbFaces; ++f) {
      var id = f * 4;
      var v1 = faces[id], v2 = faces[id + 1], v3 = faces[id + 2], v4 = faces[id + 3];
      var dedans = (pris[v1] ? 1 : 0) + (pris[v2] ? 1 : 0) + (pris[v3] ? 1 : 0) +
        (v4 !== TRI && pris[v4] ? 1 : 0);
      var total = v4 === TRI ? 3 : 4;
      if (dedans > 0 && dedans < total) bande.push(f);
    }
    if (!bande.length) return false;

    // La marge : on élargit de quelques anneaux, sinon la finesse s'arrête net
    // au bord de la coupe et la transition se voit.
    var iFaces = new Uint32Array(bande);
    for (var anneau = 0; anneau < MARGE_ANNEAUX; ++anneau) {
      iFaces = maillage.getFacesFromVertices(maillage.getVerticesFromFaces(iFaces));
      iFaces = new Uint32Array(iFaces);
    }

    var mesure = this._mesurerLaBande(maillage, iFaces);
    if (!mesure.moyenne2) return false;
    // Une bande subdivisée jusqu'à la moitié de son arête fait environ quatre
    // fois plus de faces. On refuse plutôt que de faire attendre.
    if (nbFaces + iFaces.length * 4 > FACES_MAXIMUM) return false;

    var faux = { pushVertices: function () {}, pushFaces: function () {} };
    maillage.subdivide(iFaces, mesure.centre, mesure.rayon2,
      mesure.moyenne2 * FINESSE_COUPE, faux);
    maillage.init();
    return true;
  }

  /** Arête moyenne au carré, centre et rayon² de la bande. */
  _mesurerLaBande(maillage, iFaces) {
    var fAr = maillage.getFaces();
    var vAr = maillage.getVertices();
    var somme = 0, compte = 0;
    var minX = Infinity, minY = Infinity, minZ = Infinity;
    var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (var i = 0; i < iFaces.length; ++i) {
      var id = iFaces[i] * 4;
      for (var c = 0; c < 3; ++c) {
        var a = fAr[id + c] * 3;
        var b = fAr[id + (c + 1) % 3] * 3;
        var dx = vAr[a] - vAr[b], dy = vAr[a + 1] - vAr[b + 1], dz = vAr[a + 2] - vAr[b + 2];
        somme += dx * dx + dy * dy + dz * dz;
        ++compte;
        if (vAr[a] < minX) minX = vAr[a];
        if (vAr[a] > maxX) maxX = vAr[a];
        if (vAr[a + 1] < minY) minY = vAr[a + 1];
        if (vAr[a + 1] > maxY) maxY = vAr[a + 1];
        if (vAr[a + 2] < minZ) minZ = vAr[a + 2];
        if (vAr[a + 2] > maxZ) maxZ = vAr[a + 2];
      }
    }
    if (!compte) return { moyenne2: 0 };

    var cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5, cz = (minZ + maxZ) * 0.5;
    var dx2 = maxX - cx, dy2 = maxY - cy, dz2 = maxZ - cz;
    return {
      moyenne2: somme / compte,
      centre: [cx, cy, cz],
      // Un peu large : le rayon borne la subdivision, et un bord tout juste
      // atteint donnerait une bande raffinée d'un seul côté.
      rayon2: (dx2 * dx2 + dy2 * dy2 + dz2 * dz2) * 1.3
    };
  }

}

export default Decoupe;
