/**
 * MODELAGIX — barre de gauche
 *
 * Trois groupes séparés, à la manière de l'ergonomie visée :
 *   1. les outils de sculpture
 *   2. l'affichage et la finesse du maillage
 *   3. les fichiers
 *
 * Disposition en colonnes plutôt qu'en colonne unique : dix-huit boutons
 * empilés dépasseraient la hauteur de l'écran sur un portable, et le regard
 * ne trouverait plus les groupes.
 *
 * Cette barre ne parle QU'À LA FAÇADE. Elle ignore tout du moteur : c'est ce
 * qui permettra d'en changer l'apparence, ou de la remplacer, sans rien casser.
 *
 * Les icônes viennent d'Icones.js. Les remplacer ne demandera aucune
 * modification ici.
 */

import Icones from 'modelagix/Icones';

var ID_STYLE = 'modelagix-style-barre';

/**
 * `touche` reprend les raccourcis déjà présents dans le moteur : on les expose
 * plutôt que d'en inventer, pour ne pas créer une seconde convention.
 */
var GROUPES = [{
  nom: 'Orientation des vues',
  colonnes: 3,
  elements: [
    { type: 'vue', cle: 'face', icone: 'vueFace', libelle: 'De face', touche: 'F' },
    { type: 'vue', cle: 'droite', icone: 'vueDroite', libelle: 'De droite' },
    { type: 'vue', cle: 'dessus', icone: 'vueDessus', libelle: 'De dessus', touche: 'T' },
    { type: 'vue', cle: 'arriere', icone: 'vueArriere', libelle: 'De derrière' },
    { type: 'vue', cle: 'gauche', icone: 'vueGauche', libelle: 'De gauche', touche: 'L' },
    { type: 'vue', cle: 'dessous', icone: 'vueDessous', libelle: 'De dessous' },
    { type: 'vue', cle: 'isometrique', icone: 'vueIsometrique', libelle: 'Isométrique' },
    { type: 'vue', cle: 'dimetrique', icone: 'vueDimetrique', libelle: 'Dimétrique' },
    { type: 'vue', cle: 'trimetrique', icone: 'vueTrimetrique', libelle: 'Trimétrique' },
    { type: 'action', cle: 'projection', icone: 'projectionPerspective', libelle: 'Projection' },
    { type: 'action', cle: 'recadrer', icone: 'recadrer', libelle: 'Recadrer sur la scène' }
  ]
}, {
  nom: 'Outils de sculpture',
  colonnes: 3,
  elements: [
    { type: 'outil', cle: 'draw', icone: 'draw', libelle: 'Dessiner', touche: '1' },
    { type: 'outil', cle: 'inflate', icone: 'inflate', libelle: 'Gonfler', touche: '2' },
    { type: 'outil', cle: 'crease', icone: 'crease', libelle: 'Creuser', touche: '7' },
    { type: 'outil', cle: 'flatten', icone: 'flatten', libelle: 'Aplatir', touche: '5' },
    { type: 'outil', cle: 'pinch', icone: 'pinch', libelle: 'Pincer', touche: '6' },
    { type: 'outil', cle: 'smooth', icone: 'smooth', libelle: 'Lisser', touche: '4' },
    { type: 'outil', cle: 'grab', icone: 'grab', libelle: 'Saisir', touche: '0' },
    { type: 'outil', cle: 'drag', icone: 'drag', libelle: 'Tirer', touche: '8' },
    { type: 'outil', cle: 'rotate', icone: 'rotate', libelle: 'Tourner', touche: '3' },
    { type: 'outil', cle: 'scale', icone: 'scale', libelle: 'Redimensionner', touche: null },
    { type: 'outil', cle: 'mask', icone: 'mask', libelle: 'Masquer', touche: null }
  ]
}, {
  nom: 'Affichage et maillage',
  colonnes: 3,
  elements: [
    { type: 'bascule', cle: 'wireframe', icone: 'wireframe', libelle: 'Afficher le maillage' },
    { type: 'bascule', cle: 'symmetry', icone: 'symmetry', libelle: 'Symétrie' },
    { type: 'action', cle: 'subdivisionMoins', icone: 'subdivisionMoins', libelle: 'Maillage plus grossier' },
    { type: 'action', cle: 'subdivisionPlus', icone: 'subdivisionPlus', libelle: 'Maillage plus fin' }
  ]
}, {
  nom: 'Scène et fichiers',
  colonnes: 3,
  elements: [
    { type: 'menu', cle: 'nouvelleForme', icone: 'nouvelleForme', libelle: 'Nouvelle forme de départ…' },
    { type: 'action', cle: 'importer', icone: 'importer', libelle: 'Ouvrir un fichier 3D' },
    { type: 'action', cle: 'enregistrer', icone: 'enregistrer', libelle: 'Enregistrer le travail (.sgl)' },
    { type: 'menu', cle: 'exporter', icone: 'exporter', libelle: 'Exporter…' },
    { type: 'action', cle: 'annuler', icone: 'annuler', libelle: 'Annuler (Ctrl+Z)' },
    { type: 'action', cle: 'retablir', icone: 'retablir', libelle: 'Rétablir (Ctrl+Y)' }
  ]
}];

