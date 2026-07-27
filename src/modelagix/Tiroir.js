/**
 * MODELAGIX — les tiroirs des fonctions avancées
 *
 * L'interface d'origine (yagui) n'est pas supprimée : elle est rangée hors du
 * champ et rappelée à la demande. Ses deux barres — celle du haut et celle de
 * droite — sont **indépendantes** : chacune a sa languette. Elles ne portent
 * pas les mêmes fonctions, il n'y a aucune raison de les lier.
 *
 * Pourquoi passer par le `setVisibility` de yagui plutôt que par du CSS :
 * yagui recalcule lui-même la zone de dessin quand une barre disparaît, et
 * prévient le moteur. Escamoter les barres à la main laisserait un vide.
 *
 * Pourquoi des languettes visibles plutôt qu'un survol du bord : on sculpte en
 * glissant la souris, et un trait tiré jusqu'au bord ferait surgir le panneau
 * en plein geste. Une languette se voit, ce qui compte pour un élève qui
 * découvre l'outil, et ne se déclenche jamais par accident.
 *
 * ── Notification ──────────────────────────────────────────────────────────
 * Les autres éléments de l'interface doivent se replacer quand une barre
 * apparaît. S'appuyer sur `mouseup` ne marche pas : `mouseup` précède `click`,
 * donc ils se replaçaient AVANT que le tiroir ait bougé, avec l'ancienne
 * mesure. D'où `surChangement()` : on prévient explicitement, après coup.
 */

var ID_STYLE = 'modelagix-style-tiroir';

// 24 px d'épaisseur. Une première version en faisait 16 : trop étroit, je l'ai
// ratée moi-même à la souris pendant les essais. La longueur compense la
// finesse de la cible.
var EPAISSEUR = 24;

var CSS = [
  '.modelagix-languette {',
  '  position: fixed;',
  '  z-index: 10;',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  padding: 0;',
  '  border: none;',
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
  '}',
  '.modelagix-languette-droite {',
  '  top: 50%;',
  '  transform: translateY(-50%);',
  '  width: ' + EPAISSEUR + 'px;',
  '  height: 120px;',
  '  border-radius: 6px 0 0 6px;',
  '}',
  '.modelagix-languette-haut {',
  '  left: 10px;',
  '  width: 120px;',
  '  height: ' + EPAISSEUR + 'px;',
  '  border-radius: 0 0 6px 6px;',
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
    this._ecouteurs = [];

    // yagui est visible au démarrage : tant que la barre de gauche ne couvre
    // pas tout, tout masquer laisserait l'application sans commandes.
    this._etat = { haut: true, droite: true };

    this._injecterStyle();
    this._languettes = {
      droite: this._creerLanguette('droite', 'modelagix-languette-droite'),
      haut: this._creerLanguette('haut', 'modelagix-languette-haut')
    };
    this._brancherClavier();

    // La largeur de la barre latérale est ajustable à la souris : on repositionne
    // les languettes après chaque relâchement, et à chaque redimensionnement.
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

  _creerLanguette(partie, classe) {
    var bouton = document.createElement('button');
    bouton.className = 'modelagix-languette ' + classe;
    bouton.type = 'button';
    bouton.addEventListener('click', this.basculer.bind(this, partie), false);
    document.body.appendChild(bouton);
    return bouton;
  }

  _brancherClavier() {
    this._cbClavier = function (event) {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
      // Capture avant SculptGL, et on empêche le navigateur de déplacer le focus.
      event.preventDefault();
      event.stopPropagation();
      // Tab agit sur les deux d'un coup : c'est le geste « libérer l'écran ».
      // Les languettes servent au réglage fin, partie par partie.
      var tout = this.estOuvert('haut') || this.estOuvert('droite');
      this.definir('haut', !tout);
      this.definir('droite', !tout);
    }.bind(this);
    window.addEventListener('keydown', this._cbClavier, true);
  }

  // -----------------------------------------------------------------
  //  Notification
  // -----------------------------------------------------------------

  /** Prévient à chaque changement d'état. Reçoit {haut, droite}. */
  surChangement(callback) {
    this._ecouteurs.push(callback);
  }

  _prevenir() {
    for (var i = 0; i < this._ecouteurs.length; ++i) {
      this._ecouteurs[i]({ haut: this._etat.haut, droite: this._etat.droite });
    }
  }

  // -----------------------------------------------------------------
  //  Placement
  // -----------------------------------------------------------------

  /** Hauteur occupée par la barre du haut, 0 si elle est rangée. */
  hauteurBarreHaut() {
    var haut = this._gui._topbar && this._gui._topbar.domTopbar;
    return (haut && !haut.hidden) ? haut.offsetHeight : 0;
  }

  /** Largeur occupée par la barre de droite, 0 si elle est rangée. */
  largeurBarreDroite() {
    var barre = this._gui._sidebar && this._gui._sidebar.domSidebar;
    return (barre && !barre.hidden) ? barre.offsetWidth : 0;
  }

  _positionner() {
    // Chaque languette se colle contre sa barre, ou contre le bord si rangée.
    this._languettes.droite.style.right = this.largeurBarreDroite() + 'px';
    this._languettes.haut.style.top = this.hauteurBarreHaut() + 'px';
  }

  _rafraichir() {
    this._positionner();

    var decrire = function (bouton, ouvert, ferme, chevron) {
      var etiquette = ouvert ? ferme : chevron;
      bouton.title = etiquette;
      bouton.setAttribute('aria-label', etiquette);
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    };

    this._languettes.droite.textContent = this._etat.droite ? '›' : '‹';
    decrire(this._languettes.droite, this._etat.droite,
      'Masquer les réglages de droite', 'Afficher les réglages de droite');

    this._languettes.haut.textContent = this._etat.haut ? '⌃' : '⌄';
    decrire(this._languettes.haut, this._etat.haut,
      'Masquer les menus du haut', 'Afficher les menus du haut');
  }

  // -----------------------------------------------------------------
  //  État
  // -----------------------------------------------------------------

  /** @param {string} [partie] 'haut' ou 'droite' ; sans argument, l'un ou l'autre */
  estOuvert(partie) {
    if (!partie) return this._etat.haut || this._etat.droite;
    return this._etat[partie] === true;
  }

  definir(partie, visible) {
    if (this._etat[partie] === visible) return;
    this._etat[partie] = visible;

    // setVisibility de yagui cache la barre ET recalcule la zone de dessin,
    // puis prévient le moteur via son callback de redimensionnement.
    if (partie === 'haut' && this._gui._topbar) this._gui._topbar.setVisibility(visible);
    if (partie === 'droite' && this._gui._sidebar) this._gui._sidebar.setVisibility(visible);

    this._rafraichir();
    this._main.render();
    this._prevenir();
  }

  basculer(partie) {
    this.definir(partie, !this._etat[partie]);
  }

  ouvrirTout() {
    this.definir('haut', true);
    this.definir('droite', true);
  }

  fermerTout() {
    this.definir('haut', false);
    this.definir('droite', false);
  }

  /** Retire tout ce que les tiroirs ont ajouté à la page. */
  detruire() {
    window.removeEventListener('resize', this._cbPositionner, false);
    window.removeEventListener('mouseup', this._cbPositionner, false);
    window.removeEventListener('keydown', this._cbClavier, true);
    for (var partie in this._languettes) {
      var l = this._languettes[partie];
      if (l && l.parentNode) l.parentNode.removeChild(l);
    }
  }
}

export default Tiroir;
