/**
 * MODELAGIX — déplacer la vue (translation de caméra)
 *
 * Ce que le moteur savait déjà faire, mais seulement au bouton du milieu :
 * faire glisser la caméra de haut en bas et de gauche à droite, sans tourner
 * autour de l'objet. Un bouton du milieu n'existe pas sur un trackpad de
 * portable, ni sur une tablette — donc, en classe, cette possibilité n'existait
 * pas.
 *
 * Ici, c'est un mode : on l'active, on glisse au bouton gauche, on le quitte.
 *
 * ── Pourquoi on intercepte au lieu de laisser faire le moteur ─────────────
 * Le moteur décide de l'action au `mousedown`, d'après le bouton et les touches
 * enfoncées (`SculptGL.onMouseDown`). On pourrait lui écrire son action après
 * coup, mais il aurait déjà démarré une sculpture : état d'annulation empilé,
 * curseur masqué, et un premier point de matière déplacé.
 *
 * On capte donc l'événement AVANT lui (phase de capture) et on l'arrête net.
 * Le moteur ne voit rien, nous faisons la translation nous-mêmes. Rien n'est
 * modifié dans son code — c'est le même parti que pour nos curseurs, qui
 * calculent eux aussi leur position plutôt que de se battre avec yagui.
 *
 * ── L'échelle du déplacement ──────────────────────────────────────────────
 * `camera.translate` attend des pixels multipliés par le facteur de vitesse du
 * moteur : `_cameraSpeed / (hauteur du canevas × résolution d'affichage)`. On
 * reprend exactement ce calcul — un déplacement de vue doit avoir la même
 * ampleur qu'il vienne d'ici ou du bouton du milieu.
 */

import Multimesh from 'mesh/multiresolution/Multimesh';

class DeplacementVue {

  /** @param {Object} main  l'application (Scene) */
  constructor(main) {
    this._main = main;
    this._actif = false;
    this._enCours = false;
    this._dernierX = 0;
    this._dernierY = 0;
    // Le moteur pose son propre curseur sur le canevas (la pipette, la brosse…).
    // On le met de côté pour le rendre tel quel en quittant le mode, plutôt que
    // de le vider : sinon la sortie du mode efface un réglage qui n'est pas à
    // nous, jusqu'au prochain mouvement de souris.
    this._curseurDOrigine = '';

    this._surDescente = this._surDescente.bind(this);
    this._surDeplacement = this._surDeplacement.bind(this);
    this._surRemontee = this._surRemontee.bind(this);

    var canvas = main.getCanvas();
    canvas.addEventListener('mousedown', this._surDescente, true);
    window.addEventListener('mousemove', this._surDeplacement, true);
    window.addEventListener('mouseup', this._surRemontee, true);
  }

  estActif() {
    return this._actif;
  }

  definir(actif) {
    var nouveau = actif === true;
    if (nouveau === this._actif) return this._actif;

    var canvas = this._main.getCanvas();
    if (nouveau) {
      this._curseurDOrigine = canvas.style.cursor;
      // La main ouverte annonce le mode avant même qu'on ait cliqué.
      canvas.style.cursor = 'grab';
    } else {
      this._enCours = false;
      canvas.style.cursor = this._curseurDOrigine;
    }

    this._actif = nouveau;
    return this._actif;
  }

  basculer() {
    return this.definir(!this._actif);
  }

  /**
   * Déplacement d'un cran, sans souris — utile pour des boutons fléchés.
   * @param {number} dx  pixels vers la droite
   * @param {number} dy  pixels vers le bas
   */
  deplacer(dx, dy) {
    var main = this._main;
    var facteur = main.getSpeedFactor();
    Multimesh.RENDER_HINT = Multimesh.CAMERA;
    main.getCamera().translate(dx * facteur, dy * facteur);
    main.render();
  }

  // -----------------------------------------------------------------

  _surDescente(event) {
    if (!this._actif || event.button !== 0) return;
    // Le moteur ne doit pas voir ce clic : il y verrait un début de sculpture.
    event.stopPropagation();
    event.preventDefault();
    this._enCours = true;
    this._dernierX = event.pageX;
    this._dernierY = event.pageY;
    this._main.getCanvas().style.cursor = 'grabbing';
  }

  _surDeplacement(event) {
    if (!this._enCours) return;
    event.stopPropagation();

    // Même échelle que le moteur : pixels de page × résolution d'affichage.
    var ratio = this._main.getPixelRatio();
    this.deplacer((event.pageX - this._dernierX) * ratio,
      (event.pageY - this._dernierY) * ratio);

    this._dernierX = event.pageX;
    this._dernierY = event.pageY;
  }

  _surRemontee() {
    if (!this._enCours) return;
    this._enCours = false;
    Multimesh.RENDER_HINT = Multimesh.NONE;
    this._main.getCanvas().style.cursor = this._actif ? 'grab' : '';
    this._main.render();
  }
}

export default DeplacementVue;
