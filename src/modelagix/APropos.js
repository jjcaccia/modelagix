/**
 * MODELAGIX — la fenêtre « À propos & aide »
 *
 * ── Ce qu'il y avait avant ────────────────────────────────────────────────
 * Le menu « À propos & aide » du tiroir du haut n'ouvrait aucune fenêtre : il
 * envoyait directement sur le site de Stéphane Ginier, dans un nouvel onglet
 * (`Gui.addAboutButton`). L'auteur du moteur était donc crédité, mais rien ne
 * disait ce qu'est cette application ni comment s'en servir.
 *
 * ── Comment on reprend ce menu sans toucher au moteur ─────────────────────
 * Son écouteur est posé en ligne, à la construction, sans qu'on en garde de
 * référence : `removeEventListener` est donc impossible. On REMPLACE l'élément
 * par une copie de lui-même — une copie ne reprend pas les écouteurs — puis on
 * pose le nôtre. Le moteur reste intact.
 *
 * On retrouve le menu par `TR('about')`, l'étiquette traduite : si l'utilisateur
 * change la langue en cours de route, la reconnaissance suit.
 *
 * ── Sur la mention de filiation ───────────────────────────────────────────
 * Le cahier des charges, section 3, demande deux choses qui se contredisent :
 * cette mention doit figurer « dans ces termes » dans la fenêtre « À propos »,
 * et le mot « Sculptris » ne doit jamais apparaître dans ce qui est visible du
 * public. Le texte prescrit contient ce mot.
 *
 * Retenu : la consigne particulière l'emporte sur la règle générale. Une clause
 * de non-affiliation qui ne nomme personne ne dit rien ; et c'est justement le
 * seul endroit où nommer sert à écarter la confusion, non à l'entretenir. Point
 * signalé à Jean-Jacques : une phrase à changer ici si son avis diffère.
 */

import TR from 'gui/GuiTR';
import NomApplication from 'modelagix/NomApplication';

var ID = 'modelagix-apropos';
var ID_STYLE = 'modelagix-style-apropos';

/** Gestes à la souris, tous relevés dans `SculptGL.onMouseDown`. */
var SOURIS = [
  ['Bouton gauche sur l\'objet', 'sculpter'],
  ['Bouton gauche à côté de l\'objet', 'tourner la vue'],
  ['Bouton droit', 'tourner la vue'],
  ['Bouton du milieu', 'déplacer la vue'],
  ['Ctrl + bouton droit', 'zoomer'],
  ['Molette', 'zoomer']
];

/**
 * Raccourcis clavier, relevés dans la table du moteur
 * (`getOptionsURL.readShortcuts`) et dans nos propres branchements.
 *
 * C'est ici, et nulle part ailleurs, que les numéros d'outils ont un sens :
 * accompagnés du nom auquel ils correspondent. Isolés dans une infobulle, ils
 * ne renseignaient sur rien — ils en ont été retirés.
 *
 * Rangés par touche croissante, et non dans l'ordre de la barre d'outils : on
 * vient ici avec une touche en tête pour savoir ce qu'elle fait, pas l'inverse.
 */
var CLAVIER = [
  ['0', 'Saisir'],
  ['1', 'Dessiner'],
  ['2', 'Gonfler'],
  ['3', 'Tourner'],
  ['4', 'Lisser'],
  ['5', 'Aplatir'],
  ['6', 'Pincer'],
  ['7', 'Creuser'],
  ['8', 'Tirer'],
  ['E', 'Transformer']
];

var CLAVIER_AUTRES = [
  ['X', 'régler la taille du pinceau à la souris'],
  ['C', 'régler la force du pinceau à la souris'],
  ['N', 'inverser le sens de l\'outil'],
  ['Flèches', 'déplacer la vue'],
  ['Tab', 'ouvrir ou fermer les deux tiroirs'],
  ['Ctrl + Z', 'annuler'],
  ['Ctrl + Y', 'rétablir']
];

