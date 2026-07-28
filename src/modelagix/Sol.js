/**
 * MODELAGIX — le sol
 *
 * Une grille qui s'éteint avec la distance, au lieu de s'arrêter net.
 *
 * Repris de **ShapeShix** (`src/vue/Sol.js`), où le principe a été mis au point.
 * Là-bas c'est un matériau three.js ; ici il n'y a pas de moteur de rendu à
 * disposition, donc le programme est écrit et piloté directement en WebGL. Le
 * nuanceur, lui, est le même à la transposition d'axes près.
 *
 * ── Ce qui n'allait pas dans la grille d'origine ──────────────────────────
 *
 * Le moteur dessinait un treillis de SEGMENTS : un carré de 20 × 20 cases,
 * uniformément visible, qui s'interrompt net à son bord. Deux défauts, et le
 * second est le pire.
 *
 * D'abord on VOIT le bord. Un carré posé dans le vide ne donne pas l'échelle,
 * il donne une limite — et le regard s'accroche à cette limite au lieu de la
 * forme.
 *
 * Ensuite les lignes lointaines deviennent du bruit. Elles se resserrent
 * jusqu'à se toucher, et le moiré scintille dès que la caméra bouge d'un pixel.
 *
 * ── Comment celle-ci fonctionne ───────────────────────────────────────────
 *
 * Pas de segments : un simple plan, et un nuanceur qui décide pour chaque pixel
 * s'il tombe sur une ligne. Trois conséquences :
 *
 *   1. La largeur du trait est calculée avec `fwidth()` — la variation de la
 *      coordonnée d'un pixel au suivant. Le trait fait donc toujours un pixel à
 *      l'écran quelle que soit la distance : une ligne lointaine ne se resserre
 *      pas, elle s'estompe. C'est ce qui supprime le moiré.
 *   2. L'extinction est une formule, pas une découpe. La grille se dissout dans
 *      le fond et le regard ne rencontre aucun bord.
 *   3. Le plan suit la caméra : la grille est infinie en pratique, on ne peut
 *      pas s'en échapper et il n'y a rien à dimensionner.
 *
 * Deux pas superposés — fin et fort, dans un rapport de dix — et les deux axes
 * du sol à leur couleur. C'est ce qui permet d'estimer une taille d'un coup
 * d'œil sans compter les cases.
 *
 * ── Comment on s'insère sans modifier le moteur ───────────────────────────
 *
 * `Scene.render` appelle `this._grid.render(this)`. On REMPLACE cette méthode
 * sur l'objet existant plutôt que de remplacer l'objet : la grille du moteur
 * reste dans `computeBoundingBoxScene`, donc le recadrage sur la scène continue
 * de tenir compte du sol exactement comme avant. Seul le tracé change.
 *
 * ── Le nom des axes ───────────────────────────────────────────────────────
 *
 * Le moteur travaille en Y vertical : le sol est donc le plan XZ. Mais notre
 * interface nomme les axes du point de vue de l'utilisateur — Z est la
 * verticale, Y la profondeur (voir CubeVues). Les deux axes du sol sont donc,
 * pour lui, X et Y : rouge le long de la profondeur nulle, vert le long de
 * l'abscisse nulle. Mêmes couleurs que le trièdre du cube, sans quoi les deux
 * repères se contrediraient.
 */

import { mat4 } from 'gl-matrix';
import COULEURS_CUBE from 'modelagix/CouleursAxes';

var SOMMET = [
  'attribute vec3 aVertex;',
  'uniform mat4 uProjVue;',
  'uniform vec3 uCentre;',
  'uniform float uEchelle;',
  'uniform float uForcerLeFond;',
  'varying vec3 vMonde;',
  'void main() {',
  '  vec3 monde = aVertex * uEchelle + uCentre;',
  '  vMonde = monde;',
  '  gl_Position = uProjVue * vec4(monde, 1.0);',
  // ── La profondeur forcée, en ORTHOGRAPHIQUE SEULEMENT ─────────────────
  //
  // Là-bas, le moteur resserre sa tranche de vision autour de la scène —
  // relevé : près 874, loin 1127, soit 253 unités — alors que notre plan
  // s'étend sur près de deux mille. Tout était découpé sauf une mince bande,
  // hors champ. On y écrit donc une profondeur constante, tout au fond.
  //
  // ⚠️ NE PAS l'appliquer en perspective. La matrice y est corrigée pour un
  // plan lointain à l'infini, ce qui tasse TOUTES les profondeurs juste sous 1 :
  // à quatre-vingts unités, l'objet est à 0,99987. Une constante à 0,999 le
  // plaçait donc DEVANT lui, et le sol passait au travers des volumes — le
  // défaut signalé. En perspective, la profondeur calculée est la bonne et se
  // suffit à elle-même.
  //
  // Ce qu'on perd en orthographique : le sol ne peut plus s'entrecouper avec un
  // objet qui le traverserait. Un plancher n'a pas à le faire.
  '  if (uForcerLeFond > 0.5) gl_Position.z = gl_Position.w * 0.999;',
  '}'
].join('\n');