var CSS = [
  '.modelagix-barre {',
  '  position: fixed;',
  '  left: 10px;',
  '  top: 50%;',
  '  transform: translateY(-50%);',
  '  z-index: 10;',
  '  padding: 6px;',
  '  border-radius: 10px;',
  '  background: rgba(30, 34, 40, 0.82);',
  '  -webkit-user-select: none;',
  '  user-select: none;',
  '}',
  '.modelagix-groupe {',
  '  display: grid;',
  '  gap: 2px;',
  '}',
  '.modelagix-groupe + .modelagix-groupe {',
  '  margin-top: 7px;',
  '  padding-top: 7px;',
  '  border-top: 1px solid rgba(255, 255, 255, 0.14);',
  '}',
  '.modelagix-outil {',
  '  width: 40px;',
  '  height: 40px;',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  padding: 0;',
  '  border: none;',
  '  border-radius: 7px;',
  '  background: transparent;',
  '  color: rgba(255, 255, 255, 0.7);',
  '  cursor: pointer;',
  '  transition: background 110ms ease, color 110ms ease;',
  '}',
  '.modelagix-outil:hover {',
  '  background: rgba(255, 255, 255, 0.1);',
  '  color: #fff;',
  '}',
  '.modelagix-outil.actif {',
  '  background: rgba(110, 168, 254, 0.22);',
  '  color: #8ec1ff;',
  '}',
  '.modelagix-outil:disabled {',
  '  opacity: 0.3;',
  '  cursor: default;',
  '}',
  '.modelagix-outil:focus-visible {',
  '  outline: 2px solid #6ea8fe;',
  '  outline-offset: -2px;',
  '}',
  // La couleur est portée par le trait : ces pictogrammes sont dessinés au
  // trait, pas remplis. currentColor la fait hériter du bouton, donc survol,
  // état actif et désactivé se règlent entièrement en CSS.
  '.modelagix-icone {',
  '  fill: none;',
  '  stroke: currentColor;',
  '  stroke-width: 2;',
  '  stroke-linecap: round;',
  '  stroke-linejoin: round;',
  '  pointer-events: none;',
  '}',
  '.modelagix-menu-formats {',
  '  position: fixed;',
  '  z-index: 11;',
  '  min-width: 200px;',
  '  padding: 5px;',
  '  border-radius: 9px;',
  '  background: rgba(36, 41, 48, 0.97);',
  '  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.45);',
  '  font: 12px/1.3 system-ui, -apple-system, sans-serif;',
  '}',
  '.modelagix-menu-formats button {',
  '  display: block;',
  '  width: 100%;',
  '  padding: 7px 10px;',
  '  border: none;',
  '  border-radius: 6px;',
  '  background: transparent;',
  '  color: rgba(255, 255, 255, 0.85);',
  '  font: inherit;',
  '  text-align: left;',
  '  cursor: pointer;',
  '}',
  '.modelagix-menu-formats button:hover {',
  '  background: rgba(110, 168, 254, 0.22);',
  '  color: #fff;',
  '}',
  '.modelagix-menu-formats .note {',
  '  display: block;',
  '  color: rgba(255, 255, 255, 0.45);',
  '}'
].join('\n');

class BarreOutils {

