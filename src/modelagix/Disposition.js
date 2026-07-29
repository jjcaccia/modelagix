/**
 * MODELAGIX — la disposition des panneaux
 *
 * Un seul endroit décide OÙ va chaque panneau. Avant, chacun se plaçait
 * lui-même : la colonne d'outils se réglait sur le cube, le cube sur la barre
 * du haut, le nom sur rien du tout. Trois calculs qui se couraient après, et
 * qui se contredisaient dès qu'on déplaçait l'un d'eux.
 *
 * ── Ce que le fichier organise ────────────────────────────────────────────
 *
 * La rangée du haut tient deux PILES :
 *   - la pile des réglages  : taille et force, puis matières et tampons ;
 *   - la pile du point de vue : les vues et cadrages, puis le cube.
 * La seconde est plaquée contre le bord droit et suit le tiroir.
 *
 * ── Trois largeurs, trois dispositions ────────────────────────────────────
 *
 * LARGE  : tout sur une ligne. Réglages | matières …………… vues | cube
 * MOYEN  : les matières passent SOUS les réglages ; vues et cube restent en
 *          haut à droite.
 * ÉTROIT : la pile du point de vue descend tout entière dans la colonne de
 *          gauche, sous « Scène & fichiers », le cube sous les vues.
 *
 * Les seuils se comparent à la place RÉELLEMENT disponible — largeur de la
 * fenêtre moins la colonne de gauche, moins le tiroir de droite s'il est
 * ouvert. Ouvrir le tiroir sur un écran moyen change donc de disposition, ce
 * qui est le comportement voulu : la place a bel et bien disparu.
 *
 * Les seuils se calculent sur les largeurs MINIMALES, pas sur les largeurs
 * confortables : le panneau de réglages sait se resserrer, et tant qu'il le
 * peut, il n'y a aucune raison de tout réorganiser.
 *
 * ── L'enchaînement des trois placements ───────────────────────────────────
 *
 * Le nom est centré horizontalement sur la colonne d'outils et verticalement
 * sur le panneau de réglages. La colonne commence sous le nom. Chacun dépend
 * du précédent, d'où l'ordre imposé dans `ajuster()`.
 */

import NomApplication from 'modelagix/NomApplication';

var ID_STYLE = 'modelagix-style-disposition';

/** Air laissé entre la rangée et le bord droit de la fenêtre. */
var MARGE = 14;
/** Air entre le bas du nom et le haut de la colonne d'outils. */
var AIR_NOM = 8;

/**
 * Largeurs minimales, en pixels, relevées dans les feuilles de style des
 * panneaux. Si l'une d'elles change là-bas, la changer ici : le seuil ne se
 * mesure pas à chaud, sinon il dépendrait de la disposition en cours — celle
 * qu'on cherche justement à décider.
 */
var MIN_REGLAGES = 400;
var MIN_MATIERES = 214;
var MIN_VUES = 150;
var MIN_CUBE = 164;
var ECART = 10;

var SEUIL_LARGE = MIN_REGLAGES + MIN_MATIERES + MIN_VUES + MIN_CUBE + 3 * ECART;
var SEUIL_MOYEN = MIN_REGLAGES + MIN_VUES + MIN_CUBE + 2 * ECART;

var CSS = [
  // Une pile : des panneaux côte à côte, ou l'un sous l'autre quand la place
  // manque. Elle ne capte pas la souris ; ses enfants, si. Sans cela les
  // quelques pixels d'écart entre deux panneaux voleraient les clics destinés
  // à la vue 3D qui passe dessous.
  '.modelagix-pile {',
  '  display: flex;',
  '  align-items: flex-start;',
  '  gap: ' + ECART + 'px;',
  '  pointer-events: none;',
  '}',
  '.modelagix-pile > * {',
  '  pointer-events: auto;',
  '}',
  '.modelagix-pile.empilee {',
  '  flex-direction: column;',
  '}',
  // La pile des réglages est la seule que la rangée puisse resserrer : son
  // contenu, des curseurs, supporte de perdre quelques dizaines de pixels.
  '.modelagix-pile-reglages {',
  '  flex: 0 1 auto;',
  '  min-width: 0;',
  '}',
  // `margin-left: auto` mange tout l'espace libre : la pile du point de vue se
  // trouve donc plaquée contre le bord droit de la rangée, lequel recule quand
  // le tiroir s'ouvre. Vues et cube suivent le tiroir sans un seul calcul.
  '.modelagix-pile-vues {',
  '  margin-left: auto;',
  '}',
  // Dans la colonne de gauche, la même pile se met à la verticale.
  '.modelagix-pile-vues.en-colonne {',
  '  margin-left: 0;',
  '  flex-direction: column;',
  '  align-items: center;',
  '  gap: 2px;',
  '}',
  // Le cadre du cube porte quatorze pixels de marge intérieure, calculés pour
  // la rangée du haut. Dans la colonne, plus étroite, il déborderait.
  '.modelagix-pile-vues.en-colonne .modelagix-cube-cadre {',
  '  padding: 4px;',
  '}'
].join('\n');

