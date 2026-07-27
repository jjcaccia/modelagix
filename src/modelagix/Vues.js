/**
 * MODELAGIX — orientation des vues
 *
 * Les six vues orthogonales existent déjà dans le moteur (`resetViewFront`,
 * `resetViewTop`…) : on les appelle, on ne les réécrit pas.
 *
 * Les vues axonométriques — isométrique, dimétrique, trimétrique — n'existent
 * pas. On les construit en visant une orientation précise via `quatDelay`, la
 * rotation animée du moteur.
 *
 * ── Ce qui distingue les trois axonométries ───────────────────────────────
 * Une axonométrie se définit par le raccourcissement de chaque axe à l'écran.
 * Si `d` est la direction de vue (unitaire), l'axe i est vu à l'échelle
 * `sqrt(1 - d[i]²)`. Comme la somme des `d[i]²` vaut 1, les trois
 * raccourcissements vérifient toujours f² + f² + f² = 2.
 *
 *   - isométrique : les trois axes au même raccourcissement
 *   - dimétrique  : deux axes égaux, le troisième différent
 *   - trimétrique : les trois différents
 *
 * C'est une définition mesurable, donc vérifiable — et elle l'est, dans les
 * essais du navigateur, plutôt que supposée juste.
 *
 * Les angles ci-dessous sont dérivés de ces contraintes, pas choisis à vue :
 *   - isométrique : azimut 45°, élévation 35,264° (arctan(1/√2))
 *   - dimétrique  : azimut 45° (donc X et Z égaux), élévation 16,87°,
 *                   ce qui donne un rapport d'environ 1 : 1,3 : 1
 *   - trimétrique : azimut 30°, élévation 20° — aucun axe égal à un autre
 */

import { quat } from 'gl-matrix';

var DEG = Math.PI / 180;

/** Rotation animée : durée en millisecondes, reprise du moteur. */
var DUREE = 200;

/**
 * Quaternion d'une orientation donnée par azimut et élévation, en degrés.
 * L'azimut tourne autour de l'axe vertical, l'élévation lève le regard.
 */
var orientation = function (azimutDeg, elevationDeg) {
  var qAzimut = quat.setAxisAngle(quat.create(), [0, 1, 0], azimutDeg * DEG);
  var qElevation = quat.setAxisAngle(quat.create(), [1, 0, 0], elevationDeg * DEG);
  // L'azimut d'abord, l'élévation ensuite : l'ordre inverse ferait basculer
  // l'horizon. Vérifié par la mesure des raccourcissements, pas déduit.
  return quat.mul(quat.create(), qElevation, qAzimut);
};

/**
 * Les vues proposées. `methode` désigne une méthode du moteur quand elle
 * existe ; `azimut`/`elevation` prennent le relais sinon.
 */
/**
 * ⚠️ Les six vues orthogonales ne passent PLUS par `resetViewRight` et
 * consorts. Mesuré : le moteur nomme ses vues du point de vue du MODÈLE — sa
 * vue « droite » place la caméra du côté gauche de l'écran. Le cube
 * d'orientation, lui, nomme ses faces du point de vue du spectateur, comme le
 * fait n'importe quel repère de logiciel 3D.
 *
 * Deux conventions dans une même application rendraient l'outil incompréhensible.
 * On garde celle du spectateur, et ces vues sont donc définies par une
 * direction, pas par une méthode du moteur.
 *
 * Reste une exception connue : les raccourcis clavier F, T et L appartiennent
 * à SculptGL et suivent encore sa convention. Non touchés pour l'instant.
 */
var VUES = [
  { cle: 'face', libelle: 'De face', direction: [0, 0, 1] },
  { cle: 'arriere', libelle: 'De derrière', direction: [0, 0, -1] },
  { cle: 'droite', libelle: 'De droite', direction: [1, 0, 0] },
  { cle: 'gauche', libelle: 'De gauche', direction: [-1, 0, 0] },
  { cle: 'dessus', libelle: 'De dessus', direction: [0, 1, 0] },
  { cle: 'dessous', libelle: 'De dessous', direction: [0, -1, 0] },
  // Azimuts négatifs : on regarde depuis l'avant-DROITE, comme le veut la
  // convention du dessin technique. Avec la relation mesurée
  // (direction = −cos(élévation)·sin(azimut), …), c'est le signe négatif qui
  // amène la caméra du côté +X.
  { cle: 'isometrique', libelle: 'Isométrique', azimut: -45, elevation: 35.264 },
  { cle: 'dimetrique', libelle: 'Dimétrique', azimut: -45, elevation: 16.87 },
  { cle: 'trimetrique', libelle: 'Trimétrique', azimut: -30, elevation: 20 }
];

