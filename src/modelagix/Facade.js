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
import ShaderPBR from 'render/shaders/ShaderPBR';
import ShaderBase from 'render/shaders/ShaderBase';
import TR from 'gui/GuiTR';
import exporterGLB from 'modelagix/ExportGLB';
import APropos from 'modelagix/APropos';
import Booleens from 'modelagix/Booleens';
import Reparation from 'modelagix/Reparation';
import TemoinSante from 'modelagix/TemoinSante';
import CorrectifsYagui from 'modelagix/CorrectifsYagui';
import DeplacementVue from 'modelagix/DeplacementVue';
import NomApplication from 'modelagix/NomApplication';
import TamponsAlpha from 'modelagix/TamponsAlpha';
import TamponsImportes from 'modelagix/TamponsImportes';
import Tiroir from 'modelagix/Tiroir';
import BarreOutils from 'modelagix/BarreOutils';
import BarreParametres from 'modelagix/BarreParametres';
import MatiereAnalyse from 'modelagix/MatiereAnalyse';
import OptionsOutils from 'modelagix/OptionsOutils';
import Sol from 'modelagix/Sol';
import Vues from 'modelagix/Vues';
import CubeVues from 'modelagix/CubeVues';
import Disposition from 'modelagix/Disposition';

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
  mask: Enums.Tools.MASKING,
  // Transform déplace, tourne et redimensionne l'objet ENTIER par une poignée,
  // au lieu de déformer sa surface. Il ne relevait donc pas de la palette de
  // sculpture, d'où sa mise à l'écart initiale — Jean-Jacques le veut malgré
  // tout à portée de main, et le moteur le fournit déjà.
  transform: Enums.Tools.TRANSFORM
};

class Facade {

  constructor(main) {
    this._main = main;
    this._gui = main.getGui();
    // À faire AVANT de construire quoi que ce soit : l'un de ces correctifs
    // débloque le glissement de nos propres curseurs.
    CorrectifsYagui.appliquer(this._gui);

    // Douze tampons calculés viennent compléter les deux du moteur, puis ceux
    // que l'utilisateur a apportés lors des séances précédentes.
    TamponsAlpha.installer(this._gui);
    TamponsImportes.restaurer(this._gui);

    // La grille du sol devient un plan calculé pixel par pixel : axes colorés,
    // étendue sans bord, extinction avec la distance. Si le programme ne se
    // construit pas — carte trop ancienne —, la grille d'origine reste en place.
    this._sol = Sol.installer(main);

    // Deux rendus de profondeur viennent s'ajouter aux matières.
    MatiereAnalyse.installer(this._gui);

    // Le nom vient AVANT les tiroirs : c'est lui qui mesure la place à réserver
    // dans l'angle, et la languette du haut se pose d'après cette mesure.
    NomApplication.poser();

    // Le menu « À propos & aide » du tiroir du haut ouvrait le site de l'auteur
    // du moteur ; il ouvre désormais notre fenêtre, qui l'y renvoie. Le nom
    // ouvre la même fenêtre : le menu est hors de vue tant que le tiroir est
    // fermé, c'est-à-dire presque toujours.
    APropos.installer();
    NomApplication.auClic(APropos.ouvrir);

    this._options = new OptionsOutils(main.getSculptManager());
    this._vues = new Vues(main, this._gui);
    // Avant les barres : l'une d'elles porte son interrupteur.
    this._deplacement = new DeplacementVue(main);
    this._tiroir = new Tiroir(this._gui, main);
    this._barre = new BarreOutils(this);
    this._parametres = new BarreParametres(this, this._gui, this._tiroir);
    this._cube = new CubeVues(this, main);

    // ── Un seul endroit décide où va chaque panneau ───────────────────────
    //
    // Réglages, matières, vues et cube d'orientation quittent leurs placements
    // individuels pour entrer dans la disposition, qui les répartit selon la
    // place disponible et centre le nom de l'application sur l'ensemble.
    this._disposition = new Disposition({
      rangee: this._parametres.rangeeHaut(),
      reglages: this._parametres.panneauReglages(),
      matieres: this._parametres.panneauMatieres(),
      vues: this._barre.groupeVues(),
      cube: this._cube.cadre(),
      colonne: this._barre.element(),
      tiroir: this._tiroir
    });
    this._brancherNotifications();

    // Après les notifications : le témoin s'abonne aux changements d'état, et
    // il faut donc que l'enveloppe qui les émet soit déjà posée.
    this._temoin = new TemoinSante(this);

    this._reglagesInitiaux();
  }

  /**
   * Toute méthode qui change l'état prévient les barres après coup.
   *
   * Enveloppées ici plutôt qu'ajoutées une à une dans chaque méthode : la
   * plupart se terminent par un `return`, et une ligne glissée après lui ne
   * s'exécute jamais. L'enveloppe, elle, ne peut pas être contournée.
   */
  _brancherNotifications() {
    var noms = ['setTool', 'setRefineMode', 'setOption', 'setRadius', 'setIntensity',
      'setSymmetry', 'setWireframe', 'setMaterial', 'setAlpha',
      'toggleDynamicTopology', 'subdivideUp', 'subdivideDown', 'toggleGrid',
      'togglePanView', 'setPanView'];
    var self = this;
    noms.forEach(function (nom) {
      if (typeof self[nom] !== 'function') return;
      var original = self[nom].bind(self);
      self[nom] = function () {
        var retour = original.apply(null, arguments);
        self._notifier();
        return retour;
      };
    });
  }

