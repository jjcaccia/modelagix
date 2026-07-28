/**
 * MODELAGIX — la matière « Analyse », ou carte de profondeur
 *
 * Un rendu en niveaux de gris où la teinte ne dit plus la lumière mais la
 * DISTANCE. Ce que l'ombrage habituel cache — un décrochement de deux
 * millimètres sur une surface claire — saute aux yeux ici, parce que rien
 * d'autre ne vient troubler la lecture : ni matière, ni reflet, ni ombre portée.
 *
 * C'est l'outil de contrôle du modeleur, et c'est aussi ce qu'attendent les
 * logiciels qui lisent une « depth map ».
 *
 * ── Deux versions, et pourquoi les deux ───────────────────────────────────
 *
 *   - **Proche sombre** : le noir pur est ce qui vient vers nous, le blanc pur
 *     ce qui s'éloigne. Fond blanc. C'est la convention des cartes de hauteur
 *     et des tampons de relief.
 *   - **Proche clair** : l'inverse, fond noir. C'est la convention des cartes
 *     de profondeur en photographie et en vision par ordinateur.
 *
 * Aucune ne s'impose : elles se contredisent d'un métier à l'autre, et l'œil
 * ne lit pas un relief de la même façon selon le sens. On les propose donc
 * toutes les deux plutôt que d'en imposer une.
 *
 * ── Comment on s'ajoute sans modifier le moteur ───────────────────────────
 *
 * `ShaderLib` est un simple tableau indexé par `Enums.Shader`. On y AJOUTE deux
 * entrées et deux constantes ; aucun fichier du moteur n'est touché. La liste
 * déroulante des rendus reçoit les deux nouvelles options par sa méthode
 * `addOptions`, exactement comme les tampons calculés passent par
 * `addAlphaOptions`. Le reste de la mécanique du moteur suit sans rien savoir
 * de nous : `onShaderChanged` se contente d'appeler `mesh.setShaderType(val)`.
 *
 * ── L'étendue des gris ────────────────────────────────────────────────────
 *
 * Le noir et le blanc sont calés sur l'OBJET, pas sur le champ de vision de la
 * caméra. Une plage prise entre les plans proche et lointain écraserait tout le
 * modelé dans deux ou trois valeurs : l'objet n'occupe qu'une mince tranche de
 * ce que la caméra embrasse. On mesure donc la boîte englobante du maillage
 * dans le repère de la caméra, et on étale les 256 niveaux entre son point le
 * plus proche et son point le plus lointain. Le contraste est ainsi toujours
 * maximal, quelle que soit la distance à laquelle on s'est placé.
 */

import { vec3 } from 'gl-matrix';
import Enums from 'misc/Enums';
import ShaderBase from 'render/shaders/ShaderBase';
import ShaderLib from 'render/ShaderLib';

/**
 * Deux indices libres dans `Enums.Shader`, qui s'arrête à 12. On les pose sur
 * l'énumération pour que le reste du code les nomme au lieu de les compter.
 */
Enums.Shader.ANALYSE_PROCHE_SOMBRE = 13;
Enums.Shader.ANALYSE_PROCHE_CLAIRE = 14;

var VERSIONS = [{
  cle: 'analyse:sombre',
  shader: Enums.Shader.ANALYSE_PROCHE_SOMBRE,
  libelle: 'Profondeur — proche sombre',
  inverse: false,
  fond: 255
}, {
  cle: 'analyse:claire',
  shader: Enums.Shader.ANALYSE_PROCHE_CLAIRE,
  libelle: 'Profondeur — proche clair',
  inverse: true,
  fond: 0
}];

/**
 * La normale n'entre pas dans le calcul de la profondeur, et pourtant elle est
 * calculée ici. Ce n'est pas un oubli : la fonction de couleur commune du
 * moteur (`fragColorFunction`) lit `vNormal` pour son atténuation des objets
 * non sélectionnés et sa mise en évidence des courbures. La retirer ferait
 * échouer la compilation — message « vNormal : undeclared identifier », dont
 * rien n'indique qu'il vient d'un morceau de code hérité.
 */
var construireVertex = function () {
  return [
    'attribute vec3 aVertex;',
    'attribute vec3 aNormal;',
    'attribute vec3 aMaterial;',
    ShaderBase.strings.vertUniforms,
    'varying vec3 vVertex;',
    'varying vec3 vNormal;',
    'varying float vMasking;',
    'void main() {',
    '  vMasking = aMaterial.z;',
    '  vNormal = mix(aNormal, uEN * aNormal, vMasking);',
    '  vNormal = normalize(uN * vNormal);',
    '  vec4 vertex4 = vec4(aVertex, 1.0);',
    '  vertex4 = mix(vertex4, uEM * vertex4, vMasking);',
    // Position dans le repère de la caméra : c'est là que la profondeur se lit.
    '  vVertex = vec3(uMV * vertex4);',
    '  gl_Position = uMVP * vertex4;',
    '}'
  ].join('\n');
};

