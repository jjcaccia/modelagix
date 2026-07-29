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
/** Arête minimale admise, en proportion de la diagonale de l'objet. */
var ARETE_PLANCHER = 0.001;
/**
 * Au-delà, on refuse : la machine ne suivrait plus.
 *
 * Le contrôle a lieu AVANT la passe, et une seule passe à grand rayon peut
 * ajouter près d'un million de faces — mesuré. Le plafond est donc placé bas
 * pour que le dépassement reste absorbable.
 */
var FACES_MAXIMUM = 700000;

class Affinage {

  constructor(main) {
    this._main = main;
    this._actif = false;
    this._enCours = false;
    this._dernierX = 0;
    this._dernierY = 0;

    var canevas = main.getCanvas();
    // À la CAPTURE, comme pour « Déplacer la vue » : le moteur ne doit pas voir
    // ce clic, sinon il démarre son propre coup de pinceau par-dessus le nôtre.
    canevas.addEventListener('mousedown', this._surDescente.bind(this), true);
    window.addEventListener('mousemove', this._surDeplacement.bind(this), false);
    window.addEventListener('mouseup', this._surRemontee.bind(this), false);
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
    return 'fait';
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
