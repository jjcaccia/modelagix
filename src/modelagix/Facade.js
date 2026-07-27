/**
 * MODELAGIX — façade
 *
 * Point de contact UNIQUE entre la nouvelle interface et le moteur.
 * La barre d'outils n'appelle que ce fichier, jamais les entrailles du moteur.
 *
 * Principe directeur, appris en lisant le code :
 * là où un réglage de l'interface d'origine (yagui) existe, on le PILOTE au
 * lieu de l'ignorer. On écrit dans le réglage, le réglage écrit dans le moteur.
 * Écrire directement dans le moteur créerait deux vérités qui divergent — les
 * raccourcis clavier passent eux aussi par ces réglages.
 *
 * Ce fichier est à nous. Tout le reste de src/ appartient à SculptGL.
 */

import { saveAs } from 'file-saver';
import Enums from 'misc/Enums';
import GuiSculptingTools from 'gui/GuiSculptingTools';
import ShaderMatcap from 'render/shaders/ShaderMatcap';
import exporterGLB from 'modelagix/ExportGLB';
import Tiroir from 'modelagix/Tiroir';
import BarreOutils from 'modelagix/BarreOutils';
import BarreParametres from 'modelagix/BarreParametres';
import OptionsOutils from 'modelagix/OptionsOutils';

/**
 * Vocabulaire de l'interface visée -> outils du moteur.
 * Correspondance établie dans le cahier des charges, section 8.
 */
var OUTILS = {
  draw: Enums.Tools.BRUSH,
  inflate: Enums.Tools.INFLATE,
  crease: Enums.Tools.CREASE,
  flatten: Enums.Tools.FLATTEN,
  pinch: Enums.Tools.PINCH,
  smooth: Enums.Tools.SMOOTH,
  grab: Enums.Tools.MOVE,
  drag: Enums.Tools.DRAG,
  rotate: Enums.Tools.TWIST,
  scale: Enums.Tools.LOCALSCALE,
  mask: Enums.Tools.MASKING
};

class Facade {

  constructor(main) {
    this._main = main;
    this._gui = main.getGui();
    this._options = new OptionsOutils(main.getSculptManager());
    this._tiroir = new Tiroir(this._gui, main);
    this._barre = new BarreOutils(this);
    this._parametres = new BarreParametres(this, this._gui);
  }

  // ===================================================================
  //  OPTIONS DE L'OUTIL COURANT
  // ===================================================================

  /**
   * Les interrupteurs de l'outil courant : [{cle, libelle, actif}, …].
   * La liste change d'un outil à l'autre — Argile n'existe que pour Dessiner,
   * Tangentiel que pour Lisser, etc.
   */
  listOptions() {
    var sm = this._main.getSculptManager();
    return this._options.lister(sm.getToolIndex(), sm.getCurrentTool());
  }

  /** @return {boolean|null} null si l'option n'existe pas pour l'outil courant */
  getOption(cle) {
    var sm = this._main.getSculptManager();
    return this._options.lire(sm.getToolIndex(), cle, sm.getCurrentTool());
  }

  /** @return {boolean} false si l'option n'existe pas pour l'outil courant */
  setOption(cle, valeur) {
    var sm = this._main.getSculptManager();
    return this._options.definir(sm.getToolIndex(), cle, valeur);
  }

  // ===================================================================
  //  TIROIR DES RÉGLAGES AVANCÉS
  // ===================================================================

  /** true si les barres d'origine sont visibles. */
  isDrawerOpen() {
    return this._tiroir.estOuvert();
  }

  openDrawer() {
    this._tiroir.ouvrir();
  }

  closeDrawer() {
    this._tiroir.fermer();
  }

  toggleDrawer() {
    this._tiroir.basculer();
  }

  // ===================================================================
  //  OUTILS
  // ===================================================================

  /** Les noms d'outils acceptés par setTool(). */
  listTools() {
    return Object.keys(OUTILS);
  }

  /** Nom de l'outil courant, ou null s'il est hors de notre palette. */
  getTool() {
    var index = this._main.getSculptManager().getToolIndex();
    var noms = Object.keys(OUTILS);
    for (var i = 0; i < noms.length; ++i) {
      if (OUTILS[noms[i]] === index) return noms[i];
    }
    return null;
  }

  /**
   * Choisit l'outil courant.
   * On passe par le menu de yagui : il déclenche onChangeTool, qui met à jour
   * le rayon de sélection et reste la référence pour les raccourcis clavier.
   */
  setTool(nom) {
    var index = OUTILS[nom];
    if (index === undefined) {
      console.warn('MODELAGIX : outil inconnu « ' + nom + ' ». Outils : ' + this.listTools().join(', '));
      return false;
    }
    this._gui._ctrlSculpting._ctrlSculpt.setValue(index);
    return true;
  }