var construireFragment = function (inverse) {
  return [
    'varying vec3 vVertex;',
    'varying vec3 vNormal;',
    'uniform float uAlpha;',
    'uniform float uProche;',
    'uniform float uLoin;',
    ShaderBase.strings.fragColorUniforms,
    ShaderBase.strings.fragColorFunction,
    'void main() {',
    // La caméra regarde vers les z négatifs : la distance est donc -z.
    '  float d = -vVertex.z;',
    '  float t = clamp((d - uProche) / max(uLoin - uProche, 1e-4), 0.0, 1.0);',
    inverse ? '  float g = 1.0 - t;' : '  float g = t;',
    // Même chaîne de couleur que les autres rendus du moteur : on donne une
    // valeur en sRGB, il la linéarise puis la ré-encode à la fin. Sortir une
    // valeur linéaire donnerait des gris faux, et un dégradé qui ment.
    '  gl_FragColor = encodeFragColor(sRGBToLinear(vec3(g)), uAlpha);',
    '}'
  ].join('\n');
};

/** Les huit coins de la boîte englobante, réutilisés à chaque image. */
var _coin = [0, 0, 0];

/** Nombre de sommets échantillonnés pour mesurer l'épaisseur visible. */
var ECHANTILLONS = 3000;

/**
 * ── Où placer le noir et le blanc ─────────────────────────────────────────
 *
 * Première version : les huit coins de la boîte englobante. Résultat juste au
 * sens de la définition — le blanc était bien « l'autre extrémité derrière
 * l'objet » — mais **inutilisable** : d'un objet plein on ne voit que la moitié
 * avant, donc les gris visibles n'occupaient que la première moitié de
 * l'échelle. Tout se ressemblait.
 *
 * On mesure donc l'épaisseur de ce qui est RÉELLEMENT VU : on parcourt les
 * sommets tournés vers la caméra — normale dont la composante z est positive
 * dans le repère de la caméra — et on retient leurs distances extrêmes. Le point
 * le plus proche reçoit un bout de l'échelle, le point visible le plus lointain
 * l'autre bout. Toute la plage sert, quelle que soit la forme.
 *
 * Un sommet sur N seulement : sur cent mille sommets, trois mille suffisent
 * largement à encadrer une plage, et la mesure se refait à chaque image sans
 * qu'on le sente. Les extrêmes ainsi trouvés peuvent manquer le vrai maximum de
 * quelques millièmes — sans conséquence, le nuanceur borne de toute façon.
 */
var calerLesGris = function (mesh) {
  var mv = mesh.getMV();
  var n = mesh.getN();
  var v = mesh.getVertices();
  var no = mesh.getNormals();
  var nb = mesh.getNbVertices();

  var proche = Infinity;
  var loin = -Infinity;

  if (v && no && nb) {
    var pas = Math.max(1, Math.floor(nb / ECHANTILLONS));
    for (var i = 0; i < nb; i += pas) {
      var j = i * 3;
      // Composante z de la normale dans le repère de la caméra. La caméra
      // regarde vers les z négatifs : une normale tournée vers nous a donc
      // une composante z positive.
      var nz = n[2] * no[j] + n[5] * no[j + 1] + n[8] * no[j + 2];
      if (nz <= 0.0) continue;

      var d = -(mv[2] * v[j] + mv[6] * v[j + 1] + mv[10] * v[j + 2] + mv[14]);
      if (d < proche) proche = d;
      if (d > loin) loin = d;
    }
  }

  // Repli sur la boîte englobante si le maillage n'a pas livré ses sommets.
  if (proche === Infinity) {
    var b = mesh.getLocalBound();
    for (var k = 0; k < 8; ++k) {
      _coin[0] = (k & 1) ? b[3] : b[0];
      _coin[1] = (k & 2) ? b[4] : b[1];
      _coin[2] = (k & 4) ? b[5] : b[2];
      vec3.transformMat4(_coin, _coin, mv);
      var e = -_coin[2];
      if (e < proche) proche = e;
      if (e > loin) loin = e;
    }
  }

  // Une surface vue exactement de profil donnerait proche = loin, donc une
  // division par zéro et un aplat uniforme. On garde une épaisseur minimale.
  if (loin - proche < 1e-3) loin = proche + 1e-3;
  return [proche, loin];
};