  /** @param {Object} facade  la façade — seul interlocuteur de cette barre */
  constructor(facade) {
    this._facade = facade;
    this._boutons = {};
    this._menuOuvert = null;

    Icones.injecter();
    this._injecterStyle();
    this._construire();

    // L'état peut changer sans passer par cette barre : raccourcis clavier,
    // maintien de Maj qui bascule sur Lissage, réglages du tiroir. On se
    // resynchronise après chaque interaction plutôt que de se croire seul
    // maître à bord.
    this._cbSync = this._synchroniser.bind(this);
    window.addEventListener('keydown', this._cbSync, false);
    window.addEventListener('keyup', this._cbSync, false);
    window.addEventListener('mouseup', this._cbSync, false);

    this._synchroniser();
  }

  _injecterStyle() {
    if (document.getElementById(ID_STYLE)) return;
    var style = document.createElement('style');
    style.id = ID_STYLE;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _construire() {
    var barre = document.createElement('div');
    barre.className = 'modelagix-barre';
    barre.setAttribute('role', 'toolbar');
    barre.setAttribute('aria-label', 'Outils MODELAGIX');

    for (var g = 0; g < GROUPES.length; ++g) {
      var groupe = GROUPES[g];
      var bloc = document.createElement('div');
      bloc.className = 'modelagix-groupe';
      bloc.style.gridTemplateColumns = 'repeat(' + groupe.colonnes + ', auto)';
      bloc.setAttribute('role', 'group');
      bloc.setAttribute('aria-label', groupe.nom);

      for (var i = 0; i < groupe.elements.length; ++i) {
        bloc.appendChild(this._creerBouton(groupe.elements[i]));
      }
      barre.appendChild(bloc);
    }

    document.body.appendChild(barre);
    this._barre = barre;
  }

  _creerBouton(def) {
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'modelagix-outil';
    bouton.innerHTML = Icones.baliser(def.icone);

    var etiquette = def.libelle + (def.touche ? ' (' + def.touche + ')' : '');
    bouton.title = etiquette;
    bouton.setAttribute('aria-label', etiquette);
    bouton.addEventListener('click', this._activer.bind(this, def), false);

    this._boutons[def.cle] = bouton;
    return bouton;
  }

  _activer(def, event) {
    var f = this._facade;
    switch (def.type) {

    case 'outil':
      f.setTool(def.cle);
      break;

    case 'bascule':
      if (def.cle === 'wireframe') f.setWireframe(!f.getWireframe());
      else if (def.cle === 'symmetry') f.setSymmetry(!f.getSymmetry());
      break;

    case 'vue':
      f.setView(def.cle);
      break;

    case 'action':
      if (def.cle === 'subdivisionPlus') f.subdivideUp();
      else if (def.cle === 'subdivisionMoins') f.subdivideDown();
      else if (def.cle === 'importer') f.openFile();
      else if (def.cle === 'enregistrer') f.saveProject();
      else if (def.cle === 'projection') f.toggleProjection();
      else if (def.cle === 'recadrer') f.resetView();
      else if (def.cle === 'annuler') f.undo();
      else if (def.cle === 'retablir') f.redo();
      break;

    case 'menu':
      this._ouvrirMenu(event.currentTarget,
        def.cle === 'nouvelleForme' ? f.listBaseShapes() : f.listExportFormats());
      return; // la synchronisation se fera à la fermeture
    }

    this._synchroniser();
  }

  /**
   * Petit menu ancré à un bouton.
   * @param {Element} bouton
   * @param {Array} entrees  [{libelle, note, action}, …]
   */
  _ouvrirMenu(bouton, entrees) {
    if (this._menuOuvert) return this._fermerMenu();

    var menu = document.createElement('div');
    menu.className = 'modelagix-menu-formats';
    menu.setAttribute('role', 'menu');

    for (var i = 0; i < entrees.length; ++i) {
      var entree = entrees[i];
      var item = document.createElement('button');
      item.type = 'button';
      item.setAttribute('role', 'menuitem');
      item.innerHTML = entree.libelle + '<span class="note">' + entree.note + '</span>';
      item.addEventListener('click', function (action) {
        this._fermerMenu();
        action();
        this._synchroniser();
      }.bind(this, entree.action), false);
      menu.appendChild(item);
    }

    document.body.appendChild(menu);
    var r = bouton.getBoundingClientRect();
    menu.style.left = (r.right + 8) + 'px';
    // On remonte le menu s'il dépasserait du bas de la fenêtre.
    var haut = Math.min(r.top, window.innerHeight - menu.offsetHeight - 10);
    menu.style.top = Math.max(10, haut) + 'px';

    this._menuOuvert = menu;

    // Fermeture au clic ailleurs, ou à Échap.
    this._cbFermer = function (ev) {
      if (ev.type === 'keydown' && ev.key !== 'Escape') return;
      if (ev.type === 'mousedown' && (menu.contains(ev.target) || bouton.contains(ev.target))) return;
      this._fermerMenu();
    }.bind(this);
    // En différé : sinon le clic qui vient d'ouvrir le menu le referme aussitôt.
    window.setTimeout(function () {
      window.addEventListener('mousedown', this._cbFermer, false);
      window.addEventListener('keydown', this._cbFermer, false);
    }.bind(this), 0);
  }

  _fermerMenu() {
    if (!this._menuOuvert) return;
    window.removeEventListener('mousedown', this._cbFermer, false);
    window.removeEventListener('keydown', this._cbFermer, false);
    if (this._menuOuvert.parentNode) this._menuOuvert.parentNode.removeChild(this._menuOuvert);
    this._menuOuvert = null;
  }

  /** Aligne l'état affiché sur l'état réel du moteur. */
  _synchroniser() {
    var f = this._facade;

    var courant = f.getTool();
    for (var g = 0; g < GROUPES.length; ++g) {
      var elements = GROUPES[g].elements;
      for (var i = 0; i < elements.length; ++i) {
        if (elements[i].type !== 'outil') continue;
        var cle = elements[i].cle;
        var actif = cle === courant;
        this._boutons[cle].classList.toggle('actif', actif);
        this._boutons[cle].setAttribute('aria-pressed', actif ? 'true' : 'false');
      }
    }

    this._marquerBascule('wireframe', f.getWireframe());
    this._marquerBascule('symmetry', f.getSymmetry());

    // La projection montre le mode courant par son dessin, pas par un
    // surlignage : on lit l'état sans avoir à l'interpréter.
    var projection = f.getProjection();
    var boutonProjection = this._boutons.projection;
    if (boutonProjection && boutonProjection.dataset.mode !== projection) {
      boutonProjection.dataset.mode = projection;
      boutonProjection.innerHTML = Icones.baliser(
        projection === 'orthographique' ? 'projectionOrthographique' : 'projectionPerspective');
      var etiquette = projection === 'orthographique'
        ? 'Projection orthographique — cliquer pour la perspective'
        : 'Projection en perspective — cliquer pour l\'orthographique';
      boutonProjection.title = etiquette;
      boutonProjection.setAttribute('aria-label', etiquette);
    }

    // Les boutons de finesse disent où l'on en est : sans cette indication,
    // rien ne distingue « déjà au plus fin » de « le bouton ne marche pas ».
    var res = f.getResolution();
    var suffixe = res ? '  —  niveau ' + res.niveau + ' sur ' + res.total : '';
    this._boutons.subdivisionPlus.title = 'Maillage plus fin' + suffixe;
    this._boutons.subdivisionMoins.title = 'Maillage plus grossier' + suffixe;
    this._boutons.subdivisionPlus.disabled = !res;
    this._boutons.subdivisionMoins.disabled = !res;
  }

  _marquerBascule(cle, actif) {
    var bouton = this._boutons[cle];
    if (!bouton) return;
    bouton.classList.toggle('actif', actif === true);
    bouton.setAttribute('aria-pressed', actif === true ? 'true' : 'false');
  }

  /** Retire la barre de la page. */
  detruire() {
    this._fermerMenu();
    window.removeEventListener('keydown', this._cbSync, false);
    window.removeEventListener('keyup', this._cbSync, false);
    window.removeEventListener('mouseup', this._cbSync, false);
    if (this._barre && this._barre.parentNode)
      this._barre.parentNode.removeChild(this._barre);
  }
}

export default BarreOutils;
