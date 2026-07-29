/**
 * MODELAGIX — le nom de l'application, en haut à gauche
 *
 * Un simple bandeau de texte, posé une fois pour toutes dans l'angle supérieur
 * gauche. Il ne bouge jamais et passe PAR-DESSUS le tiroir du haut quand celui-ci
 * s'ouvre : c'est le seul repère qui reste constant quoi qu'on affiche.
 *
 * ── Pourquoi il décale la languette ───────────────────────────────────────
 * L'angle était déjà occupé par la languette du tiroir du haut. Plutôt que de
 * figer une largeur au jugé, on MESURE le nom une fois qu'il est dans la page :
 * la police dépend du système, et un nom plus long viendrait un jour buter
 * contre la languette.
 *
 * La mesure est publiée dans une variable CSS, `--modelagix-nom-reserve`, que
 * Tiroir.js lit pour poser sa languette et pour décaler les menus de
 * l'interface d'origine. Un seul chiffre, calculé à un seul endroit : impossible
 * que les deux se contredisent.
 *
 * ── Pourquoi il ne capte pas la souris ────────────────────────────────────
 * `pointer-events: none`. Le nom recouvre une bande où passent les menus du
 * tiroir ouvert ; sans cela, il les rendrait inertes sur toute sa surface.
 */

var ID = 'modelagix-nom';
var ID_STYLE = 'modelagix-style-nom';

/**
 * Le nom, en deux morceaux.
 *
 * Il s'écrit d'un seul tenant — `NOM` reste la chaîne entière, c'est elle que
 * lisent la fenêtre « À propos » et les lecteurs d'écran — mais il se DESSINE en
 * deux teintes : le début dans le blanc de l'interface, la fin dans le bleu qui
 * marque déjà partout ce qui est actif. La coupure tombe sur la charnière du
 * mot, là où l'œil la sent sans qu'on la lui explique.
 *
 * Un seul endroit à changer si le nom évolue.
 */
var NOM_DEBUT = 'Sculpt';
var NOM_FIN = 'IX';
var NOM = NOM_DEBUT + NOM_FIN;

/**
 * Le bleu est celui de l'application, pas une teinte inventée pour l'occasion :
 * c'est déjà celui des outils sélectionnés et des contours de focus. Une marque
 * qui reprend la couleur d'accent du produit se lit comme en faisant partie.
 */
var BLEU = '#6ea8fe';

/** Distance au bord gauche, et écart laissé entre le nom et la languette. */
var BORD = 22;
var ECART = 16;

/**
 * Hauteur d'une rangée de menus du tiroir du haut. Mesurée au démarrage ; cette
 * valeur ne sert que si la mesure échoue. Le nom prend exactement cette hauteur
 * et y centre son texte : il se retrouve donc sur la même ligne d'yeux que les
 * menus quand le tiroir est ouvert.
 */
var RANGEE = 40;

var CSS = [
  '#' + ID + ' {',
  '  position: fixed;',
  '  left: ' + BORD + 'px;',
  '  top: 0;',
  '  height: ' + RANGEE + 'px;',
  '  line-height: ' + RANGEE + 'px;',
  // Au-dessus de tout : nos éléments sont en 10, les menus du tiroir en 20.
  '  z-index: 30;',
  '  font: 700 19px system-ui, -apple-system, sans-serif;',
  '  letter-spacing: 0.4px;',
  '  color: rgba(255, 255, 255, 0.92);',
  // La vue 3D peut être claire à cet endroit ; une ombre courte garde le nom
  // lisible sans l'entourer d'un cadre.
  '  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);',
  '  -webkit-user-select: none;',
  '  user-select: none;',
  // C'est un vrai <button> : il ouvre la fenêtre « À propos & aide », seule
  // porte d'entrée quand le tiroir du haut est fermé — c'est-à-dire presque
  // toujours. On efface donc l'apparence de bouton, mais on garde le clavier,
  // le focus et l'annonce aux lecteurs d'écran, que reproduire à la main sur un
  // <div> coûterait plus cher qu'un `padding: 0`.
  '  margin: 0;',
  '  padding: 0;',
  '  border: none;',
  '  background: transparent;',
  '  cursor: pointer;',
  '  transition: color 120ms ease;',
  '}',
  '#' + ID + ':hover {',
  '  color: #fff;',
  '}',
  '#' + ID + ':focus-visible {',
  '  outline: 2px solid ' + BLEU + ';',
  '  outline-offset: 2px;',
  '}',
  // La seconde moitié du nom porte sa propre couleur : elle échappe donc au
  // survol, qui n'éclaircit que ce qui hérite. C'est voulu — le bleu est la
  // marque, il ne doit pas changer avec l'humeur de la souris.
  //
  // `font: inherit` n'est PAS une précaution de confort : sans lui, la feuille
  // de style du moteur s'applique à ce <span> et lui impose Open Sans 400 en
  // 13 px, au lieu du system-ui 700 en 19 px du bouton. Un style hérité perd
  // toujours contre une règle qui vise l'élément, si générale soit-elle. « IX »
  // apparaissait donc plus petit et plus maigre que « Sculpt ».
  '.modelagix-nom-fin {',
  '  font: inherit;',
  '  letter-spacing: inherit;',
  '  color: ' + BLEU + ';',
  '}'
].join('\n');

