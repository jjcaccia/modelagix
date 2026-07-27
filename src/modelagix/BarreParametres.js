/**
 * MODELAGIX — barre de paramètres, en haut
 *
 * Les deux réglages permanents de la sculpture — Taille et Force — puis les
 * interrupteurs de l'outil courant, sous forme de pastilles.
 *
 * Ces interrupteurs changent d'un outil à l'autre : Argile n'existe que pour
 * Dessiner, Tangentiel que pour Lisser. La barre se reconstruit donc à chaque
 * changement d'outil, plutôt que d'afficher des réglages sans effet.
 *
 * Comme la barre de gauche, elle ne parle QU'À LA FAÇADE.
 */

var ID_STYLE = 'modelagix-style-parametres';

var CSS = [
  '.modelagix-parametres {',
  '  position: fixed;',
  '  left: 50%;',
  '  transform: translateX(-50%);',
  '  z-index: 10;',
  '  display: flex;',
  '  align-items: center;',
  '  flex-wrap: wrap;',
  '  justify-content: center;',
  '  gap: 14px;',
  '  max-width: calc(100vw - 160px);',
  '  padding: 8px 16px;',
  '  border-radius: 10px;',
  '  background: rgba(30, 34, 40, 0.82);',
  '  color: rgba(255, 255, 255, 0.85);',
  '  font: 12px/1.2 system-ui, -apple-system, sans-serif;',
  '  -webkit-user-select: none;',
  '  user-select: none;',
  '}',
  '.modelagix-reglage {',
  '  display: flex;',
  '  align-items: center;',
  '  gap: 8px;',
  '}',
  '.modelagix-reglage > span:first-child {',
  '  min-width: 42px;',
  '  color: rgba(255, 255, 255, 0.65);',
  '}',
  '.modelagix-reglage input[type=range] {',
  '  width: 128px;',
  '  accent-color: #6ea8fe;',
  '  cursor: pointer;',
  '}',
  '.modelagix-valeur {',
  '  min-width: 30px;',
  '  text-align: right;',
  '  font-variant-numeric: tabular-nums;',
  '}',
  '.modelagix-pastilles {',
  '  display: flex;',
  '  gap: 6px;',
  '}',
  '.modelagix-pastille {',
  '  padding: 5px 12px;',
  '  border: 1px solid rgba(255, 255, 255, 0.18);',
  '  border-radius: 999px;',
  '  background: transparent;',
  '  color: rgba(255, 255, 255, 0.7);',
  '  font: inherit;',
  '  cursor: pointer;',
  '  transition: background 110ms ease, color 110ms ease, border-color 110ms ease;',
  '}',
  '.modelagix-pastille:hover {',
  '  background: rgba(255, 255, 255, 0.1);',
  '  color: #fff;',
  '}',
  '.modelagix-pastille.actif {',
  '  background: rgba(110, 168, 254, 0.22);',
  '  border-color: rgba(110, 168, 254, 0.55);',
  '  color: #8ec1ff;',
  '}',
  '.modelagix-pastille:focus-visible {',
  '  outline: 2px solid #6ea8fe;',
  '  outline-offset: 2px;',
  '}'
].join('\n');

class BarreParametres {

  /**
   * @param {Object} facade  seul interlocuteur de cette barre
   * @param {Object} gui     l'interface d'origine, pour se placer sous sa barre du haut
   */
  constructor(facade, gui) {
    this._facade = facade;
    this._gui = gui;
    this._dernierOutil = null;

    this._injecterStyle();
    this._construire();

    // Taille, force et options peuvent changer sans passer par ici : raccourcis
    // X et C, maintien de Maj, ou réglages du tiroir. On se resynchronise après
    // chaque interaction plutôt que de se croire seul maître à bord.
    this._cbSync = this._synchroniser.bind(this);
    window.addEventListener('keyup', this._cbSync, false);
    window.addEventListener('mouseup', this._cbSync, false);
    window.addEventListener('resize', this._cbSync, false);

    this._synchroniser();
  }

