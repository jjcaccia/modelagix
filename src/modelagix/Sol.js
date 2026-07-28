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
  'varying vec3 vMonde;',
  'void main() {',
  '  vec3 monde = aVertex * uEchelle + uCentre;',
  '  vMonde = monde;',
  '  gl_Position = uProjVue * vec4(monde, 1.0);',
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
  //
  // Elle travaille sur UNE coordonnée à la fois, et non sur les deux : c'est
  // ce qui permet de savoir à quelle famille appartient une ligne — celles de
  // z constant courent le long de X, celles de x constant le long de Y — et
  // donc de leur donner la couleur de leur axe.
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
  // Les deux familles de décades, séparées : celles qui suivent X et celles qui
  // suivent Y. Chacune reprendra la teinte de son axe.
  '  float forteX = raie(p.y, uPasFort);',
  '  float forteY = raie(p.x, uPasFort);',
  '  float forte = max(forteX, forteY);',

  // L'extinction commence à un tiers de la portée, pas tout de suite : la
  // grille doit être FRANCHE autour de l'objet — c'est là qu'elle sert à
  // mesurer — et ne s'éteindre qu'ensuite. Élevée au cube, la décroissance est
  // lente d'abord puis rapide : un sol qui se perd au loin, et non un voile
  // uniformément gris.
  '  float d = distance(uOeil, vMonde);',
  // L'extinction commence tard — au cinquième de la portée — et n'est élevée
  // qu'au CARRÉ. Au cube, le sol s'éteignait franchement au-delà de l'objet ;
  // la décroissance est maintenant plus douce et court plus loin, ce qui donne
  // un plan qui se perd, au lieu d'un disque de grille posé sur du vide.
  // L'extinction ne commence qu'aux DEUX CINQUIÈMES de la portée, et elle n'est
  // plus élevée à aucune puissance. Le carré, puis le cube avant lui, faisaient
  // chuter le sol presque aussitôt passé l'objet : on voyait un disque de grille
  // plutôt qu'un plan. La courbe en S du `smoothstep` suffit à adoucir les deux
  // extrémités ; l'écraser davantage ne faisait que raccourcir la vue.
  '  float fondu = 1.0 - smoothstep(uPortee * 0.40, uPortee, d);',
  '  if (fondu < 0.002) discard;',

  '  float ax = axe(vMonde.z);',
  '  float ay = axe(vMonde.x);',

  // ── Les décades reprennent la couleur de leur axe ──────────────────────
  //
  // Toutes les dix cases, la ligne prend la teinte de l'axe qu'elle suit :
  // rougie le long de X, verdie le long de Y. On compte donc les décades sans
  // les compter, et sans qu'un second jeu de gris vienne s'ajouter au premier.
  //
  // La TEINTE est franche — 70 % vers la couleur d'axe — mais l'encre reste
  // faible. C'est ce qui permet de reconnaître la couleur sans que le sol
  // devienne un papier millimétré : on joue sur la couleur, pas sur la force.
  // Seules les deux vraies lignes zéro gardent leur couleur entière, plus bas.
  '  vec3 teinteX = mix(uCouleurForte, uCouleurAxeX, 0.88);',
  '  vec3 teinteY = mix(uCouleurForte, uCouleurAxeY, 0.88);',
  '  vec3 forteCouleur = mix(teinteY, teinteX, step(forteY, forteX));',

  // Contraste volontairement bas : le sol est un repère, pas un motif. Il doit
  // se lire quand on le cherche et s'oublier le reste du temps.
  '  vec3 couleur = mix(uCouleurFine, forteCouleur, forte);',
  // ── Les trois niveaux sont MESURÉS, pas estimés ────────────────────────
  //
  // La chaîne de couleur du moteur n'est pas une simple correction gamma : elle
  // relève fortement les valeurs sombres. Choisir ces nombres au raisonnement
  // donnait des lignes deux à trois fois trop claires. Ils ont donc été réglés
  // en LISANT les pixels rendus (`gl.readPixels` sur une ligne du sol), pour
  // viser, sur un fond à 50 :
  //   - trait fin      ≈  58, à peine détaché du fond ;
  //   - décade         ≈  95, franche sans être criarde ;
  //   - axe            ≈ 140.
  // Si l'un de ces réglages doit rebouger, remesurer plutôt que deviner.
  '  float alpha = max(fine * 0.05, forte * 0.32);',
  '  couleur = mix(couleur, uCouleurAxeX, ax);',
  '  couleur = mix(couleur, uCouleurAxeY, ay);',
  '  alpha = max(alpha, max(ax, ay) * 0.34);',

  '  alpha *= fondu * uOpacite;',
  '  if (alpha < 0.004) discard;',

  // ── On mélange NOUS-MÊMES avec le fond, et on sort opaque ──────────────
  //
  // Le moteur peint le fond de la vue APRÈS le sol, dans la même passe. Un
  // fragment translucide se serait donc mélangé au noir du tampon vidé, pas au
  // gris du fond : les lignes sortaient presque noires. On fait le mélange à la
  // main contre la couleur du fond, et on écrit une couleur pleine.
  //
  // Conséquence assumée : si l'utilisateur charge une IMAGE de fond, les lignes
  // resteront calées sur le gris uni. Le sol est un repère de travail, pas un
  // élément de mise en scène — on n'ajoutera pas une passe de rendu pour ça.
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
  'uProjVue', 'uCentre', 'uEchelle', 'uOeil', 'uFond',
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
    // Une trentaine de cases sur la largeur de la scène. ShapeShix en met une
    // douzaine, mais son sol se regarde de plus haut : ici la caméra rase le
    // plan, et des cases larges donnaient un quadrillage grossier dès qu'on
    // s'éloignait de l'objet.
    var brut = Math.max(1, taille / 30);
    var puissance = Math.pow(10, Math.floor(Math.log10(brut)));
    var reste = brut / puissance;
    this._pasFin = (reste < 1.5 ? 1 : reste < 3.5 ? 2 : reste < 7.5 ? 5 : 10) * puissance;
    this._pasFort = this._pasFin * 10;
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
    camera.computePosition(this._oeil);

    // Le plan se recentre sous la caméra : c'est ce qui rend la grille infinie
    // sans avoir à la dimensionner. Seuls X et Z suivent — en Y le sol reste
    // où l'objet est posé, sinon il monterait avec le regard.
    this._centre[0] = this._oeil[0];
    this._centre[1] = this._hauteur;
    this._centre[2] = this._oeil[2];

    // ── L'étendue se règle sur le plan LOINTAIN de la caméra ──────────────
    //
    // Le moteur resserre son tronc de vision autour de la scène : ici, le plan
    // lointain était à 210 unités. Un plan de 3 400 unités de côté avait donc
    // ses quatre coins au-delà, et le triangle entier était éliminé avant même
    // d'être tramé — la grille avait purement disparu. Symptôme trompeur : pas
    // une erreur WebGL, pas un pixel, rien.
    //
    // Le plan est donc VOLONTAIREMENT plus grand que le tronc de vision : les
    // cases au-delà sont écartées, celles qui le traversent sont découpées
    // proprement. Ce qui compte est que l'extinction s'achève AVANT le plan
    // lointain, sinon on verrait la coupure — exactement ce qu'on cherchait à
    // supprimer. D'où 0,72, franchement en deçà.
    //
    // Le plan lointain s'éloigne quand on recule : le sol s'étend de lui-même
    // quand on prend du champ, ce qui est le comportement attendu.
    var loin = camera._far || 200;
    var demi = loin * 2;
    this._portee = loin * 0.88;

    gl.useProgram(this._programme);

    var u = this._u;
    gl.uniformMatrix4fv(u.uProjVue, false, this._projVue);
    gl.uniform3fv(u.uCentre, this._centre);
    gl.uniform3fv(u.uOeil, this._oeil);
    gl.uniform1f(u.uEchelle, demi);
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
 * Gris du tracé : le fin en retrait, le fort qui porte la lecture.
 *
 * Ils sont volontairement proches du fond (0,196). Un sol trop clair prend le
 * pas sur l'objet : on lit la grille au lieu de lire la forme, ce qui est
 * exactement l'inverse de son office.
 */
Sol.COULEUR_FINE = versLineaire([0.24, 0.27, 0.31]);
Sol.COULEUR_FORTE = versLineaire([0.34, 0.38, 0.43]);
/**
 * Le gris du fond de la vue, contre lequel le sol se mélange lui-même.
 * Relevé dans le moteur : `Background.init` crée une texture d'un pixel en
 * RGB(50, 50, 50).
 */
Sol.COULEUR_FOND = versLineaire([50 / 255, 50 / 255, 50 / 255]);
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
Sol.installer = function (main) {
  var grille = main._grid;
  if (!grille || grille._solModelagix) return null;

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
