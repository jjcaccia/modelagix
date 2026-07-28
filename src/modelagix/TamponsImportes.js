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
 * Le thème d'un fichier : le nom du dossier qui le contient.
 *
 * Quand on importe un DOSSIER, le navigateur donne pour chaque fichier son
 * chemin relatif (`webkitRelativePath`), par exemple
 * « Écailles/serpent-03.png ». Le dossier immédiat devient donc le thème, sans
 * que l'utilisateur ait à saisir quoi que ce soit : il a déjà rangé ses images,
 * on se contente de lire son rangement.
 *
 * Choisir le dossier IMMÉDIAT et non le premier : en sélectionnant un dossier
 * parent qui contient plusieurs dossiers thématiques, on obtient un thème par
 * sous-dossier — ce qui est justement ce qu'on veut.
 */
var themeDe = function (fichier) {
  var chemin = fichier.webkitRelativePath || '';
  var morceaux = chemin.split('/');
  // [dossier choisi, …, sous-dossier, fichier] : l'avant-dernier est le bon.
  if (morceaux.length >= 2) return morceaux[morceaux.length - 2];
  return null;
};

/**
 * Transforme UNE image en tampon, sans rien conserver.
 * @param {Function} suite  reçoit ({nom, png}) ou (null, message)
 */
var fabriquer = function (gui, fichier, suite) {
  if (!fichier || !/^image\//.test(fichier.type)) {
    suite(null, fichier ? fichier.name + ' n\'est pas une image.' : 'Fichier absent.');
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
      suite({ nom: nom, png: reduit.png, theme: themeDe(fichier) }, null);
    };
    img.onerror = function () { suite(null, fichier.name + ' n\'a pas pu être lue.'); };
    img.src = lecteur.result;
  };
  lecteur.onerror = function () { suite(null, fichier.name + ' n\'a pas pu être lu.'); };
  lecteur.readAsDataURL(fichier);
};

/**
 * Importe une image et en fait un tampon conservé.
 * @param {File} fichier
 * @param {Function} quandPret  reçoit (nom, souci)
 */
TamponsImportes.importer = function (gui, fichier, quandPret) {
  TamponsImportes.importerPlusieurs(gui, [fichier], function (bilan) {
    if (quandPret) quandPret(bilan.dernier, bilan.souci);
  });
};

/**
 * Importe une série d'images — plusieurs fichiers, ou tout un dossier.
 *
 * ── Pourquoi une à la fois ────────────────────────────────────────────────
 * Le décodage d'une image est asynchrone. Les lancer toutes ensemble ferait
 * tenir en mémoire autant d'images décodées que de fichiers : un dossier de
 * deux cents photographies en pleine résolution suffirait à faire tomber
 * l'onglet. On les enchaîne donc, ce qui coûte quelques dixièmes de seconde et
 * ne risque rien.
 *
 * ── La place disponible ───────────────────────────────────────────────────
 * La mémoire du navigateur est étroite — quelques mégaoctets. Réduits à
 * 128 × 128, les tampons y tiennent par centaines, mais pas indéfiniment.
 * Quand elle est pleine, on s'arrête et on DIT combien ont été conservés : les
 * tampons déjà ajoutés restent utilisables pour la séance en cours.
 *
 * @param {Array} fichiers
 * @param {Function} quandPret  reçoit un bilan
 *   { ajoutes, conserves, ignores, dernier, themes, souci }
 */
TamponsImportes.importerPlusieurs = function (gui, fichiers, quandPret) {
  var liste = Array.prototype.slice.call(fichiers || []);
  var bilan = { ajoutes: 0, conserves: 0, ignores: 0, dernier: null, themes: [], souci: null };
  var conserves = lire();
  var pleine = false;

  var suivant = function (i) {
    if (i >= liste.length) {
      if (bilan.ignores && !bilan.souci) {
        bilan.souci = bilan.ignores + ' fichier(s) ignoré(s) : ce n\'étaient pas ' +
          'des images.';
      }
      if (quandPret) quandPret(bilan);
      return;
    }

    fabriquer(gui, liste[i], function (tampon, souci) {
      if (!tampon) {
        bilan.ignores++;
        return suivant(i + 1);
      }

      bilan.ajoutes++;
      bilan.dernier = tampon.nom;
      if (tampon.theme && bilan.themes.indexOf(tampon.theme) === -1) {
        bilan.themes.push(tampon.theme);
      }

      if (!pleine) {
        conserves.push({ nom: tampon.nom, png: tampon.png, theme: tampon.theme });
        if (ecrire(conserves)) {
          bilan.conserves++;
        } else {
          // On retire l'entrée qui n'a pas pu être écrite, sinon la liste en
          // mémoire et celle qui est conservée divergeraient.
          conserves.pop();
          pleine = true;
          bilan.souci = 'La mémoire du navigateur est pleine : ' +
            bilan.conserves + ' tampon(s) conservé(s) pour les prochaines ' +
            'séances, les autres ne valent que pour celle-ci.';
        }
      }
      suivant(i + 1);
    });
  };

  suivant(0);
};

/** Le thème d'un tampon importé, ou null. */
TamponsImportes.themeDuTampon = function (nom) {
  var trouve = lire().filter(function (e) { return e.nom === nom; })[0];
  return trouve ? (trouve.theme || null) : null;
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