// `fwidth` n'existe pas dans le WebGL de base : c'est une extension. Le moteur
// charge toutes celles que la carte annonce au démarrage (WebGLCaps), il ne
// reste qu'à la déclarer ici. La directive doit précéder toute autre ligne.
var FRAGMENT = [
  '#extension GL_OES_standard_derivatives : enable',
  'precision highp float;',
  'uniform vec3 uCouleurFine;',
  'uniform vec3 uCouleurForte;',
  'uniform vec3 uCouleurAxeX;',
  'uniform vec3 uCouleurAxeY;',
  'uniform float uPasFin;',
  'uniform float uPasFort;',
  'uniform float uPortee;',
  'uniform float uOpacite;',
  'uniform vec3 uOeil;',
  'uniform vec3 uFond;',
  'varying vec3 vMonde;',

  // 1 sur une raie, 0 ailleurs, avec un fondu d'un pixel de chaque côté.
  // Diviser par `fwidth`, c'est raisonner en pixels à l'écran plutôt qu'en
  // unités de la scène : une ligne lointaine ne se resserre pas, elle s'estompe.
  'float raie(float v, float pas) {',
  '  float c = v / pas;',
  '  float d = fwidth(c);',
  '  float g = abs(fract(c - 0.5) - 0.5) / max(d, 1e-6);',
  '  return 1.0 - min(g, 1.0);',
  '}',

  // Un axe : la même idée sur la coordonnée nulle, un peu plus large.
  'float axe(float v) {',
  '  float d = fwidth(v);',
  '  return 1.0 - min(abs(v) / max(d, 1e-6) / 1.6, 1.0);',
  '}',

  'void main() {',
  '  vec2 p = vMonde.xz;',
  '  float fine = max(raie(p.x, uPasFin), raie(p.y, uPasFin));',
  '  float forte = max(raie(p.x, uPasFort), raie(p.y, uPasFort));',

  // ── L'extinction ──────────────────────────────────────────────────────
  //
  // Elle démarre TÔT — au sixième de la portée — et reste élevée au cube. Une
  // décroissance lente laissait la grille traîner jusqu'à l'horizon, où sa
  // trame formait un hachurage permanent. Ce qu'on cherche est l'inverse : un
  // sol qui a disparu bien avant, pour que le lointain reste vide.
  '  float d = distance(uOeil, vMonde);',
  '  float fondu = 1.0 - smoothstep(uPortee * 0.16, uPortee, d);',
  '  fondu = fondu * fondu * fondu;',
  '  if (fondu < 0.004) discard;',

  '  float ax = axe(vMonde.z);',
  '  float ay = axe(vMonde.x);',

  // ── Trois niveaux, et un seul principe : le rapport au fond ────────────
  //
  // Ce qui se voit d'une ligne n'est pas sa valeur mais son rapport à la
  // luminance du fond. Sur `0x1a1e24` (0,0072 en linéaire), les trois visés :
  //
  //     trame fine  ×1,2   presque invisible — on la devine, on ne la lit pas
  //     décade      ×4     franchement contrastée : c'est ELLE qu'on voit
  //     axes        ×20    couleur pleine, reconnaissable au premier regard
  //
  // La décade est en GRIS, pas teintée. Une version précédente lui donnait la
  // couleur de son axe ; comparée à la référence, cette teinte brouillait
  // justement les deux vraies lignes zéro, qui doivent être les seules colorées.
  '  vec3 couleur = mix(uCouleurFine, uCouleurForte, forte);',
  '  float alpha = max(fine * 0.008, forte * 0.05);',
  '  couleur = mix(couleur, uCouleurAxeX, ax);',
  '  couleur = mix(couleur, uCouleurAxeY, ay);',
  '  alpha = max(alpha, max(ax, ay) * 0.35);',

  '  alpha *= fondu * uOpacite;',
  '  if (alpha < 0.002) discard;',

  // ── On mélange NOUS-MÊMES avec le fond, et on sort opaque ──────────────
  //
  // Le moteur peint le fond de la vue APRÈS le sol, dans la même passe. Un
  // fragment translucide se serait donc mélangé au noir du tampon vidé, pas à la
  // teinte du fond : les lignes sortaient presque noires. On fait le mélange à
  // la main contre `uFond`, et on écrit une couleur pleine.
  //
  // Conséquence assumée : si l'utilisateur charge une IMAGE de fond, les lignes
  // resteront calées sur la teinte unie.
  '  gl_FragColor = vec4(mix(uFond, couleur, alpha), 1.0);',
  '}'
].join('\n');

