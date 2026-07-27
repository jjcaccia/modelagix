/**
 * MODELAGIX — le tiroir des fonctions avancées
 *
 * L'interface d'origine (yagui) n'est pas supprimée : elle est rangée hors du
 * champ et rappelée à la demande par une languette au bord droit, ou par la
 * touche Tab. Les fonctions avancées — topologie, caméra, fond, options
 * d'export — restent donc toutes disponibles sans encombrer l'écran.
 *
 * Pourquoi passer par le `setVisibility` de yagui plutôt que par du CSS :
 * yagui recalcule lui-même la zone de dessin quand une barre disparaît, et
 * prévient le moteur. Escamoter les barres à la main laisserait un vide à
 * droite, la zone de dessin gardant sa largeur réduite.
 *
 * Pourquoi une languette visible plutôt qu'un survol du bord : on sculpte en
 * glissant la souris, et un trait tiré jusqu'au bord ferait surgir le panneau
 * en plein geste. Une languette se voit, ce qui compte pour un élève qui
 * découvre l'outil, et ne se déclenche jamais par accident.
 */

var ID_STYLE = 'modelagix-style-tiroir';

// 24 px de large sur 120 de haut. La première version faisait 16 px : trop
// étroit, je l'ai ratée moi-même à la souris pendant les essais. Un élève au
// stylet la raterait aussi. La hauteur compense la finesse de la cible.
var LARGEUR_LANGUETTE = 24;

var CSS = [
  '.modelagix-languette {',
  '  position: fixed;',
  '  top: 50%;',
  '  transform: translateY(-50%);',
  '  width: ' + LARGEUR_LANGUETTE + 'px;',
  '  height: 120px;',
  '  z-index: 10;',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  padding: 0;',
  '  border: none;',
  '  border-radius: 6px 0 0 6px;',
  '  background: rgba(30, 34, 40, 0.85);',
  '  color: rgba(255, 255, 255, 0.75);',
  '  font-size: 16px;',
  '  line-height: 1;',
  '  cursor: pointer;',
  '  transition: background 120ms ease, color 120ms ease;',
  '  -webkit-user-select: none;',
  '  user-select: none;',
  '}',
  '.modelagix-languette:hover {',
  '  background: rgba(52, 58, 68, 0.95);',
  '  color: #fff;',
  '}',
  '.modelagix-languette:focus-visible {',
  '  outline: 2px solid #6ea8fe;',
  '  outline-offset: 2px;',
  '}'
].join('\n');

class Tiroir {

  /**
   * @param {Object} gui   l'instance Gui de SculptGL (celle qui détient yagui)
   * @param {Object} main  l'application (Scene)
   */
  constructor(gui, main) {
    this._gui = gui;
    this._main = main;
    this._ouvert = true; // yagui est visible au démarrage

    this._injecterStyle();
    this._creerLanguette();
    this._brancherClavier();

    // La largeur de la barre latérale est ajustable à la souris : on repositionne
    // la languette après chaque relâchement, et à chaque redimensionnement.
    this._cbPositionner = this._positionner.bind(this);
    window.addEventListener('resize', this._cbPositionner, false);
    window.addEventListener('mouseup', this._cbPositionner, false);

    this._rafraichir();
  }

  _injecterStyle() {
    if (document.getElementById(ID_STYLE)) return;
    var style = document.createElement('style');
    style.id = ID_STYLE;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _creerLanguette() {
    var bouton = document.createElement('button');
    bouton.className = 'modelagix-languette';
    bouton.type = 'button';
    bouton.addEventListener('click', this.basculer.bind(this), false);
    document.body.appendChild(bouton);
    this._languette = bouton;
  }

  _brancherClavier() {
    this._cbClavier = function (event) {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
      // Capture avant SculptGL, et on empêche le navigateur de déplacer le focus.
      event.preventDefault();
      event.stopPropagation();
      this.basculer();
    }.bind(this);
    // capture = true : on passe avant les gestionnaires de SculptGL.
    window.addEventListener('keydown', this._cbClavier, true);
  }

  /** Place la languette contre la barre latérale, ou contre le bord si fermée. */
  _positionner() {
    var barre = this._gui._sidebar && this._gui._sidebar.domSidebar;
    var decalage = (this._ouvert && barre && !barre.hidden) ? barre.offsetWidth : 0;
    this._languette.style.right = decalage + 'px';
  }

  _rafraichir() {
    this._positionner();
    var etiquette = this._ouvert
      ? 'Masquer les réglages avancés (Tab)'
      : 'Afficher les réglages avancés (Tab)';
    this._languette.textContent = this._ouvert ? '›' : '‹';
    this._languette.title = etiquette;
    this._languette.setAttribute('aria-label', etiquette);
    this._languette.setAttribute('aria-expanded', this._ouvert ? 'true' : 'false');
  }

  estOuvert() {
    return this._ouvert;
  }

  ouvrir() {
    if (this._ouvert) return;
    this._definirVisibilite(true);
  }

  fermer() {
    if (!this._ouvert) return;
    this._definirVisibilite(false);
  }

  basculer() {
    this._definirVisibilite(!this._ouvert);
  }

  _definirVisibilite(visible) {
    this._ouvert = visible;

    // setVisibility de yagui cache la barre ET recalcule la zone de dessin,
    // puis prévient le moteur via son callback de redimensionnement.
    if (this._gui._topbar) this._gui._topbar.setVisibility(visible);
    if (this._gui._sidebar) this._gui._sidebar.setVisibility(visible);

    this._rafraichir();
    this._main.render();
  }

  /** Retire tout ce que le tiroir a ajouté à la page. */
  detruire() {
    window.removeEventListener('resize', this._cbPositionner, false);
    window.removeEventListener('mouseup', this._cbPositionner, false);
    window.removeEventListener('keydown', this._cbClavier, true);
    if (this._languette && this._languette.parentNode)
      this._languette.parentNode.removeChild(this._languette);
  }
}

export default Tiroir;
