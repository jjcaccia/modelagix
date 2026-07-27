/**
 * MODELAGIX — les options booléennes des outils
 *
 * Chaque outil de sculpture a ses propres interrupteurs : Argile, Négatif,
 * Cumul… Ils vivent sur l'objet outil (`tool._clay`, `tool._negative`…) et
 * l'interface d'origine les pilote par des cases à cocher.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────
 * La case à cocher de yagui garde son état DANS SON PROPRE ÉLÉMENT HTML
 * (`domCheckbox.checked`), pas dans l'outil. Écrire `tool._clay = true`
 * directement laisserait la case sur son ancienne valeur ; au clic suivant,
 * elle repartirait de cet état périmé. Ce sont exactement les « deux vérités
 * qui divergent » contre lesquelles le cahier des charges met en garde.
 *
 * On passe donc par `widget.setValue(valeur)` : le callback du widget écrit
 * dans l'outil, et la case reste juste. Une seule vérité.
 *
 * ── Comment on retrouve la bonne case ─────────────────────────────────────
 * yagui ne garde aucune trace de la propriété qu'une case pilote. On pourrait
 * la reconnaître à son étiquette, mais l'utilisateur peut changer la langue de
 * l'application en cours de route et l'étiquette changerait avec.
 *
 * On l'identifie donc PAR CE QU'ELLE ÉCRIT : on appelle son callback avec une
 * valeur témoin, on observe quelle propriété de l'outil a bougé, puis on
 * restaure aussitôt la valeur d'origine. Ces callbacks ne font qu'écrire une
 * propriété — vérifié dans GuiSculptingTools — donc l'opération est sans effet
 * de bord. Indépendant de la langue, et de l'ordre des cases.
 *
 * La découverte n'a lieu qu'une fois, au démarrage.
 */

import GuiSculptingTools from 'gui/GuiSculptingTools';

/**
 * Nos étiquettes, courtes, pour des pastilles.
 * Volontairement les nôtres : celles de l'interface d'origine sont des phrases,
 * trop longues pour une pastille.
 *
 * `_lockPosition` est volontairement absent : il règle la position des textures
 * alpha (les tampons), une fonction que notre interface n'expose pas. L'afficher
 * serait proposer un interrupteur sans effet visible.
 */
var LIBELLES = {
  _clay: 'Argile',
  _negative: 'Négatif',
  _accumulate: 'Cumul',
  _culling: 'Face avant',
  _tangent: 'Tangentiel',
  _topoCheck: 'Topologie'
};

/** Ordre d'affichage souhaité ; ce qui n'y figure pas passe après. */
var ORDRE = ['_clay', '_negative', '_accumulate', '_tangent', '_topoCheck', '_culling'];

/**
 * Pour un outil donné, associe chaque propriété booléenne à la case qui la
 * pilote. Retourne un objet { nomDePropriete: widget }.
 */
var decouvrir = function (tool, ctrls) {
  var trouve = {};
  if (!tool || !ctrls) return trouve;

  // Les propriétés booléennes de l'outil, avant toute manipulation.
  var booleennes = [];
  for (var cle in tool) {
    if (typeof tool[cle] === 'boolean') booleennes.push(cle);
  }

  for (var i = 0; i < ctrls.length; ++i) {
    var widget = ctrls[i];
    // Seules les cases à cocher nous intéressent, et seulement si leur
    // callback est bien une écriture de propriété.
    if (!widget || !widget.domCheckbox || typeof widget.callback !== 'function') continue;

    var avant = {};
    for (var j = 0; j < booleennes.length; ++j) avant[booleennes[j]] = tool[booleennes[j]];

    var temoin = {}; // valeur impossible à confondre avec un booléen
    try {
      widget.callback(temoin);
    } catch (e) {
      continue; // callback qui fait autre chose : on le laisse tranquille
    }

    var propriete = null;
    for (var k = 0; k < booleennes.length; ++k) {
      if (tool[booleennes[k]] === temoin) {
        propriete = booleennes[k];
        break;
      }
    }

    // On restaure dans tous les cas, y compris si rien n'a été identifié.
    for (var n = 0; n < booleennes.length; ++n) tool[booleennes[n]] = avant[booleennes[n]];

    if (propriete && LIBELLES[propriete] && !trouve[propriete]) {
      trouve[propriete] = widget;
    }
  }

  return trouve;
};

class OptionsOutils {

  /** @param {Object} sculptManager  le gestionnaire de sculpture du moteur */
  constructor(sculptManager) {
    this._parOutil = {}; // index d'outil -> { propriete: widget }

    var guiTools = GuiSculptingTools.tools;
    for (var i = 0; i < guiTools.length; ++i) {
      var gTool = guiTools[i];
      var tool = sculptManager.getTool(i);
      if (!gTool || !tool) continue;
      this._parOutil[i] = decouvrir(tool, gTool._ctrls);
    }
  }

  /** Les options de l'outil d'indice donné, dans l'ordre d'affichage. */
  lister(indexOutil, tool) {
    var trouve = this._parOutil[indexOutil] || {};
    var liste = [];

    var ajouter = function (propriete) {
      if (!trouve[propriete]) return;
      liste.push({
        cle: propriete.replace(/^_/, ''),
        libelle: LIBELLES[propriete],
        actif: tool[propriete] === true
      });
    };

    for (var i = 0; i < ORDRE.length; ++i) ajouter(ORDRE[i]);
    for (var p in trouve) {
      if (ORDRE.indexOf(p) === -1) ajouter(p);
    }
    return liste;
  }

  /**
   * Change une option en passant par la case de l'interface d'origine, pour
   * que l'outil et la case restent d'accord.
   * @return {boolean} true si l'option existe pour cet outil
   */
  definir(indexOutil, cle, valeur) {
    var widget = (this._parOutil[indexOutil] || {})['_' + cle];
    if (!widget) return false;
    widget.setValue(valeur === true);
    return true;
  }

  /** @return {boolean|null} null si l'option n'existe pas pour cet outil */
  lire(indexOutil, cle, tool) {
    var propriete = '_' + cle;
    if (!(this._parOutil[indexOutil] || {})[propriete]) return null;
    return tool[propriete] === true;
  }
}

export default OptionsOutils;