  // ===================================================================
  //  RÉGLAGES DU PINCEAU
  // ===================================================================

  /** Réglages de l'outil courant. Tous n'ont pas rayon et intensité. */
  _reglages() {
    return GuiSculptingTools.tools[this._main.getSculptManager().getToolIndex()];
  }

  /** Taille du pinceau, de 5 à 500. null si l'outil courant n'en a pas. */
  getRadius() {
    var r = this._reglages();
    return r && r._ctrlRadius ? r._ctrlRadius.getValue() : null;
  }

  setRadius(valeur) {
    var r = this._reglages();
    if (!r || !r._ctrlRadius) return false;
    r._ctrlRadius.setValue(valeur);
    return true;
  }

  /** Force du pinceau, de 0 à 100. null si l'outil courant n'en a pas. */
  getIntensity() {
    var r = this._reglages();
    return r && r._ctrlIntensity ? r._ctrlIntensity.getValue() : null;
  }

  setIntensity(valeur) {
    var r = this._reglages();
    if (!r || !r._ctrlIntensity) return false;
    r._ctrlIntensity.setValue(valeur);
    return true;
  }

  // ===================================================================
  //  SYMÉTRIE
  // ===================================================================

  getSymmetry() {
    return this._main.getSculptManager().getSymmetry();
  }

  setSymmetry(actif) {
    this._gui._ctrlSculpting._ctrlSymmetry.setValue(!!actif);
    return true;
  }

  // ===================================================================
  //  AFFICHAGE
  // ===================================================================

  getWireframe() {
    var mesh = this._main.getMesh();
    return mesh ? mesh.getShowWireframe() : null;
  }

  setWireframe(actif) {
    this._gui._ctrlRendering._ctrlShowWireframe.setValue(!!actif);
    return true;
  }

  /** Noms des matériaux disponibles, dans l'ordre. */
  listMatcaps() {
    return ShaderMatcap.matcaps.map(function (m) {
      return m.name;
    });
  }

  getMatcap() {
    var mesh = this._main.getMesh();
    return mesh ? mesh.getMatcap() : null;
  }

  /**
   * Change de matériau. Le réglage bascule aussi le mode d'affichage sur
   * matcap si besoin — les matcaps relèvent de l'éclairage, pas de la peinture.
   */
  setMatcap(index) {
    if (index < 0 || index >= ShaderMatcap.matcaps.length) {
      console.warn('MODELAGIX : matériau ' + index + ' inexistant (0 à ' + (ShaderMatcap.matcaps.length - 1) + ').');
      return false;
    }
    this._gui._ctrlRendering._ctrlMatcap.setValue(index);
    return true;
  }

  // ===================================================================
  //  FORMES DE DÉPART
  // ===================================================================

  addSphere() {
    this._main.addSphere();
    this._main.render();
  }

  addCube() {
    this._main.addCube();
    this._main.render();
  }

  addCylinder() {
    this._main.addCylinder();
    this._main.render();
  }

  addTorus() {
    this._main.addTorus();
    this._main.render();
  }

  // ===================================================================
  //  FICHIERS
  // ===================================================================

  /**
   * Ouvre le sélecteur de fichier 3D (OBJ, PLY, STL, SGL).
   * Porte d'entrée de tous les usages avancés — cahier des charges, section 6.
   */
  openFile() {
    this._gui._ctrlFiles.addFile();
  }

  /** Export STL, indispensable à l'impression 3D. */
  exportSTL() {
    this._gui._ctrlFiles.saveFileAsSTL();
  }

  /**
   * Export GLB (glTF binaire) — format d'échange courant pour la 3D sur le web.
   * Absent de SculptGL, ajouté par MODELAGIX. Voir ExportGLB.js.
   */
  exportGLB() {
    var fichier = this.buildGLB();
    if (!fichier) return false;
    saveAs(fichier, 'modelagix.glb');
    return true;
  }

  /**
   * Fabrique le GLB sans l'enregistrer. Séparé de exportGLB() pour pouvoir
   * vérifier le fichier produit sans déclencher de téléchargement.
   */
  buildGLB() {
    var meshes = this._main.getSelectedMeshes();
    if (!meshes || !meshes.length) meshes = this._main.getMeshes();
    if (!meshes.length) {
      console.warn('MODELAGIX : rien à exporter, la scène est vide.');
      return null;
    }
    return exporterGLB(meshes);
  }

  // ===================================================================
  //  HISTORIQUE
  // ===================================================================

  /**
   * On passe par le contrôleur d'origine : il interrompt proprement la
   * sculpture en cours avant d'annuler, ce que stateManager.undo() seul ne
   * fait pas.
   */
  undo() {
    this._gui._ctrlStates.onUndo();
  }

  redo() {
    this._gui._ctrlStates.onRedo();
  }
}

export default Facade;
