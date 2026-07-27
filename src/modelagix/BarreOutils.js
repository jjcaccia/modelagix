/**
 * MODELAGIX — barre d'outils de gauche
 *
 * L'accès direct et permanent aux outils de sculpture, à la manière de
 * l'ergonomie visée (cahier des charges, section 6). Les réglages avancés
 * restent dans le tiroir, à droite.
 *
 * Cette barre ne parle QU'À LA FAÇADE. Elle ignore tout du moteur : c'est ce
 * qui permettra d'en changer l'apparence, ou de la remplacer, sans rien casser.
 *
 * Les icônes viennent d'Icones.js et sont provisoires. Les remplacer ne
 * demandera aucune modification ici.
 */

import Icones from 'modelagix/Icones';

var ID_STYLE = 'modelagix-style-barre';

/**
 * Ordre de la palette, vocabulaire de la section 8 traduit pour l'affichage.
 * `touche` reprend les raccourcis déjà présents dans le moteur : on les expose
 * plutôt que d'en inventer, pour ne pas créer une seconde convention.
 */
var OUTILS = [
  { nom: 'draw', libelle: 'Dessiner', touche: '1' },
  { nom: 'inflate', libelle: 'Gonfler', touche: '2' },
  { nom: 'crease', libelle: 'Creuser', touche: '7' },
  { nom: 'flatten', libelle: 'Aplatir', touche: '5' },
  { nom: 'pinch', libelle: 'Pincer', touche: '6' },
  { nom: 'smooth', libelle: 'Lisser', touche: '4' },
  { nom: 'grab', libelle: 'Saisir', touche: '0' },
  { nom: 'drag', libelle: 'Tirer', touche: '8' },
  { nom: 'rotate', libelle: 'Tourner', touche: '3' },
  { nom: 'scale', libelle: 'Redimensionner', touche: null },
  { nom: 'mask', libelle: 'Masquer', touche: null }
];

var CSS = [
  '.modelagix-barre {',
  '  position: fixed;',
  '  left: 10px;',
  '  top: 50%;',
  '  transform: translateY(-50%);',
  '  z-index: 10;',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 3px;',
  '  padding: 5px;',
  '  border-radius: 10px;',
  '  background: rgba(30, 34, 40, 0.82);',
  '  -webkit-user-select: none;',
  '  user-select: none;',
  '}',
  '.modelagix-outil {',
  '  width: 42px;',
  '  height: 42px;',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  padding: 0;',
  '  border: none;',
  '  border-radius: 7px;',
  '  background: transparent;',
  '  color: rgba(255, 255, 255, 0.7);',
  '  cursor: pointer;',
  '  transition: background 110ms ease, color 110ms ease;',
  '}',
  '.modelagix-outil:hover {',
  '  background: rgba(255, 255, 255, 0.1);',
  '  color: #fff;',
  '}',
  '.modelagix-outil.actif {',
  '  background: rgba(110, 168, 254, 0.22);',
  '  color: #8ec1ff;',
  '}',
  '.modelagix-outil:focus-visible {',
  '  outline: 2px solid #6ea8fe;',
  '  outline-offset: -2px;',
  '}',
  // La couleur est portée par le trait : ces pictogrammes sont dessinés au
  // trait, pas remplis. currentColor la fait hériter du bouton, donc survol,
  // état actif et désactivé se règlent entièrement en CSS.
  '.modelagix-icone {',
  '  fill: none;',
  '  stroke: currentColor;',
  '  stroke-width: 2;',
  '  stroke-linecap: round;',
  '  stroke-linejoin: round;',
  '  pointer-events: none;',
  '}'
].join('\n');

class BarreOutils {

  /** @param {Object} facade  la façade — seul interlocuteur de cette barre */
  constructor(facade) {
    this._facade = facade;
    this._boutons = {};

    Icones.injecter();
    this._injecterStyle();
    this._construire();

    // L'outil courant peut changer sans passer par cette barre : raccourcis
    // clavier, maintien de Maj qui bascule sur Lissage, ou menu du tiroir.
    // On se resynchronise après chaque interaction plutôt que de supposer
    // qu'on est la seule source de vérité.
    this._cbSync = this._synchroniser.bind(this);
    window.addEventListener('keydown', this._cbSync, false);
    window.addEventListener('keyup', this._cbSync, false);
    window.addEventListener('mouseup', this._cbSync, false);

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
    barre.className = 'modelagix-barre';
    barre.setAttribute('role', 'toolbar');
    barre.setAttribute('aria-label', 'Outils de sculpture');

    for (var i = 0; i < OUTILS.length; ++i) {
      var def = OUTILS[i];
      var bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'modelagix-outil';
      bouton.innerHTML = Icones.baliser(def.nom);

      var etiquette = def.libelle + (def.touche ? ' (' + def.touche + ')' : '');
      bouton.title = etiquette;
      bouton.setAttribute('aria-label', etiquette);
      bouton.addEventListener('click', this._choisir.bind(this, def.nom), false);

      barre.appendChild(bouton);
      this._boutons[def.nom] = bouton;
    }

    document.body.appendChild(barre);
    this._barre = barre;
  }

  _choisir(nom) {
    this._facade.setTool(nom);
    this._synchroniser();
  }

  /** Aligne l'état affiché sur l'outil réellement actif dans le moteur. */
  _synchroniser() {
    var courant = this._facade.getTool();
    for (var nom in this._boutons) {
      var bouton = this._boutons[nom];
      var actif = nom === courant;
      bouton.classList.toggle('actif', actif);
      bouton.setAttribute('aria-pressed', actif ? 'true' : 'false');
    }
  }

  /** Retire la barre de la page. */
  detruire() {
    window.removeEventListener('keydown', this._cbSync, false);
    window.removeEventListener('keyup', this._cbSync, false);
    window.removeEventListener('mouseup', this._cbSync, false);
    if (this._barre && this._barre.parentNode)
      this._barre.parentNode.removeChild(this._barre);
  }
}

export default BarreOutils;
