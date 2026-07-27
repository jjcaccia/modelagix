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
var VUES = [
  { cle: 'face', libelle: 'De face', methode: 'resetViewFront' },
  { cle: 'arriere', libelle: 'De derrière', methode: 'resetViewBack' },
  { cle: 'droite', libelle: 'De droite', methode: 'resetViewRight' },
  { cle: 'gauche', libelle: 'De gauche', methode: 'resetViewLeft' },
  { cle: 'dessus', libelle: 'De dessus', methode: 'resetViewTop' },
  { cle: 'dessous', libelle: 'De dessous', methode: 'resetViewBottom' },
  { cle: 'isometrique', libelle: 'Isométrique', azimut: 45, elevation: 35.264 },
  { cle: 'dimetrique', libelle: 'Dimétrique', azimut: 45, elevation: 16.87 },
  { cle: 'trimetrique', libelle: 'Trimétrique', azimut: 30, elevation: 20 }
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

    var camera = this._main.getCamera();
    if (vue.methode) {
      camera[vue.methode]();
    } else {
      camera.quatDelay(orientation(vue.azimut, vue.elevation), DUREE);
    }
    this._main.render();
    return true;
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