  _injecterStyle() {
    if (document.getElementById(ID_STYLE)) return;
    var style = document.createElement('style');
    style.id = ID_STYLE;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _construire() {
    var barre = document.createElement('div');
    barre.className = 'modelagix-parametres';
    barre.setAttribute('role', 'group');
    barre.setAttribute('aria-label', 'Réglages de l\'outil');

    this._curseurTaille = this._creerReglage(barre, 'Taille', 5, 500, 1,
      function (v) { this._facade.setRadius(v); }.bind(this));

    this._curseurForce = this._creerReglage(barre, 'Force', 0, 100, 1,
      function (v) { this._facade.setIntensity(v); }.bind(this));

    this._pastilles = document.createElement('div');
    this._pastilles.className = 'modelagix-pastilles';
    barre.appendChild(this._pastilles);

    document.body.appendChild(barre);
    this._barre = barre;
  }

  _creerReglage(parent, libelle, min, max, pas, onChange) {
    var bloc = document.createElement('div');
    bloc.className = 'modelagix-reglage';

    var titre = document.createElement('span');
    titre.textContent = libelle;

    var curseur = document.createElement('input');
    curseur.type = 'range';
    curseur.min = min;
    curseur.max = max;
    curseur.step = pas;
    curseur.setAttribute('aria-label', libelle);

    var valeur = document.createElement('span');
    valeur.className = 'modelagix-valeur';

    curseur.addEventListener('input', function () {
      var v = parseFloat(curseur.value);
      valeur.textContent = Math.round(v);
      onChange(v);
    }, false);

    bloc.appendChild(titre);
    bloc.appendChild(curseur);
    bloc.appendChild(valeur);
    parent.appendChild(bloc);

    return { curseur: curseur, valeur: valeur };
  }

  /** Reconstruit les pastilles pour l'outil courant. */
  _reconstruirePastilles() {
    var options = this._facade.listOptions();
    this._pastilles.innerHTML = '';

    for (var i = 0; i < options.length; ++i) {
      var opt = options[i];
      var bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'modelagix-pastille';
      bouton.textContent = opt.libelle;
      bouton.dataset.cle = opt.cle;
      bouton.addEventListener('click', this._basculerOption.bind(this, opt.cle), false);
      this._pastilles.appendChild(bouton);
    }
  }

  _basculerOption(cle) {
    this._facade.setOption(cle, !this._facade.getOption(cle));
    this._synchroniser();
  }

  /** Place la barre sous celle de l'interface d'origine quand elle est visible. */
  _positionner() {
    var haut = this._gui._topbar && this._gui._topbar.domTopbar;
    var decalage = (haut && !haut.hidden) ? haut.offsetHeight : 0;
    this._barre.style.top = (decalage + 10) + 'px';
  }

  /** Aligne l'affichage sur l'état réel du moteur. */
  _synchroniser() {
    this._positionner();

    var outil = this._facade.getTool();
    if (outil !== this._dernierOutil) {
      this._dernierOutil = outil;
      this._reconstruirePastilles();
    }

    var taille = this._facade.getRadius();
    if (taille !== null && document.activeElement !== this._curseurTaille.curseur) {
      this._curseurTaille.curseur.value = taille;
    }
    this._curseurTaille.valeur.textContent = taille === null ? '—' : Math.round(taille);
    this._curseurTaille.curseur.disabled = taille === null;

    var force = this._facade.getIntensity();
    if (force !== null && document.activeElement !== this._curseurForce.curseur) {
      this._curseurForce.curseur.value = force;
    }
    this._curseurForce.valeur.textContent = force === null ? '—' : Math.round(force);
    this._curseurForce.curseur.disabled = force === null;

    var pastilles = this._pastilles.children;
    for (var i = 0; i < pastilles.length; ++i) {
      var p = pastilles[i];
      var actif = this._facade.getOption(p.dataset.cle) === true;
      p.classList.toggle('actif', actif);
      p.setAttribute('aria-pressed', actif ? 'true' : 'false');
    }
  }

  detruire() {
    window.removeEventListener('keyup', this._cbSync, false);
    window.removeEventListener('mouseup', this._cbSync, false);
    window.removeEventListener('resize', this._cbSync, false);
    if (this._barre && this._barre.parentNode)
      this._barre.parentNode.removeChild(this._barre);
  }
}

export default BarreParametres;