class Vues {

  constructor(main, gui) {
    this._main = main;
    this._gui = gui;
  }

  lister() {
    return VUES.map(function (v) {
      return { cle: v.cle, libelle: v.libelle };
    });
  }

  /** @return {boolean} false si la vue est inconnue */
  definir(cle) {
    var vue = null;
    for (var i = 0; i < VUES.length; ++i) {
      if (VUES[i].cle === cle) { vue = VUES[i]; break; }
    }
    if (!vue) return false;

    if (vue.direction) return this.regarderDepuis(vue.direction);

    this._main.getCamera().quatDelay(orientation(vue.azimut, vue.elevation), DUREE);
    this._main.render();
    return true;
  }

  /**
   * Place la caméra pour regarder l'objet DEPUIS une direction quelconque.
   *
   * La relation directe est :
   *   d = (cos(élévation)·sin(azimut), sin(élévation), cos(élévation)·cos(azimut))
   * vérifiée sur les trois cas connus du moteur — face (0,0,1), droite (1,0,0),
   * dessus (0,1,0). On l'inverse ici.
   *
   * C'est ce qui permet au cube d'orientation de gérer ses six faces, ses huit
   * coins et ses douze arêtes sans table de correspondance : chaque zone n'est
   * qu'une direction.
   *
   * @param {Array} d  direction, pas nécessairement unitaire
   */
  regarderDepuis(d) {
    var n = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
    if (!n) return false;
    var x = d[0] / n, y = d[1] / n, z = d[2] / n;

    // Le signe négatif sur x n'est pas une coquille. Mesuré : la vue que le
    // moteur nomme « droite » place la caméra en X négatif — il nomme ses vues
    // du point de vue du MODÈLE, pas du spectateur. Ma première formule était
    // calibrée sur ces noms au lieu des positions réelles, et gauche/droite
    // sortaient inversées sur le cube.
    var elevation = Math.asin(Math.max(-1, Math.min(1, y))) / DEG;
    var azimut = Math.atan2(-x, z) / DEG;

    this._main.getCamera().quatDelay(orientation(azimut, elevation), DUREE);
    this._main.render();
    return true;
  }

  /** La rotation courante de la caméra, pour dessiner le cube d'orientation. */
  getRotation() {
    return this._main.getCamera()._quatRot;
  }

  /** Recadre la caméra sur la scène, sans changer l'orientation. */
  recadrer() {
    this._main.getCamera().resetView();
    this._main.render();
  }

  // -----------------------------------------------------------------
  //  Projection
  // -----------------------------------------------------------------

  /** @return {string} 'perspective' ou 'orthographique' */
  getProjection() {
    return this._main.getCamera().isOrthographic() ? 'orthographique' : 'perspective';
  }

  /**
   * On pilote la liste déroulante d'origine plutôt que la caméra directement :
   * son callback recadre le zoom orthographique, ce que `setProjectionType`
   * seul ne fait pas, et la liste reste d'accord avec la caméra.
   */
  setProjection(type) {
    var ctrl = this._gui._ctrlCamera && this._gui._ctrlCamera._ctrlProjection;
    if (!ctrl) return false;
    ctrl.setValue(type === 'orthographique' ? 1 : 0);
    this._main.render();
    return true;
  }

  basculerProjection() {
    this.setProjection(this.getProjection() === 'perspective' ? 'orthographique' : 'perspective');
  }

  /**
   * Mesure le raccourcissement de chaque axe à l'écran, à partir de la
   * projection réelle du moteur. Sert à vérifier qu'une axonométrie est bien
   * celle qu'on annonce.
   * @return {Object} {x, y, z} longueurs à l'écran, normalisées sur la plus grande
   */
  mesurerRaccourcissements() {
    var camera = this._main.getCamera();
    var origine = camera.project([0, 0, 0]);
    var longueur = function (axe) {
      var p = camera.project(axe);
      var dx = p[0] - origine[0];
      var dy = p[1] - origine[1];
      return Math.sqrt(dx * dx + dy * dy);
    };
    var lx = longueur([1, 0, 0]);
    var ly = longueur([0, 1, 0]);
    var lz = longueur([0, 0, 1]);
    var max = Math.max(lx, ly, lz) || 1;
    return { x: lx / max, y: ly / max, z: lz / max };
  }
}

export default Vues;