/**
 * Le nom en deux teintes, prêt à insérer.
 * Utilisé ici et dans la fenêtre « À propos » : une marque qui s'écrirait de
 * deux façons selon l'endroit passerait pour un oubli.
 */
var baliser = function () {
  return NOM_DEBUT + '<span class="modelagix-nom-fin">' + NOM_FIN + '</span>';
};

var _element = null;

var injecterStyle = function () {
  if (document.getElementById(ID_STYLE)) return;
  var style = document.createElement('style');
  style.id = ID_STYLE;
  style.textContent = CSS;
  document.head.appendChild(style);
};

/**
 * Pose le nom et publie la place qu'il prend.
 * À appeler AVANT de construire les tiroirs, qui lisent cette place.
 * @return {HTMLElement}
 */
var poser = function () {
  if (_element) return _element;

  injecterStyle();

  _element = document.createElement('button');
  _element.id = ID;
  _element.type = 'button';
  _element.innerHTML = baliser();
  _element.title = 'À propos et aide';
  // Le <span> découpe le mot pour l'œil, pas pour l'oreille : sans cela, une
  // synthèse vocale pourrait annoncer deux fragments au lieu du nom.
  _element.setAttribute('aria-label', NOM);
  document.body.appendChild(_element);

  // Le nom prenait la hauteur d'une rangée de menus du tiroir du haut, pour
  // s'aligner sur elle. Ce tiroir est depuis fondu dans celui de droite : il
  // n'y a plus de rangée à laquelle s'aligner, et cette hauteur empruntée —
  // quatre-vingts pixels pour un texte de dix-neuf — faussait le centrage
  // demandé. Le nom garde donc sa hauteur naturelle, et c'est Disposition.js
  // qui le centre sur la colonne d'outils et sur la rangée du haut.

  // Mesure après insertion : c'est le seul moment où la largeur réelle existe.
  var largeur = Math.ceil(_element.getBoundingClientRect().width);
  document.documentElement.style.setProperty(
    '--modelagix-nom-reserve', (BORD + largeur + ECART) + 'px');

  return _element;
};

/**
 * Ce que fait un clic sur le nom.
 * Branché depuis la façade, et non ici : ce fichier ne connaît pas la fenêtre
 * qu'il ouvre, sinon les deux s'importeraient l'un l'autre.
 */
var auClic = function (callback) {
  if (!_element) return;
  _element.addEventListener('click', callback, false);
};

/**
 * Place le nom par son CENTRE.
 * @param {number} x  abscisse du centre voulu
 * @param {number} y  ordonnée du centre voulue
 */
var centrerSur = function (x, y) {
  if (!_element) return;
  var boite = _element.getBoundingClientRect();
  _element.style.left = Math.round(x - boite.width / 2) + 'px';
  _element.style.top = Math.round(y - boite.height / 2) + 'px';
};

/** L'élément lui-même, pour qui a besoin de le mesurer. */
var element = function () {
  return _element;
};

/** Là où peut commencer ce qui suit le nom, bord gauche compris. */
var reserve = function () {
  if (!_element) return BORD;
  return BORD + Math.ceil(_element.getBoundingClientRect().width) + ECART;
};

export default {
  poser: poser,
  auClic: auClic,
  centrerSur: centrerSur,
  element: element,
  baliser: baliser,
  reserve: reserve,
  NOM: NOM
};
