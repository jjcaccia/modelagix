/**
 * MODELAGIX — correctifs appliqués à yagui au démarrage
 *
 * yagui est la bibliothèque d'interface de SculptGL. Son dépôt est archivé :
 * aucun correctif n'viendra d'amont. Plutôt que de modifier ses fichiers — ce
 * qui se perdrait à la première réinstallation des dépendances — on corrige
 * son comportement à l'exécution, ici, en un seul endroit repérable.
 */

/**
 * ── Le curseur qui paralysait tous les autres ─────────────────────────────
 *
 * Chaque curseur yagui installe un écouteur `mousemove` sur la FENÊTRE
 * entière, et son gestionnaire commence par :
 *
 *     _onMouseMove(ev) {
 *       ev.preventDefault();     // ← inconditionnel
 *       if (!this.isDown) return;
 *
 * `preventDefault` est appelé AVANT de vérifier si ce curseur-là est
 * réellement manipulé. Comme l'interface d'origine compte une quinzaine de
 * curseurs, chaque mouvement de souris de la page était annulé quinze fois.
 *
 * Conséquence : le glissement natif de nos propres curseurs (`input[type=range]`)
 * ne fonctionnait pas — on pouvait cliquer sur la barre, jamais tirer la
 * poignée. Le symptôme n'avait aucun rapport visible avec sa cause, et rien
 * dans notre code ne pouvait le trahir.
 *
 * Le correctif déplace simplement `preventDefault` APRÈS le test.
 *
 * ⚠️ PORTÉE LIMITÉE, mesurée : yagui lie ses écouteurs à la construction
 * (`this._onMouseMove.bind(this)`). Les curseurs déjà créés — c'est-à-dire
 * tous ceux de l'interface d'origine — gardent donc l'ancienne fonction, et ce
 * correctif ne les atteint pas. Il ne protège que ceux construits ensuite, par
 * exemple lors d'un changement de langue qui reconstruit l'interface.
 *
 * C'est pourquoi la barre de paramètres de MODELAGIX ne se repose PAS sur le
 * glissement natif : elle calcule elle-même la valeur depuis la position de la
 * souris. Voir `BarreParametres._creerReglage`.
 *
 * @param {Object} exemplaire  n'importe quel curseur yagui, pour atteindre son prototype
 */
var reparerCurseurs = function (exemplaire) {
  if (!exemplaire) return false;
  var proto = Object.getPrototypeOf(exemplaire);
  if (!proto || typeof proto._onMouseMove !== 'function' || proto._modelagixCorrige) return false;

  var original = proto._onMouseMove;
  proto._onMouseMove = function (ev) {
    // Ce curseur n'est pas en cours de manipulation : on ne touche à rien,
    // et surtout on n'annule pas l'événement pour tout le monde.
    if (!this.isDown) return;
    return original.call(this, ev);
  };
  proto._modelagixCorrige = true;
  return true;
};

/**
 * Applique tous les correctifs connus.
 * @param {Object} gui  l'instance Gui de SculptGL
 */
var appliquer = function (gui) {
  var resultats = {};

  // On atteint le prototype par un curseur existant : yagui n'exporte pas ses
  // classes internes.
  var curseur = null;
  try {
    curseur = gui._ctrlTopology && gui._ctrlTopology._ctrlResolution;
  } catch (e) { /* on essaiera ailleurs */ }

  resultats.curseurs = reparerCurseurs(curseur);
  return resultats;
};

export default { appliquer: appliquer };
