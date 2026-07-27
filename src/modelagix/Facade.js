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
import Picking from 'math3d/Picking';
import ShaderMatcap from 'render/shaders/ShaderMatcap';
import exporterGLB from 'modelagix/ExportGLB';
import Tiroir from 'modelagix/Tiroir';
import BarreOutils from 'modelagix/BarreOutils';
import BarreParametres from 'modelagix/BarreParametres';
import OptionsOutils from 'modelagix/OptionsOutils';
import Vues from 'modelagix/Vues';
import CubeVues from 'modelagix/CubeVues';

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
    this._vues = new Vues(main, this._gui);
    this._tiroir = new Tiroir(this._gui, main);
    this._barre = new BarreOutils(this);
    this._parametres = new BarreParametres(this, this._gui, this._tiroir);
    this._cube = new CubeVues(this, main);
    this._cube.suivreLeTiroir(this._tiroir);
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
  /**
   * @param {string} [partie] 'haut' ou 'droite' ; sans argument, l'un ou l'autre.
   * Les deux barres d'origine sont indépendantes : elles ne portent pas les
   * mêmes fonctions, il n'y a aucune raison de les lier.
   */
  isDrawerOpen(partie) {
    return this._tiroir.estOuvert(partie);
  }

  openDrawer(partie) {
    if (partie) this._tiroir.definir(partie, true);
    else this._tiroir.ouvrirTout();
  }

  closeDrawer(partie) {
    if (partie) this._tiroir.definir(partie, false);
    else this._tiroir.fermerTout();
  }

  toggleDrawer(partie) {
    if (partie) this._tiroir.basculer(partie);
    else if (this._tiroir.estOuvert()) this._tiroir.fermerTout();
    else this._tiroir.ouvrirTout();
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

  // ===================================================================
  //  ALPHAS (tampons)
  // ===================================================================

  /** Le réglage d'alpha de l'outil courant, ou null s'il n'en a pas. */
  _ctrlAlpha() {
    var g = GuiSculptingTools.tools[this._main.getSculptManager().getToolIndex()];
    return (g && g._ctrlAlpha) || null;
  }

  /**
   * Les tampons disponibles. La liste s'allonge en cours de session : les
   * alphas sont chargés en différé, et l'utilisateur peut en importer.
   * À relire à chaque affichage plutôt qu'à mettre en cache.
   */
  listAlphas() {
    return Object.keys(Picking.ALPHAS_NAMES);
  }

  getAlpha() {
    var ctrl = this._ctrlAlpha();
    return ctrl ? ctrl.getValue() : null;
  }

  setAlpha(nom) {
    var ctrl = this._ctrlAlpha();
    if (!ctrl) return false;
    ctrl.setValue(nom);
    return true;
  }

  /** true si l'outil courant accepte un tampon. */
  hasAlpha() {
    return this._ctrlAlpha() !== null;
  }

  /** Ouvre le sélecteur de fichier pour importer un tampon (image). */
  importAlpha() {
    document.getElementById('alphaopen').click();
  }

  // ===================================================================
  //  FINESSE DU MAILLAGE
  // ===================================================================

  /**
   * @return {Object} {niveau, total} en base 1, ou null s'il n'y a pas d'objet.
   * Un maillage jamais subdivisé n'a qu'un seul niveau.
   */
  getResolution() {
    var mesh = this._main.getMesh();
    if (!mesh) return null;
    var topo = this._gui._ctrlTopology;
    if (!topo.isMultimesh(mesh)) return { niveau: 1, total: 1 };
    return { niveau: mesh._sel + 1, total: mesh._meshes.length };
  }

  /**
   * Monte d'un cran. Si on est déjà au plus fin, on crée un niveau
   * supplémentaire — c'est la subdivision proprement dite, coûteuse.
   */
  subdivideUp() {
    var mesh = this._main.getMesh();
    if (!mesh) return false;
    var topo = this._gui._ctrlTopology;

    if (topo.isMultimesh(mesh) && mesh._sel < mesh._meshes.length - 1) {
      // On pilote le curseur d'origine : il pousse l'état d'annulation et
      // rafraîchit l'affichage, ce que selectResolution seul ne fait pas.
      topo._ctrlResolution.setValue(mesh._sel + 2);
    } else {
      topo.subdivide();
      this._gui.updateMesh();
    }
    return true;
  }

  /** Descend d'un cran. Au plus grossier, tente une subdivision inverse. */
  subdivideDown() {
    var mesh = this._main.getMesh();
    if (!mesh) return false;
    var topo = this._gui._ctrlTopology;

    if (topo.isMultimesh(mesh) && mesh._sel > 0) {
      topo._ctrlResolution.setValue(mesh._sel);
    } else {
      topo.reverse();
      this._gui.updateMesh();
    }
    return true;
  }

  // ===================================================================
  //  FICHIERS
  // ===================================================================

  /** Enregistre le travail en cours au format natif (.sgl). */
  saveProject() {
    this._gui._ctrlFiles.saveFileAsSGL();
  }

  exportOBJ() {
    this._gui._ctrlFiles.saveFileAsOBJ();
  }

  exportPLY() {
    this._gui._ctrlFiles.saveFileAsPLY();
  }

  // ===================================================================
  //  ORIENTATION DES VUES
  // ===================================================================

  listViews() {
    return this._vues.lister();
  }

  setView(cle) {
    return this._vues.definir(cle);
  }

  /** Regarder l'objet depuis une direction quelconque. */
  lookFrom(direction) {
    return this._vues.regarderDepuis(direction);
  }

  /** La rotation courante de la caméra — pour le cube d'orientation. */
  getCameraRotation() {
    return this._vues.getRotation();
  }

  /** Recadre sur la scène sans changer l'orientation. */
  resetView() {
    this._vues.recadrer();
  }

  /** @return {string} 'perspective' ou 'orthographique' */
  getProjection() {
    return this._vues.getProjection();
  }

  setProjection(type) {
    return this._vues.setProjection(type);
  }

  toggleProjection() {
    this._vues.basculerProjection();
  }

  /** Mesure des raccourcissements d'axes — sert aux vérifications. */
  measureAxes() {
    return this._vues.mesurerRaccourcissements();
  }

  /**
   * Les formes de départ, toutes déjà présentes dans le moteur.
   * Le cahier des charges en fait l'une des deux portes d'entrée du logiciel,
   * l'autre étant l'ouverture d'un fichier 3D.
   */
  listBaseShapes() {
    return [
      { cle: 'sphere', libelle: 'Sphère', note: 'la plus courante pour commencer', action: this.addSphere.bind(this) },
      { cle: 'cube', libelle: 'Cube', note: 'arêtes franches, formes construites', action: this.addCube.bind(this) },
      { cle: 'cylindre', libelle: 'Cylindre', note: 'pieds, anses, tiges', action: this.addCylinder.bind(this) },
      { cle: 'tore', libelle: 'Tore', note: 'anneaux, formes fermées', action: this.addTorus.bind(this) }
    ];
  }

  /** Les formats d'export proposés, dans l'ordre d'utilité pédagogique. */
  listExportFormats() {
    return [
      { cle: 'stl', libelle: 'STL', note: 'impression 3D', action: this.exportSTL.bind(this) },
      { cle: 'glb', libelle: 'GLB', note: 'partage web, visionneuses', action: this.exportGLB.bind(this) },
      { cle: 'obj', libelle: 'OBJ', note: 'échange courant', action: this.exportOBJ.bind(this) },
      { cle: 'ply', libelle: 'PLY', note: 'nuage de points, couleurs', action: this.exportPLY.bind(this) }
    ];
  }
}

export default Facade;
