/**
 * MODELAGIX — export GLB (glTF binaire)
 *
 * SculptGL exporte en OBJ, PLY, STL et SGL, mais pas en glTF. Ce fichier ajoute
 * le format GLB, qui est le format d'échange courant pour la 3D sur le web :
 * un seul fichier, géométrie et matière comprises, lisible par la plupart des
 * visionneuses et par Blender.
 *
 * Rien n'est modifié dans le moteur : on lui demande simplement ses données
 * fusionnées, comme le fait l'export STL d'origine, et on les met en forme.
 *
 * Repère : glTF et SculptGL utilisent la même convention — repère direct, Y
 * vers le haut. Aucune conversion d'axes n'est nécessaire.
 */

import Remesh from 'editing/Remesh';

// Constantes du format glTF 2.0
var FLOAT = 5126;
var UNSIGNED_INT = 5125;
var ARRAY_BUFFER = 34962;
var ELEMENT_ARRAY_BUFFER = 34963;

var MAGIC_GLTF = 0x46546c67; // 'glTF'
var CHUNK_JSON = 0x4e4f534a; // 'JSON'
var CHUNK_BIN = 0x004e4942; // 'BIN\0'

/**
 * Normales par sommet, moyennées sur les faces adjacentes.
 * Sans elles, les visionneuses calculent des normales par face et la sculpture
 * apparaît à facettes.
 */
var calculerNormales = function (vertices, triangles, nbVertices, nbTriangles) {
  var normales = new Float32Array(nbVertices * 3);

  for (var i = 0; i < nbTriangles; ++i) {
    var t = i * 3;
    var a = triangles[t] * 3;
    var b = triangles[t + 1] * 3;
    var c = triangles[t + 2] * 3;

    var ax = vertices[b] - vertices[a];
    var ay = vertices[b + 1] - vertices[a + 1];
    var az = vertices[b + 2] - vertices[a + 2];
    var bx = vertices[c] - vertices[a];
    var by = vertices[c + 1] - vertices[a + 1];
    var bz = vertices[c + 2] - vertices[a + 2];

    // Produit vectoriel : non normalisé, donc pondéré par l'aire de la face.
    var nx = ay * bz - az * by;
    var ny = az * bx - ax * bz;
    var nz = ax * by - ay * bx;

    normales[a] += nx; normales[a + 1] += ny; normales[a + 2] += nz;
    normales[b] += nx; normales[b + 1] += ny; normales[b + 2] += nz;
    normales[c] += nx; normales[c + 1] += ny; normales[c + 2] += nz;
  }

  for (var j = 0; j < nbVertices; ++j) {
    var k = j * 3;
    var x = normales[k], y = normales[k + 1], z = normales[k + 2];
    var len = Math.sqrt(x * x + y * y + z * z);
    if (len > 0) {
      normales[k] = x / len;
      normales[k + 1] = y / len;
      normales[k + 2] = z / len;
    } else {
      normales[k + 1] = 1; // sommet isolé : normale arbitraire mais valide
    }
  }

  return normales;
};

/** Étend un nombre au multiple de 4 supérieur (le format l'exige). */
var aligner4 = function (n) {
  return (n + 3) & ~3;
};

/**
 * Construit un fichier GLB à partir des objets donnés.
 * @param  {Array}  meshes  objets 3D à exporter
 * @return {Blob}           le fichier, prêt à être téléchargé
 */