  // ===================================================================
  //  NOTIFICATION
  // ===================================================================

  /**
   * Prévient les barres après chaque changement d'état.
   *
   * Elles se resynchronisaient jusqu'ici sur `mouseup` — qui survient AVANT le
   * `click` porteur de l'action. Elles affichaient donc l'état précédent, et
   * il fallait cliquer deux fois pour voir la barre du haut suivre l'outil.
   * Troisième fois que ce piège se présente : on ne devine plus, on prévient.
   */
  onChange(callback) {
    (this._ecouteurs || (this._ecouteurs = [])).push(callback);
  }

  _notifier() {
    if (!this._ecouteurs) return;
    for (var i = 0; i < this._ecouteurs.length; ++i) this._ecouteurs[i]();
  }

  /**
   * L'état dans lequel MODELAGIX s'ouvre, décidé avec Jean-Jacques.
   *
   * Différé d'un temps de rendu : le maillage de départ n'est pas encore posé
   * quand la façade se construit, et ces réglages agissent sur lui.
   */
  _reglagesInitiaux() {
    window.setTimeout(function () {
      if (!this._main.getMesh()) return;

      // Perle : la matière la plus neutre pour lire un volume, sans teinte de
      // peau ni brillance qui masquerait les défauts de forme.
      var perle = this.listMaterials().filter(function (m) {
        return m.libelle === 'Perle' || m.libelle === 'Pearl';
      })[0];
      if (perle) this.setMaterial(perle.cle);

      // Le détail dynamique affine le maillage sous le pinceau : c'est le
      // comportement attendu d'une pâte à modeler, donc l'état par défaut.
      if (!this.isDynamicTopology()) this.toggleDynamicTopology();

      // …et il le simplifie là où le relief a disparu. Le moteur livre cette
      // seconde moitié à zéro ; le maillage ne faisait donc que grossir.
      //
      // Plus le nombre est haut, plus tôt une arête est effondrée — et un large
      // pinceau finit par effacer du maillage un détail fin qu'il n'a pourtant
      // pas déformé. 20 est la valeur retenue par Jean-Jacques après essai à la
      // main ; à 50, la simplification mordait encore sur le travail fin.
      // Réglable dans le tiroir de droite, sous « Décimation ».
      this.setDecimation(20);

      // Angle de vue d'un 40 mm. Le moteur livrait l'équivalent d'un 29 mm :
      // un grand angle qui exagère les fuyantes et fait paraître un volume plus
      // creusé qu'il n'est — trompeur quand c'est justement la forme qu'on juge.
      this.setFocale(40);

      this.setSymmetry(true);

      // Résolution d'affichage doublée : la sculpture se juge sur la finesse
      // du bord, et un rendu à l'échelle 1 crénèle les silhouettes.
      this.setPixelRatio(2);

      this._descendreLaVue();
    }.bind(this), 0);
  }

  /**
   * L'objet descend un peu dans la vue, une fois pour toutes au démarrage.
   *
   * Parfaitement centrée, la sphère de départ passait derrière la rangée de
   * panneaux du haut. On applique le même déplacement de vue qu'un glissé de la
   * main vers le bas, d'un dixième de la hauteur de la zone de dessin.
   *
   * On ATTEND que cette zone ait une hauteur réelle. Au premier instant elle
   * vaut zéro ; or le facteur de déplacement de la caméra est divisé par cette
   * hauteur, donc « zéro fois l'infini » — un non-nombre, qui contaminait la
   * position de la caméra et laissait un écran noir sans la moindre erreur
   * signalée. Le piège est silencieux : on le désamorce en vérifiant.
   */
  _descendreLaVue() {
    var essais = 0;
    var essayer = function () {
      var hauteur = this._main.getCanvasHeight();
      if (hauteur > 0) {
        this.panView(0, hauteur * 0.10);
        return;
      }
      if (++essais < 60) window.requestAnimationFrame(essayer);
    }.bind(this);
    // 260 ms : le moteur amène la caméra sur l'objet par un mouvement animé de
    // 200 ms, et TOUT déplacement de caméra annule l'animation en cours — elles
    // partagent la même file. Panoramiquer trop tôt figeait donc la caméra à sa
    // position de départ, c'est-à-dire à l'intérieur de la sphère : un écran
    // laiteux, sans erreur ni indice. On laisse l'animation finir.
    window.setTimeout(essayer, 260);
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
    return this._options.lister(sm.getToolIndex(), sm.getCurrentTool(), this.getTool());
  }

  /** @return {boolean|null} null si l'option n'existe pas pour l'outil courant */
  getOption(cle) {
    var sm = this._main.getSculptManager();
    return this._options.lire(sm.getToolIndex(), cle, sm.getCurrentTool());
  }