/**
 * Le plan du sol, dans le plan XZ, de −1 à 1. Sa hauteur vient de `uCentre`.
 *
 * Il est DÉCOUPÉ en cases, et ce n'est pas une coquetterie. Un seul grand
 * quadrilatère a ses quatre sommets loin de la caméra : si tous dépassent le
 * plan lointain, la carte élimine le triangle entier avant de le tramer, et le
 * sol disparaît d'un coup — sans la moindre erreur WebGL. Découpé, seules les
 * cases réellement au-delà sont écartées, et le reste est découpé proprement au
 * plan lointain. Le sol peut donc être plus grand que le tronc de vision, ce qui
 * laisse l'extinction s'achever bien avant qu'on n'atteigne son bord.
 */
var CASES = 16;

var construireQuad = function () {
  var v = [];
  var pas = 2 / CASES;
  for (var i = 0; i < CASES; ++i) {
    for (var j = 0; j < CASES; ++j) {
      var x0 = -1 + i * pas, x1 = x0 + pas;
      var z0 = -1 + j * pas, z1 = z0 + pas;
      v.push(x0, 0, z0, x1, 0, z0, x1, 0, z1);
      v.push(x0, 0, z0, x1, 0, z1, x0, 0, z1);
    }
  }
  return new Float32Array(v);
};

var QUAD = construireQuad();
var NB_SOMMETS = QUAD.length / 3;

var NOMS_UNIFORMES = [
  'uProjVue', 'uCentre', 'uEchelle', 'uOeil', 'uFond', 'uForcerLeFond',
  'uCouleurFine', 'uCouleurForte', 'uCouleurAxeX', 'uCouleurAxeY',
  'uPasFin', 'uPasFort', 'uPortee', 'uOpacite'
];

var compiler = function (gl, type, source) {
  var s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
  window.console.warn('MODELAGIX — sol : ' + gl.getShaderInfoLog(s));
  gl.deleteShader(s);
  return null;
};

class Sol {

  constructor(main) {
    this._main = main;
    // `Scene` n'expose pas son contexte : il n'y a que le champ. Les maillages
    // ont bien un `getGL()`, mais c'est le même objet.
    this._gl = main._gl;
    this._pret = false;
    this._opacite = 1;

    var gl = this._gl;
    var vs = compiler(gl, gl.VERTEX_SHADER, SOMMET);
    var fs = compiler(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      window.console.warn('MODELAGIX — sol : ' + gl.getProgramInfoLog(prog));
      return;
    }

    this._programme = prog;
    this._attributVertex = gl.getAttribLocation(prog, 'aVertex');
    this._u = {};
    for (var i = 0; i < NOMS_UNIFORMES.length; ++i) {
      this._u[NOMS_UNIFORMES[i]] = gl.getUniformLocation(prog, NOMS_UNIFORMES[i]);
    }

    this._tampon = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._tampon);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this._projVue = mat4.create();
    this._oeil = [0, 0, 0];
    this._centre = [0, 0, 0];

