/**
 * MODELAGIX — les tampons apportés par l'utilisateur
 *
 * Une image quelconque devient un tampon : on n'en garde que la luminance, un
 * octet par pixel, ce qui est exactement ce que le moteur attend
 * (`Picking.addAlpha`). Le blanc marque l'endroit où l'outil agit à pleine
 * force, le noir là où il n'agit pas.
 *
 * ── Pourquoi on ne se contente pas de l'import du moteur ──────────────────
 * Le moteur sait déjà charger une image alpha (`alphaopen`), mais elle est
 * perdue au rechargement de la page. Un élève qui prépare ses empreintes en
 * début de séance les retrouve vides à la reprise. On les CONSERVE donc.
 *
 * ── Où on les conserve, et pourquoi pas ailleurs ─────────────────────────
 * Dans le stockage local du navigateur. Ce n'est pas un choix par défaut :
 *   - il survit au rechargement et à la fermeture de l'onglet ;
 *   - il ne demande ni compte, ni serveur, ni autorisation ;
 *   - il est propre à ce navigateur et à cet ordinateur, ce qui est cohérent
 *     avec une application qui n'envoie rien nulle part.
 *
 * Sa limite est étroite — quelques mégaoctets — d'où la réduction à 128 × 128
 * ci-dessous : chaque tampon pèse alors une dizaine de kilooctets, et la
 * collection tient sans qu'on ait à compter.
 *
 * ── Ce qui est stocké ────────────────────────────────────────────────────
 * L'image RÉDUITE en niveaux de gris, encodée en PNG. Pas l'image d'origine :
 * elle peut peser plusieurs mégaoctets pour un résultat identique une fois
 * ramenée à 128 pixels.
 */

import Picking from 'math3d/Picking';

var CLE = 'modelagix.tampons';
var COTE = 128;

/** Les tampons importés, tels qu'ils sont conservés : [{nom, png}, …]. */
var lire = function () {
  try {
    var brut = window.localStorage.getItem(CLE);
    var liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste : [];
  } catch (e) {
    // Stockage refusé (navigation privée sur certains navigateurs) : on
    // continue sans conserver, plutôt que d'empêcher l'application de démarrer.
    window.console.warn('MODELAGIX — tampons : lecture impossible (' + e.message + ')');
    return [];
  }
};

var ecrire = function (liste) {
  try {
    window.localStorage.setItem(CLE, JSON.stringify(liste));
    return true;
  } catch (e) {
    window.console.warn('MODELAGIX — tampons : conservation impossible (' + e.message + ')');
    return false;
  }
};

/**
 * Réduit une image à COTE × COTE en niveaux de gris.
 * @return {Object} { u8, png } — le tableau pour le moteur, l'image pour le
 *   stockage.
 */
var reduire = function (image) {
  var can = document.createElement('canvas');
  can.width = can.height = COTE;
  var ctx = can.getContext('2d');

  // Fond noir : une image à fond transparent doit donner un tampon sans effet
  // là où elle est transparente, pas un tampon à pleine force.
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, COTE, COTE);
  ctx.drawImage(image, 0, 0, COTE, COTE);

  var donnees = ctx.getImageData(0, 0, COTE, COTE);
  var px = donnees.data;
  var u8 = new Uint8Array(COTE * COTE);

  for (var i = 0; i < COTE * COTE; ++i) {
    var d = i * 4;
    // Luminance perçue, et non une moyenne : un rouge vif et un bleu vif n'ont
    // pas du tout le même poids pour l'œil, ni pour un relief.
    var v = 0.2126 * px[d] + 0.7152 * px[d + 1] + 0.0722 * px[d + 2];
    // La transparence compte comme du noir.
    v = v * (px[d + 3] / 255);
    u8[i] = Math.round(v);
    px[d] = px[d + 1] = px[d + 2] = u8[i];
    px[d + 3] = 255;
  }

  ctx.putImageData(donnees, 0, 0);
  return { u8: u8, png: can.toDataURL('image/png') };
};

