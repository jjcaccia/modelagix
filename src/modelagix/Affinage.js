/**
 * MODELAGIX — affiner le maillage, au clic
 *
 * Densifier localement sans rien déformer. C'est le geste qu'on fait avant de
 * poser un détail : « ici, il me faut de la matière plus fine ».
 *
 * ── Pourquoi ce n'est plus l'astuce d'avant ───────────────────────────────
 *
 * La première version détournait le pinceau Creuser avec une force nulle : la
 * topologie dynamique affine ce que le pinceau touche, et une force nulle
 * supprime la déformation. Ingénieux, mais faux sur deux points, tous deux
 * signalés par Jean-Jacques à l'usage.
 *
 * **1. Un clic ne faisait rien.** `SculptBase.sculptStroke()` compare la
 * position de la souris à la précédente et sort si la distance est inférieure à
 * l'espacement minimal. Or `start()` vient d'égaler les deux : la distance vaut
 * zéro, et le premier appel ne fait rien. Il faut bouger pour que quoi que ce
 * soit se produise — pour TOUS les outils du moteur, mais cela ne se remarque
 * que sur celui-ci, où le geste naturel est de cliquer.
 *
 * **2. Un pinceau plus large affinait MOINS.** Là aussi c'est dans le moteur :
 *
 *     d2Max = radius2 * (1.1 - subFactor) * 0.2
 *     d2Min = (d2Max / 4.2025) * decFactor
 *
 * La taille d'arête visée est proportionnelle au CARRÉ DU RAYON du pinceau.
 * Grand pinceau, grande arête visée : non seulement il subdivise moins, mais la
 * décimation, elle, passe derrière et SUPPRIME les arêtes plus courtes que
 * `d2Min`. Un grand pinceau rendait donc le maillage plus grossier. L'effet
 * inverse, exactement comme observé.
 *
 * ── Ce que fait cette version ─────────────────────────────────────────────
 *
 * Elle n'emprunte plus le chemin du pinceau. À chaque clic :
 *
 *   1. on désigne la face sous le curseur ;
 *   2. on ramasse les sommets dans le rayon du pinceau ;
 *   3. on mesure l'arête moyenne DANS CETTE ZONE ;
 *   4. on subdivise avec pour cible une fraction de cette moyenne.
 *
 * Le rayon ne commande donc plus que l'ÉTENDUE de la zone traitée. La finesse,
 * elle, se règle en cliquant : chaque clic divise l'arête moyenne par environ
 * deux, et l'on s'arrête quand c'est assez fin. Aucune décimation n'intervient.
 *
 * ── Le garde-fou ──────────────────────────────────────────────────────────
 *
 * Rien n'empêcherait de cliquer trente fois et de faire exploser le maillage.
 * On refuse donc de descendre sous un millième de la diagonale de l'objet, et
 * au-delà d'un million de faces. Refuser en le DISANT, plutôt que de laisser la
 * machine se figer sans explication.
 */

import Enums from 'misc/Enums';

/** Fraction de l'arête moyenne visée à chaque clic. */
var FINESSE = 0.30;
/**
 * Mailles visées en travers du rayon du pinceau, pour un tampon.
 *
 * Quarante-cinq de rayon, donc quatre-vingt-dix de part en part. J'avais posé
 * dix-huit, en me disant qu'une quarantaine de mailles en travers suffirait à
 * lire un motif : à l'usage, Jean-Jacques le trouve très insuffisant, et une
 * empreinte de tampon porte bien plus de détail qu'un relief modelé à la main.
 */
/**
 * Réglable par le curseur « Détail » de la barre des paramètres.
 * 45 correspond au milieu de la course, valeur qui a servi aux mesures.
 */
var MAILLES_PAR_RAYON = 45;
/** Bornes de la course du curseur, en mailles par rayon. */
var MAILLES_MINIMUM = 15;
var MAILLES_MAXIMUM = 90;
/**
 * En dessous de cette valeur du tampon, on ne densifie pas.
 *
 * Pas zéro : un dégradé qui s'éteint doucement mérite encore de la matière fine
 * sur son bord, sinon la transition se voit.
 */