    this._hauteur = 0;
    this._pasFin = 10;
    this._pasFort = 100;
    // Recalculée à chaque image d'après le plan lointain de la caméra.
    this._portee = 200;
    this._pret = true;
  }

  /**
   * Adapte le pas et la portée à la taille de la scène.
   *
   * Un pas fin qui reste lisible : une douzaine de cases sur la taille de
   * l'objet, arrondies à une valeur ronde — 1, 2, 5, 10, 20, 50… Le pas fort
   * vaut dix fois le fin : c'est cette décade qui permet de compter sans
   * compter, et c'est elle que marquent les axes colorés.
   */
  echelle(taille) {
    // Une douzaine de cases sur la largeur de la scène — la règle de ShapeShix.
    //
    // On était passé à une trentaine pour affiner la maille. C'était une erreur
    // de lecture : dans la référence, la trame fine est presque invisible et ce
    // qu'on voit est la DÉCADE. Des cases trois fois plus petites ne rendaient
    // pas la grille plus fine, elles la rendaient plus dense — et cette densité
    // formait au loin un hachurage qui ne s'éteignait jamais.
    var brut = Math.max(1, taille / 12);
    var puissance = Math.pow(10, Math.floor(Math.log10(brut)));
    var reste = brut / puissance;
    this._pasFin = (reste < 1.5 ? 1 : reste < 3.5 ? 2 : reste < 7.5 ? 5 : 10) * puissance;
    this._pasFort = this._pasFin * 10;

    // Trois fois et demie la scène, et non sept. Sept laissait la grille
    // présente jusqu'à l'horizon ; on cherche au contraire qu'elle ait disparu
    // bien avant, pour que le lointain reste vide.
    this._portee = taille * 3.5;
  }

  /** Hauteur du sol, en unités du monde. */
  poser(y) {
    this._hauteur = y;
  }

  /**
   * Dessine le sol. Appelée par `Scene.render` à la place de celle de la
   * grille d'origine.
   */
  dessiner() {
    if (!this._pret) return;

    var gl = this._gl;
    var main = this._main;
    var camera = main.getCamera();

    mat4.mul(this._projVue, camera.getProjection(), camera.getView());

    // ── Le point de référence est le CENTRE VISÉ, pas l'œil ───────────────
    //
    // Le plan se recentre sur lui, et c'est de lui que se mesure l'extinction.
    // Seuls X et Z suivent : en Y le sol reste où l'objet est posé, sinon il
    // monterait avec le regard.
    //
    // Se servir de l'œil paraissait naturel — c'est ce que fait ShapeShix — mais
    // ça ne marche qu'en perspective. **En projection orthographique, ce moteur
    // repousse l'œil à mille unités** et resserre sa tranche de vision autour de
    // la scène (relevé : near 874, far 1127). Le sol se retrouvait alors centré à
    // mille unités de là, et chacun de ses points à plus de mille unités de
    // l'œil — donc au-delà de la portée, donc entièrement éliminé par le fondu.
    // La grille disparaissait purement et simplement dès qu'on quittait la
    // perspective.
    //
    // Le centre visé, lui, est le même dans les deux projections. Une seule
    // règle, deux modes, et l'extinction devient un halo autour de ce qu'on
    // regarde — ce qui est de toute façon ce qu'on veut d'un sol.
    var vise = camera._center || [0, 0, 0];
    this._oeil[0] = vise[0];
    this._oeil[1] = this._hauteur;
    this._oeil[2] = vise[2];

    this._centre[0] = vise[0];
    this._centre[1] = this._hauteur;
    this._centre[2] = vise[2];

    // Le plan déborde largement la portée : l'extinction s'achève donc bien
    // avant son bord, et aucune limite n'est visible.
    var demi = this._portee * 1.6;

    gl.useProgram(this._programme);

    var u = this._u;
    gl.uniformMatrix4fv(u.uProjVue, false, this._projVue);
    gl.uniform3fv(u.uCentre, this._centre);
    gl.uniform3fv(u.uOeil, this._oeil);
    gl.uniform1f(u.uEchelle, demi);
    // Le forçage de profondeur ne sert qu'en orthographique — voir le nuanceur.
    gl.uniform1f(u.uForcerLeFond, camera.isOrthographic() ? 1 : 0);
    gl.uniform3fv(u.uFond, Sol.COULEUR_FOND);
    gl.uniform3fv(u.uCouleurFine, Sol.COULEUR_FINE);
    gl.uniform3fv(u.uCouleurForte, Sol.COULEUR_FORTE);
    gl.uniform3fv(u.uCouleurAxeX, Sol.COULEUR_AXE_X);
    gl.uniform3fv(u.uCouleurAxeY, Sol.COULEUR_AXE_Y);
    gl.uniform1f(u.uPasFin, this._pasFin);
    gl.uniform1f(u.uPasFort, this._pasFort);
    gl.uniform1f(u.uPortee, this._portee);
    gl.uniform1f(u.uOpacite, this._opacite);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._tampon);
    gl.enableVertexAttribArray(this._attributVertex);
    gl.vertexAttribPointer(this._attributVertex, 3, gl.FLOAT, false, 0, 0);

    // Ni mélange ni masque de profondeur à changer : le nuanceur sort une
    // couleur pleine, et les pixels hors ligne sont éliminés par `discard` —
    // un fragment éliminé n'écrit ni couleur ni profondeur.
    //
    // Il FAUT que le sol écrive la profondeur. Le fond de la vue est peint
    // APRÈS lui, dans la même passe, et recouvre tout ce qui n'a pas laissé de
    // profondeur : sans elle, le sol était intégralement repeint — dessiné sans
    // la moindre erreur WebGL, et invisible. Symptôme déroutant s'il en est.
    gl.drawArrays(gl.TRIANGLES, 0, NB_SOMMETS);
    gl.disableVertexAttribArray(this._attributVertex);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}

