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
 * ── Ce que « fermer » veut dire ───────────────────────────────────────────
 *
 * Retirer des faces laisse une bouche ouverte. `HoleFilling.createClosedMesh`
 * la referme par front d'avancée — le même mécanisme que « Reboucher les
 * trous », déjà en place. La pièce ressort donc close, donc imprimable.
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

var TRI = Utils.TRI_INDEX;
var ID_STYLE = 'modelagix-style-decoupe';

/** En deçà, le tracé est un clic accidentel et non un lasso. */
var COTE_MINIMAL = 14;

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
   * @return {Object} {fait, facesRetirees, morceauxAbandonnes, raison}
   */
  decouper(trace) {
    var main = this._main;
    var maillage = main.getMesh();
    if (!maillage) return { fait: false, raison: 'aucun-volume' };

    var boite = main.getCanvas().getBoundingClientRect();
    var ratio = main.getPixelRatio();
    var largeur = main.getCanvasWidth();
    var hauteur = main.getCanvasHeight();

    // Le tracé est en coordonnées de FENÊTRE, la projection en pixels de
    // canevas : on ramène le premier dans le second une fois pour toutes,
    // plutôt que de convertir chaque sommet.
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
    if (maxX - minX < COTE_MINIMAL * ratio && maxY - minY < COTE_MINIMAL * ratio) {
      return { fait: false, raison: 'trop-petit' };
    }

    // Projection : monde → écran. La caméra donne vue et projection ; on les
    // compose avec la matrice de l'objet, sinon un volume déplacé serait
    // projeté depuis sa position d'origine.
    var camera = main.getCamera();
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

    if (!nbPris) return { fait: false, raison: 'rien-dedans' };

    // On ne garde que les faces dont AU MOINS un sommet reste dehors : une face
    // à cheval sur le bord survit, et c'est elle qui bordera le trou.
    var faces = maillage.getFaces();
    var nbFaces = maillage.getNbFaces();
    var gardees = new Uint32Array(nbFaces * 4);
    var n = 0;

    for (var f = 0; f < nbFaces; ++f) {
      var id = f * 4;
      var v1 = faces[id], v2 = faces[id + 1], v3 = faces[id + 2], v4 = faces[id + 3];
      var tout = pris[v1] && pris[v2] && pris[v3] && (v4 === TRI || pris[v4]);
      if (tout) continue;
      gardees[n] = v1; gardees[n + 1] = v2; gardees[n + 2] = v3; gardees[n + 3] = v4;
      n += 4;
    }

    var retirees = nbFaces - n / 4;
    if (!retirees) return { fait: false, raison: 'rien-dedans' };
    if (n === 0) return { fait: false, raison: 'tout-pris' };

    return this._reconstruire(maillage, gardees.subarray(0, n), retirees);
  }

  /**
   * Rebâtit le volume à partir des faces conservées, referme la coupe, et ne
   * garde que le morceau principal.
   */
  _reconstruire(ancien, faces, retirees) {
    var main = this._main;
    var etaitDynamique = ancien.isDynamic;

    var coupe = this._maillageDepuisFaces(ancien, faces);
    var ferme = HoleFilling.createClosedMesh(coupe);
    var source = ferme === coupe ? coupe : ferme;

    var garde = this._plusGrosMorceau(source);
    var nouveau = this._maillageAffichable(garde.maillage, ancien, garde.faces);
    if (etaitDynamique) nouveau = new MeshDynamic(nouveau);

    var selection = main.getSelectedMeshes().slice();
    main.getMeshes()[main.getIndexMesh(ancien)] = nouveau;
    main.getStateManager().pushStateAddRemove([nouveau], [ancien]);
    var etape = main.getStateManager().getCurrentState();
    if (etape) etape._selectMeshes = selection;
    main.setMesh(nouveau);
    main.render();

    return {
      fait: true,
      facesRetirees: retirees,
      morceauxAbandonnes: garde.abandonnes
    };
  }

  /** Un maillage sans contexte graphique, juste pour le rebouchage. */
  _maillageDepuisFaces(modele, faces) {
    var nouveau = new MeshStatic();
    var nbv = modele.getNbVertices() * 3;
    nouveau.setVertices(new Float32Array(modele.getVertices().subarray(0, nbv)));
    nouveau.setColors(new Float32Array(modele.getColors().subarray(0, nbv)));
    nouveau.setMaterials(new Float32Array(modele.getMaterials().subarray(0, nbv)));
    nouveau.setFaces(new Uint32Array(faces));
    nouveau.setTransformData(modele.getTransformData());
    Mesh.OPTIMIZE = false;
    nouveau.init();
    Mesh.OPTIMIZE = true;
    return nouveau;
  }

  /**
   * Les faces du plus gros morceau connexe. Union-find sur les sommets, comme
   * dans l'examen de santé — la même mécanique, le même piège des sommets
   * orphelins.
   */
  _plusGrosMorceau(maillage) {
    var faces = maillage.getFaces();
    var nbFaces = maillage.getNbFaces();
    var nbSommets = maillage.getNbVertices();
    var pere = new Int32Array(nbSommets);
    for (var i = 0; i < nbSommets; ++i) pere[i] = i;

    var racine = function (a) {
      while (pere[a] !== a) { pere[a] = pere[pere[a]]; a = pere[a]; }
      return a;
    };
    var unir = function (a, b) {
      var ra = racine(a), rb = racine(b);
      if (ra !== rb) pere[rb] = ra;
    };

    for (var f = 0; f < nbFaces; ++f) {
      var id = f * 4;
      unir(faces[id], faces[id + 1]);
      unir(faces[id + 1], faces[id + 2]);
      if (faces[id + 3] !== TRI) unir(faces[id + 2], faces[id + 3]);
    }

    var compte = {};
    var meilleur = -1;
    var meilleurCompte = 0;
    var morceaux = 0;
    for (var g = 0; g < nbFaces; ++g) {
      var r = racine(faces[g * 4]);
      if (compte[r] === undefined) { compte[r] = 0; ++morceaux; }
      if (++compte[r] > meilleurCompte) { meilleurCompte = compte[r]; meilleur = r; }
    }

    if (morceaux <= 1) {
      return { maillage: maillage, faces: faces.subarray(0, nbFaces * 4), abandonnes: 0 };
    }

    var retenues = new Uint32Array(meilleurCompte * 4);
    var n = 0;
    for (var h = 0; h < nbFaces; ++h) {
      var idh = h * 4;
      if (racine(faces[idh]) !== meilleur) continue;
      retenues[n] = faces[idh]; retenues[n + 1] = faces[idh + 1];
      retenues[n + 2] = faces[idh + 2]; retenues[n + 3] = faces[idh + 3];
      n += 4;
    }
    return { maillage: maillage, faces: retenues, abandonnes: morceaux - 1 };
  }

  /** Un maillage affichable — celui-ci a besoin du contexte graphique. */
  _maillageAffichable(source, modele, faces) {
    var nouveau = new MeshStatic(modele.getGL());
    nouveau.setID(modele.getID());
    nouveau.setTransformData(modele.getTransformData());

    var nbv = source.getNbVertices() * 3;
    nouveau.setVertices(new Float32Array(source.getVertices().subarray(0, nbv)));
    nouveau.setColors(new Float32Array(source.getColors().subarray(0, nbv)));
    nouveau.setMaterials(new Float32Array(source.getMaterials().subarray(0, nbv)));
    nouveau.setFaces(new Uint32Array(faces));

    Mesh.OPTIMIZE = false;
    nouveau.init();
    Mesh.OPTIMIZE = true;

    nouveau.setRenderData(modele.getRenderData());
    nouveau.initRender();
    return nouveau;
  }
}

export default Decoupe;