var SEUIL_TAMPON = 0.02;
/**
 * Arête minimale admise, en proportion de la diagonale de l'objet.
 *
 * Elle était à quatre dix-millièmes. Pour un GRAND pinceau, la cible
 * `rayon / 45` reste bien au-dessus et le plancher ne sert à rien ; pour un
 * PETIT, elle passe dessous et c'est le plancher qui décide. La finesse cessait
 * donc de suivre la taille de l'outil dès qu'on travaillait en détail —
 * exactement ce que Jean-Jacques signale.
 *
 * Six cent-millièmes : sur une pièce de dix centimètres, six centièmes de
 * millimètre. C'est en deçà de ce qu'une imprimante rendra jamais, donc ce
 * n'est plus le plancher qui limite, mais le plafond de faces — lequel, lui,
 * protège vraiment de quelque chose.
 */
var ARETE_PLANCHER = 0.00006;
/**
 * Au-delà, on refuse : la machine ne suivrait plus.
 *
 * Le contrôle a lieu AVANT la passe, et une seule passe à grand rayon peut
 * ajouter près d'un million de faces — mesuré. Le plafond est donc placé bas
 * pour que le dépassement reste absorbable.
 */
var FACES_MAXIMUM = 1200000;

class Affinage {

  constructor(main) {
    this._main = main;
    this._actif = false;
    this._enCours = false;
    this._dernierX = 0;
    this._dernierY = 0;
    this._prevenir = null;

    var canevas = main.getCanvas();
    // À la CAPTURE, comme pour « Déplacer la vue » : le moteur ne doit pas voir
    // ce clic, sinon il démarre son propre coup de pinceau par-dessus le nôtre.
    canevas.addEventListener('mousedown', this._surDescente.bind(this), true);
    window.addEventListener('mousemove', this._surDeplacement.bind(this), false);
    window.addEventListener('mouseup', this._surRemontee.bind(this), false);
  }

  /**
   * Qui prévenir après chaque passe.
   *
   * ── Pourquoi c'est indispensable ────────────────────────────────────────
   * Densifier ne se VOIT pas : la forme ne bouge pas d'un cheveu, et le
   * maillage n'est pas affiché. Le seul témoin est le décompte des faces en bas
   * à droite — qui ne se rafraîchit que lorsque la façade prévient les barres.
   * Sans cet appel, on clique, quelque chose se passe, et rien au monde ne le
   * dit. Jean-Jacques a conclu que l'outil était en panne, et il avait raison
   * de le conclure : un outil dont on ne peut pas constater l'effet EST en
   * panne, quoi qu'il fasse en mémoire.
   */
  surChangement(callback) {
    this._prevenir = callback;
  }

  /**
   * Finesse visée, en mailles par rayon de pinceau.
   *
   * @param {number} niveau  0 à 100, la course du curseur « Détail »
   */
  reglerLaFinesse(niveau) {
    var t = Math.max(0, Math.min(100, niveau)) / 100;
    MAILLES_PAR_RAYON = MAILLES_MINIMUM + (MAILLES_MAXIMUM - MAILLES_MINIMUM) * t;
  }

  /** @return {number} 0 à 100 */
  finesse() {
    return Math.round((MAILLES_PAR_RAYON - MAILLES_MINIMUM) /
      (MAILLES_MAXIMUM - MAILLES_MINIMUM) * 100);
  }

  estActif() {
    return this._actif;
  }

  activer(actif) {
    this._actif = !!actif;
    if (this._actif) this._avertiTropLourd = false;
    var canevas = this._main.getCanvas();
    if (this._actif) {
      this._curseurAvant = canevas.style.cursor;
      canevas.style.cursor = 'cell';
    } else {
      canevas.style.cursor = this._curseurAvant || '';
    }
    return this._actif;
  }

  basculer() {
    return this.activer(!this._actif);
  }

  // -----------------------------------------------------------------