var exportGLB = function (meshes) {
  var res = Remesh.mergeArrays(meshes, {
    vertices: null,
    colors: null,
    triangles: null
  });

  var vertices = res.vertices;
  var couleurs = res.colors;
  var triangles = res.triangles;
  var nbVertices = res.nbVertices;
  var nbTriangles = res.nbTriangles;

  var normales = calculerNormales(vertices, triangles, nbVertices, nbTriangles);

  // Le format impose les bornes de la position — les visionneuses s'en servent
  // pour cadrer la vue à l'ouverture.
  var min = [Infinity, Infinity, Infinity];
  var max = [-Infinity, -Infinity, -Infinity];
  for (var i = 0; i < nbVertices; ++i) {
    for (var a = 0; a < 3; ++a) {
      var v = vertices[i * 3 + a];
      if (v < min[a]) min[a] = v;
      if (v > max[a]) max[a] = v;
    }
  }
  if (nbVertices === 0) {
    min = [0, 0, 0];
    max = [0, 0, 0];
  }

  // --- Assemblage du bloc binaire -------------------------------------
  // Ordre : indices, positions, normales, couleurs.
  // Chaque tableau fait un nombre d'octets multiple de 4, donc les décalages
  // restent alignés sans remplissage intermédiaire.
  var octetsIndices = triangles.byteLength;
  var octetsPositions = vertices.byteLength;
  var octetsNormales = normales.byteLength;
  var octetsCouleurs = couleurs.byteLength;

  var decalageIndices = 0;
  var decalagePositions = decalageIndices + octetsIndices;
  var decalageNormales = decalagePositions + octetsPositions;
  var decalageCouleurs = decalageNormales + octetsNormales;
  var tailleBin = decalageCouleurs + octetsCouleurs;

  var bin = new Uint8Array(aligner4(tailleBin));
  bin.set(new Uint8Array(triangles.buffer, triangles.byteOffset, octetsIndices), decalageIndices);
  bin.set(new Uint8Array(vertices.buffer, vertices.byteOffset, octetsPositions), decalagePositions);
  bin.set(new Uint8Array(normales.buffer, normales.byteOffset, octetsNormales), decalageNormales);
  bin.set(new Uint8Array(couleurs.buffer, couleurs.byteOffset, octetsCouleurs), decalageCouleurs);

  // --- Description glTF ------------------------------------------------
  var gltf = {
    asset: {
      version: '2.0',
      generator: 'MODELAGIX'
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'sculpture' }],
    meshes: [{
      name: 'sculpture',
      primitives: [{
        attributes: { POSITION: 1, NORMAL: 2, COLOR_0: 3 },
        indices: 0,
        material: 0
      }]
    }],
    materials: [{
      name: 'matiere',
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, 1],
        metallicFactor: 0,
        roughnessFactor: 0.7
      }
    }],
    accessors: [{
      bufferView: 0,
      componentType: UNSIGNED_INT,
      count: nbTriangles * 3,
      type: 'SCALAR'
    }, {
      bufferView: 1,
      componentType: FLOAT,
      count: nbVertices,
      type: 'VEC3',
      min: min,
      max: max
    }, {
      bufferView: 2,
      componentType: FLOAT,
      count: nbVertices,
      type: 'VEC3'
    }, {
      bufferView: 3,
      componentType: FLOAT,
      count: nbVertices,
      type: 'VEC3',
      normalized: false
    }],
    bufferViews: [{
      buffer: 0,
      byteOffset: decalageIndices,
      byteLength: octetsIndices,
      target: ELEMENT_ARRAY_BUFFER
    }, {
      buffer: 0,
      byteOffset: decalagePositions,
      byteLength: octetsPositions,
      target: ARRAY_BUFFER
    }, {
      buffer: 0,
      byteOffset: decalageNormales,
      byteLength: octetsNormales,
      target: ARRAY_BUFFER
    }, {
      buffer: 0,
      byteOffset: decalageCouleurs,
      byteLength: octetsCouleurs,
      target: ARRAY_BUFFER
    }],
    buffers: [{ byteLength: tailleBin }]
  };

  // --- Conteneur GLB ---------------------------------------------------
  var texteJson = JSON.stringify(gltf);
  var octetsJson = new TextEncoder().encode(texteJson);
  var tailleJson = aligner4(octetsJson.length);

  var jsonRempli = new Uint8Array(tailleJson);
  jsonRempli.fill(0x20); // le remplissage du JSON se fait avec des espaces
  jsonRempli.set(octetsJson);

  var tailleTotale = 12 + 8 + tailleJson + 8 + bin.length;
  var fichier = new Uint8Array(tailleTotale);
  var vue = new DataView(fichier.buffer);
  var pos = 0;

  vue.setUint32(pos, MAGIC_GLTF, true); pos += 4;
  vue.setUint32(pos, 2, true); pos += 4; // version du format
  vue.setUint32(pos, tailleTotale, true); pos += 4;

  vue.setUint32(pos, tailleJson, true); pos += 4;
  vue.setUint32(pos, CHUNK_JSON, true); pos += 4;
  fichier.set(jsonRempli, pos); pos += tailleJson;

  vue.setUint32(pos, bin.length, true); pos += 4;
  vue.setUint32(pos, CHUNK_BIN, true); pos += 4;
  fichier.set(bin, pos);

  return new Blob([fichier], { type: 'model/gltf-binary' });
};

export default exportGLB;
