/**
 * MODELAGIX — collection de tampons
 *
 * Le moteur n'en fournit que deux. On en ajoute douze, couvrant les usages
 * courants du modelage : empreintes géométriques, textures de surface,
 * accidents de matière.
 *
 * **Tous sont calculés**, aucun n'est une image reprise ailleurs : pas de
 * question de droits, et le fichier reste léger. Chacun est dessiné en niveaux
 * de gris, où le blanc marque l'endroit où l'outil agit à pleine force.
 *
 * Le moteur ne conserve d'un tampon que sa luminance, un octet par pixel
 * (`Picking.addAlpha`). On lui fournit donc directement ce tableau.
 */

import Picking from 'math3d/Picking';

var COTE = 128;

/** Distance au bord la plus proche, ramenée entre 0 et 1 (0 au centre). */
var lisser = function (v) {
  v = Math.max(0, Math.min(1, v));
  return v * v * (3 - 2 * v); // adoucissement classique, sans angle
};

/**
 * Chaque motif reçoit des coordonnées centrées entre -1 et 1 et rend une
 * intensité entre 0 et 1.
 */
var MOTIFS = [{
  nom: 'Cercle doux',
  f: function (x, y) { return lisser(1 - Math.sqrt(x * x + y * y)); }
}, {
  nom: 'Cercle net',
  f: function (x, y) {
    var d = Math.sqrt(x * x + y * y);
    return lisser((0.86 - d) * 12);
  }
}, {
  nom: 'Carré doux',
  f: function (x, y) { return lisser(1 - Math.max(Math.abs(x), Math.abs(y))); }
}, {
  nom: 'Carré net',
  f: function (x, y) { return lisser((0.82 - Math.max(Math.abs(x), Math.abs(y))) * 12); }
}, {
  nom: 'Hexagone',
  f: function (x, y) {
    // Distance hexagonale : maximum des projections sur trois directions.
    var d = 0;
    for (var k = 0; k < 3; ++k) {
      var a = k * Math.PI / 3;
      d = Math.max(d, Math.abs(x * Math.cos(a) + y * Math.sin(a)));
    }
    return lisser((0.78 - d) * 10);
  }
}, {
  nom: 'Triangle',
  f: function (x, y) {
    var d = 0;
    for (var k = 0; k < 3; ++k) {
      var a = k * 2 * Math.PI / 3 - Math.PI / 2;
      d = Math.max(d, x * Math.cos(a) + y * Math.sin(a));
    }
    return lisser((0.5 - d) * 9);
  }
}, {
  nom: 'Étoile',
  f: function (x, y) {
    var r = Math.sqrt(x * x + y * y);
    var a = Math.atan2(y, x);
    var rayon = 0.45 + 0.42 * Math.cos(5 * a);
    return lisser((rayon - r) * 9);
  }
}, {
  nom: 'Rayures',
  f: function (x, y) {
    var d = Math.sqrt(x * x + y * y);
    var bande = 0.5 + 0.5 * Math.cos((x + y) * 14);
    return lisser((1 - d) * 2.4) * lisser(bande * 2.2 - 0.6);
  }
}, {
  nom: 'Damier',
  f: function (x, y) {
    var d = Math.sqrt(x * x + y * y);
    var c = (Math.floor((x + 1) * 4) + Math.floor((y + 1) * 4)) % 2;
    return lisser((1 - d) * 2.4) * (c ? 1 : 0.12);
  }
}, {
  nom: 'Grain',
  f: function (x, y) {
    var d = Math.sqrt(x * x + y * y);
    // Bruit reproductible : une sinusoïde à haute fréquence, sans hasard, pour
    // que le tampon soit identique d'une session à l'autre.
    var n = Math.sin(x * 97.3 + y * 61.7) * Math.sin(x * 43.1 - y * 79.9);
    return lisser((1 - d) * 2.4) * lisser(n * 1.6 + 0.55);
  }
}, {
  nom: 'Écailles',
  f: function (x, y) {
    var d = Math.sqrt(x * x + y * y);
    var u = x * 3.2, v = y * 3.2;
    var ligne = Math.floor(v);
    if (ligne % 2) u += 0.5;
    var du = u - Math.floor(u) - 0.5;
    var dv = v - Math.floor(v) - 0.5;
    var e = 1 - Math.sqrt(du * du + dv * dv) * 2.1;
    return lisser((1 - d) * 2.4) * lisser(e * 2.4);
  }
}, {
  nom: 'Craquelures',
  f: function (x, y) {
    var d = Math.sqrt(x * x + y * y);
    var a = Math.abs(Math.sin(x * 9.1 + Math.cos(y * 5.3) * 2.2));
    var b = Math.abs(Math.sin(y * 7.7 - Math.cos(x * 6.1) * 1.9));
    var veine = 1 - Math.min(a, b) * 5;
    return lisser((1 - d) * 2.4) * lisser(veine);
  }
}];

/**
 * Construit et enregistre les tampons.
 * @param {Object} gui  l'interface d'origine, prévenue pour que sa liste suive
 * @return {Array} les noms réellement ajoutés
 */
var installer = function (gui) {
  var ajoutes = [];

  for (var i = 0; i < MOTIFS.length; ++i) {
    var motif = MOTIFS[i];
    var u8 = new Uint8Array(COTE * COTE);

    for (var py = 0; py < COTE; ++py) {
      var y = (py + 0.5) / COTE * 2 - 1;
      for (var px = 0; px < COTE; ++px) {
        var x = (px + 0.5) / COTE * 2 - 1;
        var v = motif.f(x, y);
        u8[py * COTE + px] = Math.round(255 * Math.max(0, Math.min(1, v)));
      }
    }

    var nom = Picking.addAlpha(u8, COTE, COTE, motif.nom)._name;
    ajoutes.push(nom);

    // Le moteur tient sa propre liste déroulante : on l'en informe, sinon nos
    // tampons existeraient sans être proposés dans le tiroir.
    if (gui && gui.addAlphaOptions) {
      var entree = {};
      entree[nom] = nom;
      gui.addAlphaOptions(entree);
    }
  }

  return ajoutes;
};

export default { installer: installer, COTE: COTE };