  /**
   * Les actions immédiates de l'outil courant — celles qui s'appliquent d'un
   * coup, sans passer par un geste de pinceau.
   *
   * Aujourd'hui seul Masquer en propose : le moteur sait effacer, inverser,
   * adoucir et durcir un masque existant, mais ces commandes n'étaient
   * atteignables que par le tiroir.
   *
   * @return {Array} [{cle, libelle, action}, …], vide si l'outil n'en a pas
   */
  listToolActions() {
    if (this.getTool() !== 'mask') return [];
    var masque = this._main.getSculptManager().getTool(Enums.Tools.MASKING);
    if (!masque) return [];
    var lancer = function (nom) {
      return function () {
        masque[nom]();
        this._main.render();
      }.bind(this);
    }.bind(this);
    return [
      { cle: 'invert', libelle: 'Inverser', action: lancer('invert') },
      { cle: 'clear', libelle: 'Effacer', action: lancer('clear') },
      { cle: 'blur', libelle: 'Adoucir', action: lancer('blur') },
      { cle: 'sharpen', libelle: 'Durcir', action: lancer('sharpen') }
    ];
  }

  // ===================================================================
  //  AFFINER — le pinceau qui ne fait que densifier le maillage
  // ===================================================================

  /**
   * Le moteur n'a pas d'outil « subdiviser localement ». Mais avec la
   * topologie dynamique active, TOUT coup de pinceau affine ce qu'il touche —
   * et une force nulle supprime la déformation. Reste donc l'affinage seul.
   *
   * C'est la combinaison que Jean-Jacques avait trouvée à la main. Plutôt que
   * de lui demander de la refaire à chaque fois, on lui donne un bouton.
   *
   * Creuser est choisi comme support parce que son empreinte est la plus
   * étroite : l'affinage suit le tracé au plus près.
   */
  setRefineMode() {
    if (!this._main.getMesh()) return false;
    if (!this.isDynamicTopology()) this.toggleDynamicTopology();
    this.setTool('crease');
    this.setIntensity(0);
    this._notifier();
    return true;
  }

  isRefineMode() {
    return this.isDynamicTopology() && this.getTool() === 'crease' && this.getIntensity() === 0;
  }