/** Un nom qui n'entre pas en collision avec ceux déjà pris. */
var nomLibre = function (souhaite) {
  var nom = souhaite;
  var n = 2;
  while (Picking.ALPHAS_NAMES && Picking.ALPHAS_NAMES[nom] !== undefined) {
    nom = souhaite + ' ' + n;
    ++n;
  }
  return nom;
};

var TamponsImportes = {};

/**
 * Déclare un tampon au moteur et à la liste du tiroir.
 * @return {string} le nom réellement retenu
 */
TamponsImportes.declarer = function (gui, nom, u8) {
  var retenu = Picking.addAlpha(u8, COTE, COTE, nom)._name;
  if (gui && gui.addAlphaOptions) {
    var entree = {};
    entree[retenu] = retenu;
    gui.addAlphaOptions(entree);
  }
  return retenu;
};

/**
 * Recharge les tampons conservés lors des séances précédentes.
 * Le décodage d'une image est asynchrone : les tampons apparaissent donc
 * quelques dizaines de millisecondes après le reste, ce qui ne se voit pas.
 * @return {number} le nombre de tampons en attente de décodage
 */
TamponsImportes.restaurer = function (gui) {
  var liste = lire();
  for (var i = 0; i < liste.length; ++i) {
    (function (entree) {
      var img = new window.Image();
      img.onload = function () {
        TamponsImportes.declarer(gui, entree.nom, reduire(img).u8);
      };
      img.src = entree.png;
    })(liste[i]);
  }
  return liste.length;
};

/**
 * Importe une image et en fait un tampon conservé.
 * @param {File} fichier
 * @param {Function} quandPret  reçoit le nom retenu, ou null en cas d'échec
 */
TamponsImportes.importer = function (gui, fichier, quandPret) {
  if (!fichier || !/^image\//.test(fichier.type)) {
    if (quandPret) quandPret(null, 'Ce fichier n\'est pas une image.');
    return;
  }

  var lecteur = new window.FileReader();
  lecteur.onload = function () {
    var img = new window.Image();
    img.onload = function () {
      var reduit = reduire(img);
      // Le nom du fichier, sans son extension : c'est ce que l'utilisateur
      // reconnaîtra dans la liste.
      var souhaite = fichier.name.replace(/\.[^.]+$/, '').slice(0, 28) || 'Tampon';
      var nom = nomLibre(souhaite);

      TamponsImportes.declarer(gui, nom, reduit.u8);

      var liste = lire();
      liste.push({ nom: nom, png: reduit.png });
      if (!ecrire(liste)) {
        if (quandPret) quandPret(nom, 'Tampon ajouté, mais non conservé : la ' +
          'mémoire du navigateur est pleine ou refusée.');
        return;
      }
      if (quandPret) quandPret(nom, null);
    };
    img.onerror = function () {
      if (quandPret) quandPret(null, 'Cette image n\'a pas pu être lue.');
    };
    img.src = lecteur.result;
  };
  lecteur.onerror = function () {
    if (quandPret) quandPret(null, 'Ce fichier n\'a pas pu être lu.');
  };
  lecteur.readAsDataURL(fichier);
};

/** Les noms des tampons importés, dans l'ordre où ils ont été ajoutés. */
TamponsImportes.lister = function () {
  return lire().map(function (e) { return e.nom; });
};

/**
 * Oublie un tampon conservé.
 *
 * Le moteur n'a pas de quoi retirer un alpha de sa collection : le tampon
 * reste donc disponible jusqu'au prochain rechargement, où il ne reviendra
 * plus. On le dit à l'utilisateur plutôt que de faire semblant.
 */
TamponsImportes.oublier = function (nom) {
  var liste = lire().filter(function (e) { return e.nom !== nom; });
  return ecrire(liste);
};

export default TamponsImportes;