var CSS = [
  '#' + ID + '-fond {',
  '  position: fixed;',
  '  inset: 0;',
  // Au-dessus du nom (30), qui est lui-même au-dessus des menus (20).
  '  z-index: 40;',
  '  background: rgba(0, 0, 0, 0.45);',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  padding: 24px;',
  '}',
  '#' + ID + ' {',
  '  position: relative;',
  '  width: 460px;',
  '  max-width: 100%;',
  '  max-height: 100%;',
  '  overflow-y: auto;',
  '  box-sizing: border-box;',
  '  padding: 26px 30px 30px;',
  '  border-radius: 10px;',
  '  background: rgba(30, 34, 40, 0.97);',
  '  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);',
  '  color: rgba(255, 255, 255, 0.85);',
  '  font: 12px/1.55 system-ui, -apple-system, sans-serif;',
  '}',
  '#' + ID + ' h1 {',
  '  margin: 0;',
  '  font: 700 22px/1.2 system-ui, -apple-system, sans-serif;',
  '  letter-spacing: 0.4px;',
  '  color: #fff;',
  '}',
  '#' + ID + ' .modelagix-apropos-sous {',
  '  margin: 6px 0 22px;',
  '  color: rgba(255, 255, 255, 0.55);',
  '}',
  '#' + ID + ' h2 {',
  '  margin: 22px 0 8px;',
  '  font: 700 11px/1.2 system-ui, -apple-system, sans-serif;',
  '  text-transform: uppercase;',
  '  letter-spacing: 1px;',
  '  color: rgba(255, 255, 255, 0.42);',
  '}',
  // Deux colonnes : le geste à gauche, ce qu'il fait à droite.
  '#' + ID + ' dl {',
  '  display: grid;',
  '  grid-template-columns: auto 1fr;',
  '  gap: 3px 14px;',
  '  margin: 0;',
  '}',
  '#' + ID + ' dt {',
  '  color: rgba(255, 255, 255, 0.92);',
  '  white-space: nowrap;',
  '}',
  '#' + ID + ' dd {',
  '  margin: 0;',
  '  color: rgba(255, 255, 255, 0.6);',
  '}',
  // Les touches sont figurées comme des touches : on les reconnaît sans lire.
  '#' + ID + ' .modelagix-touche {',
  '  display: inline-block;',
  '  min-width: 20px;',
  '  padding: 1px 6px;',
  '  border: 1px solid rgba(255, 255, 255, 0.22);',
  '  border-radius: 4px;',
  '  background: rgba(255, 255, 255, 0.07);',
  '  font: 600 11px/1.5 system-ui, -apple-system, sans-serif;',
  '  text-align: center;',
  '}',
  '#' + ID + ' .modelagix-filiation {',
  '  margin: 10px 0 0;',
  '  padding-top: 16px;',
  '  border-top: 1px solid rgba(255, 255, 255, 0.1);',
  '  color: rgba(255, 255, 255, 0.55);',
  '}',
  '#' + ID + ' a {',
  '  color: #8ab4f8;',
  '}',
  '#' + ID + '-fermer {',
  '  position: absolute;',
  '  top: 12px;',
  '  right: 12px;',
  '  width: 26px;',
  '  height: 26px;',
  '  padding: 0;',
  '  border: none;',
  '  border-radius: 5px;',
  '  background: transparent;',
  '  color: rgba(255, 255, 255, 0.55);',
  '  font: 18px/1 system-ui, -apple-system, sans-serif;',
  '  cursor: pointer;',
  '}',
  '#' + ID + '-fermer:hover {',
  '  background: rgba(255, 255, 255, 0.1);',
  '  color: #fff;',
  '}'
].join('\n');

var echapper = function (texte) {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

var lignes = function (paires, commeTouche) {
  var html = '';
  for (var i = 0; i < paires.length; ++i) {
    var gauche = echapper(paires[i][0]);
    if (commeTouche) gauche = '<span class="modelagix-touche">' + gauche + '</span>';
    html += '<dt>' + gauche + '</dt><dd>' + echapper(paires[i][1]) + '</dd>';
  }
  return '<dl>' + html + '</dl>';
};

var injecterStyle = function () {
  if (document.getElementById(ID_STYLE)) return;
  var style = document.createElement('style');
  style.id = ID_STYLE;
  style.textContent = CSS;
  document.head.appendChild(style);
};

var _fond = null;
var _cbClavier = null;

var fermer = function () {
  if (!_fond) return;
  _fond.parentNode.removeChild(_fond);
  _fond = null;
  window.removeEventListener('keydown', _cbClavier, true);
};

var ouvrir = function () {
  if (_fond) return fermer(); // le menu rouvre et referme
  injecterStyle();

  var nom = echapper(NomApplication.NOM);

  _fond = document.createElement('div');
  _fond.id = ID + '-fond';
  _fond.innerHTML =
    '<div id="' + ID + '" role="dialog" aria-modal="true" aria-label="À propos et aide">' +
      '<button id="' + ID + '-fermer" type="button" title="Fermer" aria-label="Fermer">×</button>' +
      '<h1>' + nom + '</h1>' +
      '<p class="modelagix-apropos-sous">Un outil de sculpture numérique à interface ' +
        'simplifiée, utilisable dans un navigateur.</p>' +

      '<h2>À la souris</h2>' + lignes(SOURIS, false) +
      '<h2>Choisir un outil</h2>' + lignes(CLAVIER, true) +
      '<h2>Autres touches</h2>' + lignes(CLAVIER_AUTRES, true) +

      '<p class="modelagix-filiation">' +
        nom + ' est fondé sur ' +
        '<a href="http://stephaneginier.com" target="_blank" rel="noopener">SculptGL</a>' +
        ' de Stéphane Ginier, sous licence MIT.<br>' +
        'Ce projet n\'est ni affilié ni lié à Sculptris ou à Maxon.' +
      '</p>' +
    '</div>';

  // Fermer : la croix, le fond autour, ou Échap. Trois sorties, aucune surprise.
  _fond.addEventListener('mousedown', function (ev) {
    if (ev.target === _fond) fermer();
  }, false);
  _fond.querySelector('#' + ID + '-fermer').addEventListener('click', fermer, false);

  _cbClavier = function (ev) {
    if (ev.key !== 'Escape') return;
    // En capture, et on arrête net : sinon le moteur reçoit la touche aussi.
    ev.stopPropagation();
    ev.preventDefault();
    fermer();
  };
  window.addEventListener('keydown', _cbClavier, true);

  document.body.appendChild(_fond);
};

/**
 * Reprend le menu « À propos & aide » du tiroir du haut.
 * @return {boolean} false si le menu n'a pas été trouvé
 */
var installer = function () {
  var etiquette = TR('about');
  var menus = document.querySelectorAll('.gui-topbar > ul > li');
  for (var i = 0; i < menus.length; ++i) {
    if (menus[i].textContent.trim() !== etiquette) continue;

    // La copie ne reprend pas l'écouteur qui ouvrait le site en nouvel onglet.
    var copie = menus[i].cloneNode(true);
    menus[i].parentNode.replaceChild(copie, menus[i]);
    copie.addEventListener('mousedown', function (ev) {
      ev.preventDefault();
      ouvrir();
    }, false);
    return true;
  }
  return false;
};

export default { installer: installer, ouvrir: ouvrir, fermer: fermer };