var construireShader = function (version) {
  var shader = ShaderBase.getCopy();
  shader.vertexName = shader.fragmentName = 'ModelagixAnalyse' + version.shader;

  shader.uniforms = {};
  shader.attributes = {};
  shader.activeAttributes = { vertex: true, normal: true, material: true };

  shader.uniformNames = ['uProche', 'uLoin'];
  Array.prototype.push.apply(shader.uniformNames, ShaderBase.uniformNames.commonUniforms);

  shader.vertex = construireVertex();
  shader.fragment = construireFragment(version.inverse);

  shader.updateUniforms = function (mesh, main) {
    var gl = mesh.getGL();
    var plage = calerLesGris(mesh);
    gl.uniform1f(this.uniforms.uProche, plage[0]);
    gl.uniform1f(this.uniforms.uLoin, plage[1]);
    ShaderBase.updateUniforms.call(this, mesh, main);
  };

  return shader;
};

/**
 * Le fond de la vue, en blanc ou en noir selon la version.
 *
 * On remplace la texture d'un pixel que le moteur s'est fabriquée
 * (`Background.init`), et on garde l'ancienne pour la remettre. Rien d'autre
 * n'est touché : si l'utilisateur a chargé une IMAGE de fond, elle a la
 * priorité dans le moteur et reste affichée — l'analyse perd alors un peu de sa
 * netteté, mais on ne lui efface pas son décor sans le lui dire.
 */
var _fondOrigine = null;
var _grilleOrigine = null;

var poserLeFond = function (main, niveau) {
  var fond = main._background;
  if (!fond) return;

  if (niveau === null) {
    if (_fondOrigine) {
      fond._monoTex = _fondOrigine;
      _fondOrigine = null;
    }
    // Le sol retrouve l'état où l'utilisateur l'avait laissé.
    if (_grilleOrigine !== null) {
      main._showGrid = _grilleOrigine;
      _grilleOrigine = null;
    }
    return;
  }

  if (!_fondOrigine) _fondOrigine = fond._monoTex;
  fond._monoTex = fond.createOnePixelTexture(niveau, niveau, niveau, 255);

  // Le sol s'efface : ses lignes grises et ses deux axes colorés fausseraient
  // la lecture d'une image qui ne doit contenir que des distances. On retient
  // son état pour le rendre au retour — l'utilisateur ne doit pas retrouver sa
  // grille éteinte sans avoir rien demandé.
  if (_grilleOrigine === null) _grilleOrigine = main._showGrid;
  main._showGrid = false;
};

var MatiereAnalyse = {};

MatiereAnalyse.VERSIONS = VERSIONS;

/** Enregistre les deux rendus. Sans effet s'ils le sont déjà. */
MatiereAnalyse.installer = function (gui) {
  if (ShaderLib[Enums.Shader.ANALYSE_PROCHE_SOMBRE]) return false;

  var options = {};
  for (var i = 0; i < VERSIONS.length; ++i) {
    var v = VERSIONS[i];
    ShaderLib[v.shader] = construireShader(v);
    options[v.shader] = v.libelle;
  }

  // La liste déroulante des rendus du tiroir doit connaître les nouvelles
  // entrées, sinon elle afficherait un vide quand l'une d'elles est active.
  var ctrl = gui && gui._ctrlRendering && gui._ctrlRendering._ctrlShaders;
  if (ctrl && ctrl.addOptions) ctrl.addOptions(options);

  return true;
};

/** La version correspondant à une clé de matière, ou null. */
MatiereAnalyse.version = function (cle) {
  for (var i = 0; i < VERSIONS.length; ++i) {
    if (VERSIONS[i].cle === cle) return VERSIONS[i];
  }
  return null;
};

/** La version correspondant à un type de rendu, ou null. */
MatiereAnalyse.versionDuShader = function (type) {
  for (var i = 0; i < VERSIONS.length; ++i) {
    if (VERSIONS[i].shader === type) return VERSIONS[i];
  }
  return null;
};

/**
 * Applique le fond qui convient au rendu courant.
 * À appeler après tout changement de matière.
 */
MatiereAnalyse.accorderLeFond = function (main) {
  var mesh = main.getMesh();
  var version = mesh ? MatiereAnalyse.versionDuShader(mesh.getShaderType()) : null;
  poserLeFond(main, version ? version.fond : null);
};

export default MatiereAnalyse;