  /** @return {boolean} false si l'option n'existe pas pour l'outil courant */
  setOption(cle, valeur) {
    var sm = this._main.getSculptManager();
    var ok = this._options.definir(sm.getToolIndex(), cle, valeur);
    this._notifier();
    return ok;
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

  /**
   * Active la symétrie ET l'affichage de son plan : sculpter en symétrie sans
   * voir l'axe revient à travailler à l'aveugle sur la moitié du geste.
   */
  setSymmetry(actif) {
    this._gui._ctrlSculpting._ctrlSymmetry.setValue(!!actif);
    this.setSymmetryLine(!!actif);
    return true;
  }

  /**
   * La ligne de symétrie, que le moteur sait déjà dessiner
   * (`ShaderBase.showSymmetryLine`, menu Scène de l'interface d'origine).
   *
   * On pilote la case à cocher d'origine plutôt que la variable : sa valeur vit
   * dans son propre élément HTML, et l'écrire directement laisserait la case
   * sur un état périmé — le piège des deux vérités, déjà rencontré.
   *
   * SculptGL ne retient cette case nulle part : on la retrouve par son
   * étiquette, obtenue avec la MÊME fonction de traduction que le moteur. Le
   * repère reste donc valide si l'utilisateur change de langue.
   */
  _caseLigneSymetrie() {
    if (this._caseLigne !== undefined && this._caseLigne !== null) return this._caseLigne;

    var attendu = TR('renderingSymmetryLine');
    var lignes = document.querySelectorAll('.gui-sidebar li, .gui-topbar li');
    for (var i = 0; i < lignes.length; ++i) {
      var etiquette = lignes[i].querySelector('label.gui-label-side');
      var boite = lignes[i].querySelector('input.gui-input-checkbox');
      if (etiquette && boite && etiquette.textContent === attendu) {
        this._caseLigne = boite;
        return boite;
      }
    }
    this._caseLigne = null;
    return null;
  }

  /**
   * L'affichage de la grille du sol. Même approche que la ligne de symétrie :
   * on pilote la case d'origine, retrouvée par son étiquette obtenue avec la
   * même fonction de traduction que le moteur.
   */
  _caseGrille() {
    if (this._caseG !== undefined && this._caseG !== null) return this._caseG;
    var attendu = TR('renderingGrid');
    var lignes = document.querySelectorAll('.gui-sidebar li, .gui-topbar li');
    for (var i = 0; i < lignes.length; ++i) {
      var e = lignes[i].querySelector('label.gui-label-side');
      var b = lignes[i].querySelector('input.gui-input-checkbox');
      if (e && b && e.textContent === attendu) { this._caseG = b; return b; }
    }
    this._caseG = null;
    return null;
  }

  /**
   * La résolution d'affichage (0,5 à 2). Le moteur rend dans un tampon à cette
   * échelle puis le réduit : à 2, les bords sont lissés.
   *
   * Le curseur d'origine vit dans le menu « Extra UI » et n'a pas d'étiquette,
   * donc impossible à retrouver comme les autres. On écrit la propriété et on
   * redimensionne ; seul ce curseur restera désynchronisé, sans conséquence
   * puisque rien d'autre ne le lit.
   */
  getPixelRatio() {
    return this._main._pixelRatio;
  }

  setPixelRatio(valeur) {
    valeur = Math.max(0.5, Math.min(2, valeur));

    // Le curseur d'origine n'a pas d'étiquette : on le reconnaît à ses bornes,
    // 0,5 à 2, uniques dans toute l'interface. Le piloter évite qu'il affiche
    // une valeur périmée, et qu'un déplacement ultérieur reparte de celle-ci.
    var champs = document.querySelectorAll('.gui-topbar input[type=number]');
    for (var i = 0; i < champs.length; ++i) {
      var c = champs[i];
      if (parseFloat(c.min) === 0.5 && parseFloat(c.max) === 2) {
        c.value = valeur;
        c.dispatchEvent(new Event('change', { bubbles: true }));
        if (this._main._pixelRatio === valeur) return true;
        break;
      }
    }

    this._main._pixelRatio = valeur;
    this._main.onCanvasResize();
    this._main.render();
    return true;
  }

  /** Nombre de sommets et de faces de la scène. */
  getMeshInfo() {
    var meshes = this._main.getMeshes();
    var sommets = 0, faces = 0;
    for (var i = 0; i < meshes.length; ++i) {
      sommets += meshes[i].getNbVertices();
      faces += meshes[i].getNbFaces();
    }
    return { sommets: sommets, faces: faces };
  }

  getGrid() {
    return this._main._showGrid === true;
  }

  setGrid(visible) {
    visible = !!visible;
    var b = this._caseGrille();
    if (b) {
      if (b.checked !== visible) b.parentNode.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      return true;
    }
    this._main._showGrid = visible;
    this._main.render();
    return false;
  }

  toggleGrid() {
    this.setGrid(!this.getGrid());
    return true;
  }

  getSymmetryLine() {
    return ShaderBase.showSymmetryLine === true;
  }

  setSymmetryLine(visible) {
    visible = !!visible;
    var boite = this._caseLigneSymetrie();
    if (boite) {
      // yagui écoute le mousedown de la ligne entière, pas le clic de la case.
      if (boite.checked !== visible) {
        boite.parentNode.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      }
      return true;
    }
    // Repli si la case est introuvable : l'affichage reste juste, seule la
    // case du tiroir sera désynchronisée.
    ShaderBase.showSymmetryLine = visible;
    this._main.render();
    return false;
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

  /**
   * Tous les rendus disponibles, matcaps et environnements confondus.
   *
   * Le moteur les range dans trois familles distinctes — sphères de matière,
   * environnements physiques, rendu des normales — mais pour l'utilisateur
   * c'est une seule question : « de quoi ça a l'air ». On les réunit donc en
   * une liste, chaque entrée portant le mode d'affichage qu'elle exige.
   *
   * @return {Array} [{cle, libelle, famille}, …]
   */
  listMaterials() {
    var liste = [];
    ShaderMatcap.matcaps.forEach(function (m, i) {
      liste.push({ cle: 'matcap:' + i, libelle: m.name, famille: 'Sphères de matière', vignette: m.path });
    });
    ShaderPBR.environments.forEach(function (e, i) {
      liste.push({ cle: 'pbr:' + i, libelle: e.name, famille: 'Environnements', vignette: e.path });
    });
    liste.push({ cle: 'normal', libelle: 'Normales', famille: 'Analyse', vignette: null });
    MatiereAnalyse.VERSIONS.forEach(function (v) {
      liste.push({ cle: v.cle, libelle: v.libelle, famille: 'Analyse', vignette: null });
    });
    return liste;
  }

  /**
   * L'aperçu d'un environnement, calculé — une sphère éclairée par lui.
   *
   * Les vignettes d'environnement étaient illisibles parce que le moteur ne
   * stocke que des panoramas équirectangulaires : une photographie à 360°
   * aplatie en bande, qui ne ressemble à rien une fois réduite.
   *
   * Mais chaque environnement porte aussi ses **harmoniques sphériques** —
   * neuf coefficients qui résument son éclairage diffus. C'est ce que le
   * shader utilise pour éclairer la matière. On reprend ici SA formule, à
   * l'identique (`sphericalHarmonics` dans pbr.glsl), et on la déroule sur
   * une demi-sphère. L'aperçu montre donc exactement la lumière que
   * l'environnement produira, sans charger la moindre image.
   */
  environnementVignette(index, cote) {
    var env = ShaderPBR.environments[index];
    if (!env || !env.sph) return null;
    cote = cote || 72;

    var s = env.sph;
    var coef = function (i, c) { return s[i * 3 + c]; };
    var expo = env.exposure || 1;

    // Direction dominante de la lumière : elle se lit dans les termes
    // linéaires des harmoniques (S3 = x, S1 = y, S2 = z), pondérés par la
    // luminance des trois canaux.
    var lum = function (i) { return 0.3 * coef(i, 0) + 0.59 * coef(i, 1) + 0.11 * coef(i, 2); };
    var dirL = [lum(3), lum(1), lum(2)];
    var nL = Math.sqrt(dirL[0] * dirL[0] + dirL[1] * dirL[1] + dirL[2] * dirL[2]) || 1;
    var intensiteL = Math.min(2.5, nL * expo * 2.2);
    dirL = [dirL[0] / nL, dirL[1] / nL, dirL[2] / nL];

    var can = document.createElement('canvas');
    can.width = can.height = cote;
    var ctx = can.getContext('2d');
    var img = ctx.createImageData(cote, cote);
    var r = cote / 2;
    var diffus = [0, 0, 0];

    for (var py = 0; py < cote; ++py) {
      for (var px = 0; px < cote; ++px) {
        var d = (py * cote + px) * 4;
        var nx = (px + 0.5 - r) / r;
        var ny = (r - py - 0.5) / r;
        var d2 = nx * nx + ny * ny;
        if (d2 > 1) { img.data[d + 3] = 0; continue; }

        var nz = Math.sqrt(1 - d2);
        // Même convention que le shader : il inverse Z.
        var x = nx, y = ny, z = -nz;

        for (var c = 0; c < 3; ++c) {
          var v = coef(0, c) + coef(1, c) * y + coef(2, c) * z + coef(3, c) * x +
            coef(4, c) * y * x + coef(5, c) * y * z +
            coef(6, c) * (3 * z * z - 1) + coef(7, c) * (z * x) +
            coef(8, c) * (x * x - y * y);
          v = Math.max(0, v) * expo;
          diffus[c] = v;
        }

        // ── Une part spéculaire, pour que la vignette DISE la brillance ────
        // L'éclairage diffus seul donnait des sphères ternes et toutes
        // semblables : rien n'indiquait qu'un environnement est brillant.
        // On retrouve la direction dominante de la lumière dans les termes
        // linéaires des harmoniques, et on ajoute le reflet qu'elle produit.
        var vx = 2 * nz * x, vy = 2 * nz * y, vz = 2 * nz * z + 1; // réflexion du regard
        var lr = Math.max(0, vx * dirL[0] + vy * dirL[1] + vz * dirL[2]);
        var spec = Math.pow(lr, 48) * intensiteL;

        for (var k = 0; k < 3; ++k) {
          var s2 = diffus[k] + spec;
          s2 = s2 / (1 + s2);                   // compression des hautes lumières
          // Léger renforcement du contraste : sans lui, la compression aplatit
          // les écarts et les environnements se ressemblent tous.
          s2 = Math.min(1, Math.max(0, (s2 - 0.5) * 1.35 + 0.5));
          img.data[d + k] = Math.round(255 * Math.pow(s2, 1 / 2.2));
        }
        img.data[d + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return can;
  }

  /**
   * L'aperçu du rendu des normales : une sphère dont chaque point prend la
   * couleur de sa normale. C'est littéralement ce que ce mode affiche, donc
   * l'aperçu ne triche pas.
   */
  normalesVignette(cote) {
    cote = cote || 72;
    var can = document.createElement('canvas');
    can.width = can.height = cote;
    var ctx = can.getContext('2d');
    var img = ctx.createImageData(cote, cote);
    var r = cote / 2;

    for (var py = 0; py < cote; ++py) {
      for (var px = 0; px < cote; ++px) {
        var d = (py * cote + px) * 4;
        var nx = (px + 0.5 - r) / r;
        var ny = (r - py - 0.5) / r;
        var d2 = nx * nx + ny * ny;
        if (d2 > 1) { img.data[d + 3] = 0; continue; }
        var nz = Math.sqrt(1 - d2);
        img.data[d] = Math.round(255 * (nx * 0.5 + 0.5));
        img.data[d + 1] = Math.round(255 * (ny * 0.5 + 0.5));
        img.data[d + 2] = Math.round(255 * (nz * 0.5 + 0.5));
        img.data[d + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return can;
  }

  /**
   * L'image d'un tampon, en niveaux de gris.
   *
   * Le moteur ne garde pas l'image d'origine : il n'en conserve que la
   * luminance, un octet par pixel (`Picking.addAlpha`). On la redessine donc
   * dans un canevas plutôt que de pointer un fichier.
   *
   * @return {HTMLCanvasElement|null} null pour « Vide »
   */
  alphaVignette(nom, cote) {
    var alpha = Picking.ALPHAS[nom];
    if (!alpha || !alpha._texture) return null;

    cote = cote || 44;
    var can = document.createElement('canvas');
    can.width = can.height = cote;
    var ctx = can.getContext('2d');
    var image = ctx.createImageData(cote, cote);

    for (var y = 0; y < cote; ++y) {
      var sy = Math.floor(y * alpha._height / cote);
      for (var x = 0; x < cote; ++x) {
        var sx = Math.floor(x * alpha._width / cote);
        var v = alpha._texture[sy * alpha._width + sx];
        var d = (y * cote + x) * 4;
        image.data[d] = image.data[d + 1] = image.data[d + 2] = v;
        image.data[d + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    return can;
  }

  /** Le tracé SVG de l'outil courant, pour l'afficher en grand. */
  getToolIconKey() {
    return this.isRefineMode() ? 'affiner' : this.getTool();
  }

  /** L'intitulé de l'outil courant, tel qu'il s'affiche sous son icône. */
  getToolLabel() {
    var libelles = {
      draw: 'Dessiner', inflate: 'Gonfler', crease: 'Creuser', flatten: 'Aplatir',
      pinch: 'Pincer', smooth: 'Lisser', grab: 'Saisir', drag: 'Tirer',
      rotate: 'Tourner', scale: 'Redimensionner', mask: 'Masquer', affiner: 'Affiner',
      transform: 'Transformer'
    };
    return libelles[this.getToolIconKey()] || '';
  }

  /** La clé du rendu courant, au format de listMaterials(). */
  getMaterial() {
    var mesh = this._main.getMesh();
    if (!mesh) return null;
    var type = mesh.getShaderType();
    if (type === Enums.Shader.PBR) return 'pbr:' + ShaderPBR.idEnv;
    if (type === Enums.Shader.NORMAL) return 'normal';
    var analyse = MatiereAnalyse.versionDuShader(type);
    if (analyse) return analyse.cle;
    return 'matcap:' + mesh.getMatcap();
  }

  /**
   * On pilote les réglages d'origine plutôt que le maillage : leurs callbacks
   * appliquent le changement à TOUS les objets sélectionnés, ajustent
   * l'exposition de l'environnement et rafraîchissent le panneau.
   */
  setMaterial(cle) {
    var rendu = this._gui._ctrlRendering;
    if (!rendu || !this._main.getMesh()) return false;

    if (cle === 'normal') {
      rendu._ctrlShaders.setValue(Enums.Shader.NORMAL);
      MatiereAnalyse.accorderLeFond(this._main);
      this._main.render();
      return true;
    }

    // Les deux rendus de profondeur passent par la même liste déroulante que
    // les autres : ils y ont été ajoutés au démarrage. Seul le fond de la vue
    // demande un geste de plus — blanc ou noir selon le sens choisi.
    var analyse = MatiereAnalyse.version(cle);
    if (analyse) {
      rendu._ctrlShaders.setValue(analyse.shader);
      MatiereAnalyse.accorderLeFond(this._main);
      this._main.render();
      return true;
    }

    var sep = String(cle).indexOf(':');
    if (sep === -1) return false;
    var famille = cle.slice(0, sep);
    var index = parseInt(cle.slice(sep + 1), 10);

    if (famille === 'pbr') {
      if (!(index >= 0 && index < ShaderPBR.environments.length)) return false;
      rendu._ctrlShaders.setValue(Enums.Shader.PBR);
      rendu._ctrlEnv.setValue(index);
      MatiereAnalyse.accorderLeFond(this._main);
      return true;
    }
    if (famille === 'matcap') {
      if (!(index >= 0 && index < ShaderMatcap.matcaps.length)) return false;
      rendu._ctrlMatcap.setValue(index); // bascule aussi le mode sur matcap
      // Quitter une matière d'analyse doit rendre son gris au fond de la vue.
      MatiereAnalyse.accorderLeFond(this._main);
      this._main.render();
      return true;
    }
    return false;
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

  /**
   * Pose une forme neuve À LA PLACE de ce qui occupe la scène.
   *
   * Deux précautions, toutes deux apprises en essayant plus simple :
   *
   * 1. **Ne pas appeler `clearScene()` du moteur.** Il remet aussi la caméra à
   *    sa position d'origine : on perdait son point de vue en changeant de
   *    forme, alors qu'on venait souvent de le régler avec soin.
   *
   * 2. **Une seule étape d'historique.** Enregistrer le retrait puis l'ajout en
   *    faisait deux : une première annulation laissait la scène VIDE, ce qui
   *    ressemble à s'y méprendre à une catastrophe. On retire donc les anciens
   *    volumes sans rien enregistrer, on laisse le moteur enregistrer son ajout,
   *    puis on complète cette étape avec ce qui a disparu. `StateAddRemove` sait
   *    porter les deux moitiés : c'est sa raison d'être.
   *
   * @param {Function} poser  la méthode du moteur qui crée la forme
   */
  _remplacerLaScene(poser) {
    var main = this._main;
    var anciens = main.getMeshes().slice();
    var selection = main.getSelectedMeshes().slice();

    main.removeMeshes(anciens);
    main.getSelectedMeshes().length = 0;
    main.setMesh(null);

    poser();

    var etape = main.getStateManager().getCurrentState();
    if (etape && etape._addedMeshes) {
      etape._removedMeshes = anciens;
      etape._selectMeshes = selection;
    }
    main.render();
  }

  /**
   * Les quatre formes de départ prennent toutes le même paramètre : la nouvelle
   * forme vient-elle EN PLUS de ce qui est là, ou À LA PLACE ?
   *
   * Le moteur ne connaissait que « en plus ». C'est le bon comportement quand
   * on assemble, et le mauvais quand on recommence : on se retrouvait avec deux
   * volumes superposés sans l'avoir voulu.
   */
  addSphere(remplacer) {
    if (remplacer) return this._remplacerLaScene(this._main.addSphere.bind(this._main));
    this._main.addSphere();
    this._main.render();
  }

  addCube(remplacer) {
    if (remplacer) return this._remplacerLaScene(this._main.addCube.bind(this._main));
    this._main.addCube();
    this._main.render();
  }

  addCylinder(remplacer) {
    if (remplacer) return this._remplacerLaScene(this._main.addCylinder.bind(this._main));
    this._main.addCylinder();
    this._main.render();
  }

  addTorus(remplacer) {
    if (remplacer) return this._remplacerLaScene(this._main.addTorus.bind(this._main));
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

  /** Ouvre le sélecteur de fichier du moteur (tampon non conservé). */
  importAlpha() {
    document.getElementById('alphaopen').click();
  }

  /**
   * Fabrique un tampon à partir d'une image et le CONSERVE d'une séance à
   * l'autre. C'est ce qui distingue cette voie de celle du moteur : la sienne
   * charge l'image pour la session en cours et l'oublie au rechargement.
   *
   * @param {File} fichier
   * @param {Function} quandPret  reçoit (nom, souci) — `souci` est un message
   *   à montrer, ou null si tout s'est bien passé.
   */
  importAlphaFile(fichier, quandPret) {
    TamponsImportes.importer(this._gui, fichier, quandPret);
  }

  /**
   * Importe une série d'images — plusieurs fichiers, ou tout un dossier.
   * @param {FileList|Array} fichiers
   * @param {Function} quandPret  reçoit un bilan
   *   { ajoutes, conserves, ignores, dernier, themes, souci }
   */
  importAlphaFiles(fichiers, quandPret) {
    TamponsImportes.importerPlusieurs(this._gui, fichiers, quandPret);
  }

  /** Les noms des tampons apportés par l'utilisateur. */
  listImportedAlphas() {
    return TamponsImportes.lister();
  }

  /**
   * Le thème d'un tampon — le dossier d'où il vient — ou null.
   * Sert à regrouper la grille : un dossier rangé par l'utilisateur reste
   * rangé dans l'application.
   */
  alphaTheme(nom) {
    return TamponsImportes.themeDuTampon(nom);
  }

  /**
   * Oublie un tampon importé. Il reste utilisable jusqu'au prochain
   * rechargement — le moteur n'a pas de quoi retirer un alpha de sa collection.
   */
  forgetAlpha(nom) {
    return TamponsImportes.oublier(nom);
  }

  // ===================================================================
  //  FINESSE DU MAILLAGE
  // ===================================================================

  /**
   * ── Le détail dynamique et sa moitié oubliée ──────────────────────────
   *
   * À chaque coup de pinceau, le moteur affine le maillage sous la brosse
   * (subdivision) PUIS le simplifie là où les arêtes sont devenues trop courtes
   * (décimation) — les deux dans le même geste, toutes deux bornées au rayon.
   * C'est dans `SculptBase.dynamicTopology`.
   *
   * La seconde passe est livrée à zéro (`MeshDynamic.DECIMATION_FACTOR = 0`).
   * Le maillage ne faisait donc que s'enrichir : jamais il ne se simplifiait là
   * où le relief avait disparu, et un long modelage faisait gonfler le nombre de
   * faces sans retour possible.
   *
   * On pilote le curseur d'origine — jamais `MeshDynamic.DECIMATION_FACTOR`
   * directement : le curseur du tiroir garderait son ancienne valeur et la
   * réécrirait au premier réglage. Deux vérités qui divergent, encore.
   */
  setDecimation(valeur) {
    var topo = this._gui._ctrlTopology;
    if (!topo || !topo._ctrlDynDec) return false;
    topo._ctrlDynDec.setValue(Math.max(0, Math.min(100, valeur)));
    return true;
  }

  /** @return {number|null} 0 à 100, null si le réglage est introuvable */
  getDecimation() {
    var topo = this._gui._ctrlTopology;
    return topo && topo._ctrlDynDec ? topo._ctrlDynDec.getValue() : null;
  }

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

  // ===================================================================
  //  DÉTAIL DYNAMIQUE — la subdivision locale, sous le pinceau
  // ===================================================================

  /**
   * Le moteur sait affiner le maillage LOCALEMENT pendant qu'on sculpte :
   * `MeshDynamic.subdivide(triangles, centre, rayon², détail²)` ne subdivise
   * que dans un rayon autour du point touché, et `decimate` fait l'inverse.
   *
   * C'est le comportement « detail » de l'ergonomie visée — mais sous forme de
   * mode, pas d'outil séparé : une fois activé, chaque coup de pinceau affine
   * ce qu'il touche.
   *
   * Contrepartie : activer ce mode CONVERTIT l'objet en maillage dynamique, ce
   * qui abandonne les niveaux de subdivision multiples. Le moteur enregistre
   * l'opération dans l'historique, donc l'annulation reste possible.
   */
  isDynamicTopology() {
    var mesh = this._main.getMesh();
    return !!(mesh && mesh.isDynamic);
  }

  toggleDynamicTopology() {
    if (!this._main.getMesh()) return false;
    // On passe par le contrôleur d'origine : il gère la conversion, l'état
    // d'annulation et le rafraîchissement de son propre panneau.
    this._gui._ctrlTopology.dynamicToggleActivate();
    this._gui.updateMesh();
    this._main.render();
    return true;
  }

  /** Finesse de l'affinage local, de 0 à 100. */
  getDetailFactor() {
    var ctrl = this._gui._ctrlTopology._ctrlDynSubd;
    return ctrl ? ctrl.getValue() : null;
  }

  setDetailFactor(valeur) {
    var ctrl = this._gui._ctrlTopology._ctrlDynSubd;
    if (!ctrl) return false;
    ctrl.setValue(Math.max(0, Math.min(100, valeur)));
    return true;
  }

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

  // ===================================================================
  //  PLUSIEURS VOLUMES
  // ===================================================================

  /** Combien de volumes dans la scène. */
  countVolumes() {
    return this._main.getMeshes().length;
  }

  /** Combien sont sélectionnés. Maj + clic ajoute à la sélection. */
  countSelectedVolumes() {
    return this._main.getSelectedMeshes().length;
  }

  /**
   * Additionne, soustrait ou intersecte les volumes sélectionnés.
   * @param {string} operation 'addition' | 'soustraction' | 'intersection'
   * @return {boolean} false si l'opération n'a rien produit
   */
  combineVolumes(operation) {
    var resultat = Booleens.combiner(this._main, operation);
    this._notifier();
    return !!resultat;
  }

  /** Supprime les volumes sélectionnés. @return {number} combien */
  deleteVolumes() {
    var n = Booleens.supprimer(this._main);
    this._notifier();
    return n;
  }

  // ===================================================================
  //  SANTÉ DES VOLUMES
  // ===================================================================

  /**
   * Examine tous les volumes.
   * @return {Object} {volumes, trous, aretesSurchargees, sain}
   */
  diagnoseScene() {
    return Reparation.examiner(this._main);
  }

  /**
   * Rebouche les trous de tous les volumes qui en ont.
   * @return {Object} {volumesRepares, trousBouches}
   */
  repairScene() {
    var fait = Reparation.reparer(this._main);
    this._notifier();
    return fait;
  }

  /**
   * Taille totale de la scène, sommets et faces confondus.
   *
   * Sert de repère au témoin de santé : tant que ce nombre ne bouge pas, la
   * géométrie n'a pas changé et il est inutile de la réexaminer.
   */
  sceneSize() {
    var maillages = this._main.getMeshes();
    var total = 0;
    for (var i = 0; i < maillages.length; ++i) {
      total += maillages[i].getNbVertices() + maillages[i].getNbFaces() * 7;
    }
    return total;
  }

  /** Recadre sur la scène sans changer l'orientation. */
  resetView() {
    this._vues.recadrer();
  }

  /**
   * ── Déplacer la vue ───────────────────────────────────────────────────
   * Le moteur ne l'offrait qu'au bouton du milieu de la souris — inexistant sur
   * le trackpad d'un portable comme sur une tablette. C'est donc un mode : tant
   * qu'il est actif, le glissé au bouton gauche fait coulisser la vue au lieu de
   * sculpter.
   */
  togglePanView() {
    return this._deplacement.basculer();
  }

  setPanView(actif) {
    return this._deplacement.definir(actif);
  }

  isPanView() {
    return this._deplacement.estActif();
  }

  /**
   * Déplacement d'un cran, sans souris.
   * @param {number} dx  pixels vers la droite (négatif : vers la gauche)
   * @param {number} dy  pixels vers le bas (négatif : vers le haut)
   *
   * Rien ne l'appelle aujourd'hui : elle existe pour que quatre boutons fléchés
   * — haut, bas, gauche, droite — ne demandent que leur propre dessin, si le
   * mode au glissé ne suffit pas à l'usage.
   */
  panView(dx, dy) {
    this._deplacement.deplacer(dx, dy);
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

  /**
   * ── L'angle de vue, exprimé en objectif photographique ────────────────
   *
   * Le moteur raisonne en degrés — et en degrés VERTICAUX, puisque c'est ce
   * qu'attend `mat4.perspective`. Personne ne se représente un angle de vue en
   * degrés ; tout le monde se représente un 50 mm. On convertit donc, sur le
   * format de référence 24 × 36 :
   *
   *     angle vertical = 2 · arctan(12 / focale)
   *
   * 50 mm donne 27°, 40 mm donne 33°, 35 mm donne 37°. Le moteur livrait 45°,
   * soit un 29 mm : un grand angle, qui exagère les fuyantes et fait paraître
   * un volume plus creusé qu'il n'est — trompeur quand on modèle.
   */
  setFocale(millimetres) {
    var cam = this._gui._ctrlCamera;
    var angle = 2 * Math.atan(12 / millimetres) * 180 / Math.PI;
    angle = Math.max(10, Math.min(90, Math.round(angle)));
    if (cam && cam._ctrlFov) {
      cam._ctrlFov.setValue(angle);
      return true;
    }
    this._main.getCamera().setFov(angle);
    this._main.render();
    return true;
  }

  /** @return {number} la focale équivalente, en millimètres */
  getFocale() {
    var angle = this._main.getCamera().getFov() * Math.PI / 180;
    return Math.round(12 / Math.tan(angle / 2));
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
    var poser = function (methode) {
      return function (mode) { methode(mode === 'remplacer'); };
    };
    return [
      { cle: 'sphere', libelle: 'Sphère', note: 'la plus courante pour commencer',
        icone: 'formeSphere', action: poser(this.addSphere.bind(this)) },
      { cle: 'cube', libelle: 'Cube', note: 'arêtes franches, formes construites',
        icone: 'formeCube', action: poser(this.addCube.bind(this)) },
      { cle: 'cylindre', libelle: 'Cylindre', note: 'pieds, anses, tiges',
        icone: 'formeCylindre', action: poser(this.addCylinder.bind(this)) },
      { cle: 'tore', libelle: 'Tore', note: 'anneaux, formes fermées',
        icone: 'formeTore', action: poser(this.addTorus.bind(this)) }
    ];
  }

  /**
   * Le choix offert en tête de la fenêtre « Nouvelle 3D ».
   *
   * « En plus » d'abord, et par défaut : c'est le geste qui ne détruit rien.
   * Un défaut destructeur se paie tôt ou tard par un travail perdu.
   */
  baseShapeModes() {
    return {
      defaut: 'ajouter',
      valeurs: [
        { cle: 'ajouter', libelle: 'En plus', note: 'la forme s\'ajoute à la scène' },
        { cle: 'remplacer', libelle: 'En remplacement', note: 'la scène est vidée d\'abord' }
      ]
    };
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
