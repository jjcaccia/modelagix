/**
 * MODELAGIX — les couleurs des axes, à un seul endroit
 *
 * Rouge / vert / bleu pour X / Y / Z : la convention universelle en 3D.
 *
 * Elles étaient définies dans le cube d'orientation. Le sol les emploie
 * désormais aussi, pour marquer ses deux axes. Les laisser en double aurait
 * garanti qu'un jour l'un des deux repères contredise l'autre — et un repère
 * qui se contredit ne sert plus à rien.
 *
 * Deux formes du même jeu : en texte pour le SVG du cube, en nombres de 0 à 1
 * pour le nuanceur du sol, qui ne sait pas lire un dièse.
 */

/** '#rrggbb' vers [r, v, b] entre 0 et 1, prêt pour WebGL. */
var versRvb = function (hex) {
  return new Float32Array([
    parseInt(hex.substr(1, 2), 16) / 255,
    parseInt(hex.substr(3, 2), 16) / 255,
    parseInt(hex.substr(5, 2), 16) / 255
  ]);
};

var X = '#e05252';
var Y = '#5fbf62';
var Z = '#5b8def';

export default {
  x: X,
  y: Y,
  z: Z,
  rvbX: versRvb(X),
  rvbY: versRvb(Y),
  rvbZ: versRvb(Z)
};