class Disposition {

  /**
   * @param {Object} pieces  {rangee, reglages, matieres, vues, cube, colonne, tiroir}
   */
  constructor(pieces) {
    this._rangee = pieces.rangee;
    this._reglages = pieces.reglages;
    this._colonne = pieces.colonne;
    this._tiroir = pieces.tiroir;
    this._mode = null;

    this._injecterStyle();

    this._pileReglages = this._creerPile('modelagix-pile-reglages',
      [pieces.reglages, pieces.matieres]);
    this._pileVues = this._creerPile('modelagix-pile-vues',
      [pieces.vues, pieces.cube]);

    var ajuster = this.ajuster.bind(this);
    window.addEventListener('resize', ajuster, false);
    if (this._tiroir) this._tiroir.surChangement(ajuster);
    // Les polices d'un système peuvent arriver après le premier calcul, et le
    // nom change alors de largeur — donc de centre.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajuster);

    this.ajuster();
  }

  _injecterStyle() {
    if (document.getElementById(ID_STYLE)) return;
    var style = document.createElement('style');
    style.id = ID_STYLE;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _creerPile(classe, contenu) {
    var pile = document.createElement('div');
    pile.className = 'modelagix-pile ' + classe;
    this._rangee.appendChild(pile);
    for (var i = 0; i < contenu.length; ++i) {
      if (contenu[i]) pile.appendChild(contenu[i]);
    }
    return pile;
  }

  /** La place restant à la rangée, une fois le tiroir déduit. */
  _placeDisponible() {
    var gauche = parseFloat(window.getComputedStyle(this._rangee).left) || 0;
    var tiroir = this._tiroir ? this._tiroir.largeurDroiteVoulue() : 0;
    return window.innerWidth - gauche - MARGE - tiroir;
  }

  _modeVoulu() {
    var place = this._placeDisponible();
    if (place >= SEUIL_LARGE) return 'large';
    if (place >= SEUIL_MOYEN) return 'moyen';
    return 'etroit';
  }

  ajuster() {
    var mode = this._modeVoulu();

    if (mode !== this._mode) {
      this._mode = mode;
      // Les matières passent sous les réglages dès que la ligne ne les tient
      // plus toutes les deux.
      this._pileReglages.classList.toggle('empilee', mode !== 'large');
      // En étroit, la pile du point de vue descend ENTIÈRE dans la colonne :
      // déplacer la pile plutôt que ses deux panneaux garde leur ordre et leur
      // écart sans rien avoir à redire.
      var dansLaColonne = mode === 'etroit';
      this._pileVues.classList.toggle('en-colonne', dansLaColonne);
      var accueil = dansLaColonne ? this._colonne : this._rangee;
      if (this._pileVues.parentNode !== accueil) accueil.appendChild(this._pileVues);
    }

    this._placerLeNom();
  }

  /**
   * Le nom, puis la colonne qui commence dessous.
   *
   * Centré en abscisse sur la colonne d'outils, en ordonnée sur le panneau de
   * réglages. Sur le panneau, et non sur la rangée entière : la rangée grandit
   * quand les matières passent dessous, et le nom se mettrait alors à glisser
   * vers le bas à chaque changement de largeur de fenêtre. Le panneau de
   * réglages, lui, garde toujours la même hauteur — c'est la ligne d'yeux du
   * haut de l'écran.
   */
  _placerLeNom() {
    var nom = NomApplication.element();
    if (!nom) return;

    var colonne = this._colonne.getBoundingClientRect();
    var haut = parseFloat(window.getComputedStyle(this._rangee).top) || 0;
    var reglages = this._reglages.getBoundingClientRect();

    NomApplication.centrerSur(colonne.left + colonne.width / 2,
      haut + reglages.height / 2);

    var bas = nom.getBoundingClientRect().bottom;
    this._colonne.style.top = Math.round(bas + AIR_NOM) + 'px';
    // Ce qui dépasse défile : en étroit la colonne reçoit deux blocs de plus,
    // et une fenêtre basse ne les tient pas tous.
    this._colonne.style.maxHeight = 'calc(100vh - ' + Math.round(bas + AIR_NOM + 10) + 'px)';
  }
}

export default Disposition;
