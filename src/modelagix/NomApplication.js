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

/** Le nom affiché. Un seul endroit à changer. */
var NOM = 'SculptIX';

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
  '  pointer-events: none;',
  '  -webkit-user-select: none;',
  '  user-select: none;',
  '}'
].join('\n');

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

  _element = document.createElement('div');
  _element.id = ID;
  _element.textContent = NOM;
  document.body.appendChild(_element);

  // Le nom doit se retrouver à la même hauteur d'œil que les menus du tiroir
  // ouvert. Plutôt que de figer 40 px, on mesure une vraie rangée : elle existe
  // encore à cet instant, la fermeture initiale des tiroirs venant après.
  var rangee = document.querySelector('.gui-topbar > ul > li');
  if (rangee && rangee.offsetHeight > 0) {
    _element.style.height = rangee.offsetHeight + 'px';
    _element.style.lineHeight = rangee.offsetHeight + 'px';
  }

  // Mesure après insertion : c'est le seul moment où la largeur réelle existe.
  var largeur = Math.ceil(_element.getBoundingClientRect().width);
  document.documentElement.style.setProperty(
    '--modelagix-nom-reserve', (BORD + largeur + ECART) + 'px');

  return _element;
};

/** Là où peut commencer ce qui suit le nom, bord gauche compris. */
var reserve = function () {
  if (!_element) return BORD;
  return BORD + Math.ceil(_element.getBoundingClientRect().width) + ECART;
};

export default { poser: poser, reserve: reserve, NOM: NOM };