  _surDescente(event) {
    if (!this._actif || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();

    // ── Il faut poser la position soi-même ──────────────────────────────
    //
    // On écoute à la CAPTURE, donc AVANT le moteur : `main._mouseX` contient
    // encore la position du survol précédent, et le premier clic après un
    // déplacement de la souris affinait au mauvais endroit — ou nulle part.
    // C'est ce qui faisait qu'un clic ne produisait rien du tout.
    //
    // `setMousePosition` est la méthode du moteur : on l'appelle plutôt que de
    // refaire son calcul, qui tient compte du rapport de pixels et du décalage
    // du canevas.
    this._main.setMousePosition(event);

    this._enCours = true;
    this._dernierX = this._main._mouseX;
    this._dernierY = this._main._mouseY;
    this.affinerSousLeCurseur();
  }

  /**
   * Le glissement fonctionne aussi, mais espacé : sans cela une traînée lente
   * subdiviserait cinquante fois le même endroit.
   */
  _surDeplacement(event) {
    if (!this._actif || !this._enCours) return;
    var main = this._main;
    main.setMousePosition(event);
    var dx = main._mouseX - this._dernierX;
    var dy = main._mouseY - this._dernierY;
    var rayon = main.getSculptManager().getCurrentTool().getScreenRadius() || 40;
    if (dx * dx + dy * dy < rayon * rayon * 0.25) return;
    this._dernierX = main._mouseX;
    this._dernierY = main._mouseY;
    this.affinerSousLeCurseur();
  }

  _surRemontee() {
    this._enCours = false;
  }

  // -----------------------------------------------------------------

  /**
   * Une passe d'affinage à l'endroit du curseur.
   * @return {string} 'fait' | 'rien' | 'assez-fin' | 'trop-lourd'
   */
  affinerSousLeCurseur() {
    var main = this._main;
    var picking = main.getPicking();

    if (!picking.intersectionMouseMeshes()) return 'rien';
    var maillage = picking.getMesh();
    if (!maillage) return 'rien';

    if (maillage.getNbFaces() >= FACES_MAXIMUM) {
      // Une fois, pas à chaque clic : refuser en silence laisse croire à une
      // panne, mais le répéter à chaque clic devient une brimade.
      if (!this._avertiTropLourd) {
        this._avertiTropLourd = true;
        window.alert('Le maillage a atteint sa limite de finesse : ' +
          maillage.getNbFaces().toLocaleString('fr-FR') + ' faces.\n\n' +
          'Au-delà, l\'affichage et la sculpture deviendraient poussifs. Pour ' +
          'affiner encore un endroit précis, réduisez d\'abord la taille de ' +
          'l\'outil, ou allégez le reste avec « Maillage plus grossier ».');
      }
      return 'trop-lourd';
    }

    var rayon2 = picking.getLocalRadius2();
    var centre = picking.getIntersectionPoint();
    var sommets = picking.pickVerticesInSphere(rayon2);
    if (!sommets.length) return 'rien';

    var faces = maillage.getFacesFromVertices(sommets);
    if (!faces.length) return 'rien';

    var moyenne2 = this._areteMoyenneCarree(maillage, faces);
    var plancher = this._plancherCarre(maillage);
    if (moyenne2 <= plancher) return 'assez-fin';

    var cible2 = Math.max(moyenne2 * FINESSE, plancher);

    // L'historique doit être posé AVANT la modification : la subdivision y
    // enregistre elle-même les sommets et les faces qu'elle touche.
    main.getStateManager().pushStateGeometry(maillage);
    maillage.subdivide(faces, centre, rayon2, cible2, main.getStateManager());

    if (maillage.isDynamic) maillage.updateBuffers();
    else maillage.updateGeometryBuffers();
    main.render();
    if (this._prevenir) this._prevenir();
    return 'fait';
  }

  /**
   * Prépare la zone sous le curseur pour un tampon.
   *
   * ── Pourquoi c'est nécessaire ───────────────────────────────────────────
   *
   * Un tampon déplace la surface selon les niveaux de gris d'une image. Il ne
   * peut donc restituer que ce que le maillage sait porter : si l'empreinte
   * couvre trente polygones, l'image n'aura que trente valeurs, quelle que soit
   * sa finesse. On voit alors une bosse, pas un motif.
   *
   * Le détail dynamique du moteur affine bien sous le pinceau, mais il vise une
   * arête proportionnelle au RAYON — au mieux un septième de celui-ci, soit une
   * quinzaine de mailles en travers de l'empreinte. Trop peu.
   *
   * On vise donc une arête d'un dix-huitième du rayon, ce qui donne une
   * quarantaine de mailles en travers : assez pour qu'un motif se lise.
   *
   * ── Une seule étape d'historique ────────────────────────────────────────
   *
   * On pose l'état AVANT la boucle, et les passes successives s'y enregistrent.
   * Sans cela, préparer la zone coûterait trois annulations avant même d'avoir
   * commencé à tamponner.
   *
   * @return {boolean} vrai si quelque chose a été subdivisé
   */
  preparerPourTampon() {
    var main = this._main;
    var picking = main.getPicking();
    if (!picking.intersectionMouseMeshes()) return false;

    var maillage = picking.getMesh();
    if (!maillage || !maillage.subdivide) return false;

    if (maillage.getNbFaces() >= FACES_MAXIMUM) {
      // Une fois seulement. Sans ce mot, la finesse cesserait de progresser
      // sans raison apparente et l'on croirait l'outil retombé en panne.
      if (!this._avertiTamponLourd) {
        this._avertiTamponLourd = true;
        window.alert('Le maillage a atteint sa limite : ' +
          maillage.getNbFaces().toLocaleString('fr-FR') + ' faces.\n\n' +
          'Les tampons continueront de marquer la surface, mais sans la ' +
          'densifier davantage — le motif sera donc moins fin.\n\n' +
          'Pour retrouver de la marge : « Maillage plus grossier » sur ' +
          'l\'ensemble, ou « Refondre le volume » depuis le témoin de santé.');
      }
      return false;
    }

    var rayon2 = picking.getLocalRadius2();
    var centre = picking.getIntersectionPoint();
    var cible2 = rayon2 / (MAILLES_PAR_RAYON * MAILLES_PAR_RAYON);
    var plancher = this._plancherCarre(maillage);
    if (cible2 < plancher) cible2 = plancher;

    var sommets = picking.pickVerticesInSphere(rayon2);
    if (!sommets.length) return false;
    var faces = maillage.getFacesFromVertices(sommets);
    if (!faces.length) return false;

    // ── On ne densifie QUE là où le tampon marque ──────────────────────
    picking.initAlpha();
    var marque = this._filtrerParLeTampon(maillage, faces, picking);
    if (!marque.faces.length) return false;
    faces = marque.faces;
    // ── Resserrer la SPHÈRE en plus : essayé, abandonné ─────────────────
    //
    // La subdivision du moteur se propage dans toute la sphère qu'on lui donne,
    // quelle que soit la liste de faces — d'où l'idée de la resserrer sur ce que
    // le tampon marque. Mesuré sur quatre empreintes hexagonales :
    //
    //     sans filtre               573 500 faces
    //     filtre seul               514 810 faces   ← retenu
    //     filtre + sphère resserrée 579 648 faces
    //
    // La sphère n'a rien gagné : l'empreinte d'un hexagone occupe presque tout
    // son carré, sa sphère englobante vaut donc celle du pinceau. Le filtre
    // seul, lui, gagne un dixième — et il gagnera bien davantage sur un tampon
    // dont la marque est concentrée : un point, un trait fin.

    // Déjà assez fin : on ne touche à rien, et surtout on n'enregistre pas une
    // étape d'annulation pour rien.
    if (this._areteMoyenneCarree(maillage, faces) <= cible2) return false;

    // ── L'historique : ce qui marche, et ce qui reste à comprendre ─────
    //
    // On suit la séquence de `SculptBase` — ouvrir l'étape, enregistrer l'état
    // d'avant des sommets et des faces touchés, puis subdiviser.
    //
    // **Et pourtant l'annulation ne défait pas cette densification.** Mesuré
    // deux fois : 196 608 faces avant, 204 886 après, et 204 886 encore après
    // Ctrl+Z. `StateDynamic.undo()` rétablit bien `setNbFaces`, la séquence est
    // celle du moteur, et je n'ai pas trouvé où cela se perd.
    //
    // Conséquence, et elle est limitée : ce qui n'est pas annulé, c'est de la
    // FINESSE, pas de la forme. Annuler défait bien le relief que le tampon a
    // posé ; le maillage reste seulement plus dense qu'avant — ce qui est
    // précisément ce qu'on était venu chercher. À reprendre malgré tout.
    var etats = main.getStateManager();
    etats.pushStateGeometry(maillage);
    etats.pushVertices(sommets);
    etats.pushFaces(faces);
    this._subdiviser(maillage, faces, centre, rayon2, cible2, etats);

    // ── Et la moitié symétrique, sinon elle reste grossière ────────────
    //
    // Le moteur applique le tampon des DEUX côtés quand la symétrie est en
    // service, mais il ne densifie que là où l'on clique. L'empreinte miroir
    // retombait donc sur des polygones larges : nette d'un côté, en escalier de
    // l'autre. On prépare les deux zones.
    if (main.getSculptManager().getSymmetry()) {
      var symetrie = main.getPickingSymmetry();
      if (symetrie) {
        symetrie.intersectionMouseMesh(maillage);
        if (symetrie.getMesh()) {
          var rayonSym2 = symetrie.getLocalRadius2();
          symetrie.initAlpha();
          var sommetsSym = symetrie.pickVerticesInSphere(rayonSym2);
          if (sommetsSym.length) {
            var marqueSym = this._filtrerParLeTampon(maillage,
              maillage.getFacesFromVertices(sommetsSym), symetrie);
            if (marqueSym.faces.length &&
              this._areteMoyenneCarree(maillage, marqueSym.faces) > cible2) {
              etats.pushVertices(sommetsSym);
              etats.pushFaces(marqueSym.faces);
              this._subdiviser(maillage, marqueSym.faces, marqueSym.centre,
                marqueSym.rayon2, cible2, etats);
            }
          }
        }
      }
    }

    if (maillage.isDynamic) maillage.updateBuffers();
    else maillage.updateGeometryBuffers();
    main.render();
    if (this._prevenir) this._prevenir();
    return true;
  }

  /**
   * Une passe de subdivision, suivie du rafraîchissement COMPLET.
   *
   * ── Les taches et les trous à l'écran ───────────────────────────────────
   *
   * Je n'appelais que `updateBuffers()`. Il en manque deux, et le moteur les
   * fait toujours après avoir subdivisé (`SculptBase.dynamicTopology`) :
   *
   *   `updateTopology(faces, sommets)` — reconstruit l'octree pour les faces
   *     touchées. Sans lui, la désignation à la souris interroge un arbre
   *     périmé et rend des faces qui ne sont plus là : le tampon suivant se
   *     posait à côté, d'où des lambeaux de motif éparpillés.
   *
   *   `updateGeometry(faces, sommets)` — recalcule les NORMALES et les boîtes.
   *     Sans lui, les sommets créés gardent une normale nulle, et l'éclairage
   *     les rend en plaques grises uniformes : ce sont les taches signalées.
   *
   * Deux lignes manquantes, deux symptômes qui n'avaient pas l'air liés.
   * `subdivide` renvoie la liste des faces APRÈS découpe : c'est elle qu'il
   * faut passer, pas celle d'avant.
   */
  _subdiviser(maillage, faces, centre, rayon2, cible2, etats) {
    var apres = maillage.subdivide(faces, centre, rayon2, cible2, etats);
    var sommets = maillage.getVerticesFromFaces(apres);
    maillage.updateTopology(apres, sommets);
    maillage.updateGeometry(apres, sommets);
    return apres;
  }

  /**
   * Ne garde que les faces que le tampon marque réellement.
   *
   * ── L'observation de Jean-Jacques ───────────────────────────────────────
   *
   * « Le tampon n'occupe jamais la taille maximale de l'outil, si bien que la
   * densification subdivise inutilement là où ce n'est pas nécessaire. Une
   * manière de déterminer où il ne faut pas densifier, c'est là où l'image du
   * tampon est complètement noire. »
   *
   * C'est exact, et deux fois. D'abord le repère du tampon est un CARRÉ inscrit
   * dans le disque du pinceau — `_alphaSide = rayon / √2` — donc les quatre
   * coins du disque ne sont jamais marqués. Ensuite, dans ce carré, tout ce que
   * l'image porte en noir ne déplace rien : un hexagone blanc sur fond noir
   * n'utilise que la moitié de son carré.
   *
   * On subdivisait donc le disque entier pour marquer parfois le tiers. Le
   * moteur sait déjà lire cette image — `picking.getAlpha(x, y, z)` rend la
   * valeur en un point, zéro hors du carré comme dans le noir. On la consulte au
   * centre de chaque face.
   *
   * Le seuil n'est pas nul mais 2 % : un dégradé qui s'éteint doucement mérite
   * encore de la matière fine sur son bord, sinon la transition se voit.
   */
  _filtrerParLeTampon(maillage, faces, picking) {
    var fAr = maillage.getFaces();
    var vAr = maillage.getVertices();
    var gardees = new Uint32Array(faces.length);
    var n = 0;
    var minX = Infinity, minY = Infinity, minZ = Infinity;
    var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (var i = 0; i < faces.length; ++i) {
      var id = faces[i] * 4;
      var a = fAr[id] * 3, b = fAr[id + 1] * 3, c = fAr[id + 2] * 3;
      var x = (vAr[a] + vAr[b] + vAr[c]) / 3;
      var y = (vAr[a + 1] + vAr[b + 1] + vAr[c + 1]) / 3;
      var z = (vAr[a + 2] + vAr[b + 2] + vAr[c + 2]) / 3;
      if (picking.getAlpha(x, y, z) <= SEUIL_TAMPON) continue;
      gardees[n++] = faces[i];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    if (!n) return { faces: gardees.subarray(0, 0) };

    var cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5, cz = (minZ + maxZ) * 0.5;
    var dx = maxX - cx, dy = maxY - cy, dz = maxZ - cz;
    return {
      faces: new Uint32Array(gardees.subarray(0, n)),
      centre: [cx, cy, cz],
      // Un peu large : une sphère au ras des centres de faces laisserait leurs
      // sommets extérieurs hors du compte.
      rayon2: (dx * dx + dy * dy + dz * dz) * 1.25
    };
  }

  /** Longueur d'arête moyenne, au carré, sur un paquet de faces. */
  _areteMoyenneCarree(maillage, faces) {
    var fAr = maillage.getFaces();
    var vAr = maillage.getVertices();
    var somme = 0;
    var compte = 0;

    for (var i = 0; i < faces.length; ++i) {
      var id = faces[i] * 4;
      for (var c = 0; c < 3; ++c) {
        var a = fAr[id + c] * 3;
        var b = fAr[id + (c + 1) % 3] * 3;
        var dx = vAr[a] - vAr[b];
        var dy = vAr[a + 1] - vAr[b + 1];
        var dz = vAr[a + 2] - vAr[b + 2];
        somme += dx * dx + dy * dy + dz * dz;
        ++compte;
      }
    }
    return compte ? somme / compte : 0;
  }

  _plancherCarre(maillage) {
    var b = maillage.getLocalBound();
    var dx = b[3] - b[0], dy = b[4] - b[1], dz = b[5] - b[2];
    var diagonale2 = dx * dx + dy * dy + dz * dz;
    return diagonale2 * ARETE_PLANCHER * ARETE_PLANCHER;
  }
}

export default Affinage;