/**
 * ── Les couleurs sont converties en LINÉAIRE ──────────────────────────────
 *
 * Le moteur travaille en lumière linéaire et n'encode qu'à la toute fin
 * (« merge + decode »). Une couleur écrite telle quelle ressort donc bien plus
 * claire qu'on ne l'a choisie : les premières lignes du sol, prévues en gris
 * moyen, sortaient presque blanches. On applique la conversion une fois pour
 * toutes, ici, plutôt que d'assombrir les valeurs à tâtons jusqu'à ce que ça
 * tombe juste — ce qui aurait marché sans qu'on sache pourquoi.
 */
var versLineaire = function (rgb) {
  return new Float32Array([
    Math.pow(rgb[0], 2.2), Math.pow(rgb[1], 2.2), Math.pow(rgb[2], 2.2)
  ]);
};

/**
 * Les teintes du tracé, reprises telles quelles de ShapeShix — `0x7c8798` et
 * `0xb3c0d4`. Ce sont des gris légèrement BLEUTÉS : sur un fond bleuté, un gris
 * neutre paraît chaud et se détache plus qu'il ne devrait.
 */
Sol.COULEUR_FINE = versLineaire([0x7c / 255, 0x87 / 255, 0x98 / 255]);
Sol.COULEUR_FORTE = versLineaire([0xb3 / 255, 0xc0 / 255, 0xd4 / 255]);

/**
 * ── Le fond de la vue ─────────────────────────────────────────────────────
 *
 * `0x1a1e24`, la valeur de ShapeShix. Le moteur livrait un gris neutre à 50 ;
 * ce bleu très sombre change tout le reste, car **ce qui se voit d'une ligne
 * n'est pas sa valeur mais son rapport au fond**. Sur un fond deux fois plus
 * sombre, les mêmes lignes sautent aux yeux — d'où les opacités très basses du
 * nuanceur, qui n'auraient aucun sens sur l'ancien gris.
 */
Sol.FOND_VUE = [0x1a, 0x1e, 0x24];
Sol.COULEUR_FOND = versLineaire([
  Sol.FOND_VUE[0] / 255, Sol.FOND_VUE[1] / 255, Sol.FOND_VUE[2] / 255
]);
Sol.COULEUR_AXE_X = versLineaire(COULEURS_CUBE.rvbX);
Sol.COULEUR_AXE_Y = versLineaire(COULEURS_CUBE.rvbY);

/**
 * Installe le sol à la place de la grille du moteur.
 *
 * On remplace la méthode `render` de l'objet grille, pas l'objet : il reste
 * ainsi dans `computeBoundingBoxScene`, et le recadrage sur la scène continue
 * de se comporter comme avant.
 *
 * @return {Sol|null} null si le programme n'a pas pu être construit — dans ce
 *   cas la grille d'origine continue de servir, ce qui vaut mieux que rien.
 */
/**
 * Donne au fond de la vue la teinte du sol.
 *
 * Le moteur se fabrique une texture d'un pixel gris (`Background.init`) ; on la
 * remplace par la nôtre. C'est la même mécanique que celle des matières
 * d'analyse, qui blanchissent ou noircissent ce même fond puis le rendent —
 * elles retrouveront donc cette teinte-ci, et non l'ancien gris.
 */
Sol.poserLeFondDeLaVue = function (main) {
  var fond = main._background;
  if (!fond || !fond.createOnePixelTexture) return false;
  fond._monoTex = fond.createOnePixelTexture(
    Sol.FOND_VUE[0], Sol.FOND_VUE[1], Sol.FOND_VUE[2], 255);
  return true;
};

Sol.installer = function (main) {
  var grille = main._grid;
  if (!grille || grille._solModelagix) return null;

  Sol.poserLeFondDeLaVue(main);

  var sol = new Sol(main);
  if (!sol._pret) return null;

  // La hauteur et l'étendue sont lues sur la grille d'origine : elle a déjà été
  // placée par le moteur sous l'objet de départ, et rien ne justifie de
  // recalculer ce qu'il a déjà décidé.
  var m = grille.getMatrix();
  sol.poser(m[13]);
  sol.echelle(Math.abs(m[0]) || 100);

  grille._solModelagix = sol;
  grille.render = function () {
    sol.dessiner();
  };
  return sol;
};

export default Sol;
