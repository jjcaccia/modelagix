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

/** Trois colonnes de 40 px, deux gouttières de 2, six de marge de chaque côté. */
var COLONNES = 3;
var COTE_BOUTON = 40;
var LARGEUR = COLONNES * COTE_BOUTON + (COLONNES - 1) * 2 + 30;

var GROUPES = [{
  // Les six vues orthogonales ont quitté cette barre : le cube d'orientation
  // les rend toutes, plus les huit coins et les douze arêtes, et il dit en
  // outre OÙ L'ON EST — ce qu'un bouton ne fait pas. Ne restent ici que les
  // vues axonométriques, qu'aucune face du cube ne donne, et les deux
  // réglages de cadrage.
  nom: 'Vues et cadrage',
  // Ce groupe quitte la colonne : la façade le range dans la rangée du haut,
  // à côté des matières et du cube d'orientation. Tout ce qui concerne le POINT
  // DE VUE s'y trouve alors réuni, et la colonne de gauche ne garde que ce qui
  // agit sur la matière.
  cle: 'vues',
  // Trois de front, deux rangs : six de front tenaient sur presque un tiers de
  // la rangée du haut, place qu'il faut au panneau de réglages.
  colonnes: 3,
  elements: [
    { type: 'vue', cle: 'isometrique', icone: 'vueIsometrique', libelle: 'Isométrique' },
    { type: 'vue', cle: 'dimetrique', icone: 'vueDimetrique', libelle: 'Dimétrique' },
    { type: 'vue', cle: 'trimetrique', icone: 'vueTrimetrique', libelle: 'Trimétrique' },
    { type: 'action', cle: 'projection', icone: 'projectionPerspective', libelle: 'Projection' },
    { type: 'action', cle: 'recadrer', icone: 'recadrer', libelle: 'Recadrer sur la scène' },
    // Une bascule, pas une action : tant qu'elle est enfoncée, le glissé au
    // bouton gauche déplace la vue au lieu de sculpter.
    { type: 'bascule', cle: 'deplacerVue', icone: 'deplacerVue',
      libelle: 'Déplacer la vue — glisser pour la faire coulisser' }
  ]
}, {
  // « Outils » tout court : la colonne ne contient plus que des outils, des
  // réglages de maillage, la scène et les fichiers. Un titre n'a pas à répéter
  // ce que la colonne dit déjà.
  nom: 'Outils',
  // Seul groupe que « Déplacer la vue » met hors service : tant que ce mode est
  // actif, le clic gauche fait glisser la vue et ne sculpte plus. Les vues, les
  // réglages d'affichage et les fichiers, eux, restent utilisables.
  cle: 'sculpture',
  colonnes: 3,
  elements: [
    { type: 'outil', cle: 'draw', icone: 'draw', libelle: 'Dessiner' },
    { type: 'outil', cle: 'inflate', icone: 'inflate', libelle: 'Gonfler' },
    { type: 'outil', cle: 'crease', icone: 'crease', libelle: 'Creuser' },
    { type: 'outil', cle: 'flatten', icone: 'flatten', libelle: 'Aplatir' },
    { type: 'outil', cle: 'pinch', icone: 'pinch', libelle: 'Pincer' },
    { type: 'outil', cle: 'smooth', icone: 'smooth', libelle: 'Lisser' },
    { type: 'outil', cle: 'grab', icone: 'grab', libelle: 'Saisir' },
    { type: 'outil', cle: 'drag', icone: 'drag', libelle: 'Tirer' },
    { type: 'outil', cle: 'rotate', icone: 'rotate', libelle: 'Tourner' },
    { type: 'outil', cle: 'scale', icone: 'scale', libelle: 'Redimensionner' },
    { type: 'outil', cle: 'mask', icone: 'mask', libelle: 'Masquer' },
    { type: 'outil', cle: 'transform', icone: 'transform',
      libelle: 'Transformer — déplacer, tourner, redimensionner l\'objet entier' }
  ]
}, {
  // Ne restent ici que les réglages qui portent sur le MAILLAGE lui-même : sa
  // densité, sa symétrie, son affichage. Tout ce qui met des volumes en présence
  // les uns des autres est passé dans « Scène ».
  nom: 'Maillage',
  colonnes: 3,
  elements: [
    { type: 'bascule', cle: 'wireframe', icone: 'wireframe', libelle: 'Afficher le maillage' },
    { type: 'bascule', cle: 'symmetry', icone: 'symmetry', libelle: 'Symétrie' },
    { type: 'action', cle: 'subdivisionMoins', icone: 'subdivisionMoins', libelle: 'Maillage plus grossier' },
    { type: 'action', cle: 'subdivisionPlus', icone: 'subdivisionPlus', libelle: 'Maillage plus fin' },
    { type: 'bascule', cle: 'detailDynamique', icone: 'detailDynamique',
      libelle: 'Détail dynamique — le maillage s\'affine sous le pinceau' },
    // Il était rangé avec les outils de sculpture parce qu'il se manie comme
    // un pinceau. Mais il ne déforme rien : il densifie. C'est du maillage.
    { type: 'affiner', cle: 'affiner', icone: 'affiner',
      libelle: 'Affiner le maillage — cliquer pour densifier, sans déformer' }
  ]
}, {
  // ── La scène : ce qui s'y trouve, et comment les volumes s'y combinent ──
  //
  // Ce groupe n'existait pas : ses icônes étaient réparties entre « maillage »
  // et « fichiers », deux endroits où l'on ne pense pas à les chercher. Faire
  // entrer une forme, en combiner deux, en supprimer une, montrer le sol : ce
  // sont autant de gestes qui portent sur LA SCÈNE, pas sur un maillage ni sur
  // un fichier.
  nom: 'Scène',
  cle: 'scene',
  colonnes: 3,
  elements: [
    { type: 'menu', cle: 'nouvelleForme', icone: 'nouvelleForme', libelle: 'Nouvelle 3D' },
    // Les deux portes d'entrée du logiciel portent le même nom, « Nouvelle 3D »,
    // et se distinguent par ce qui suit : une primitive, ou un fichier.
    { type: 'action', cle: 'importer', icone: 'importer', libelle: 'Nouvelle 3D importée' },
    { type: 'action', cle: 'volumeAddition', icone: 'volumeAddition',
      libelle: 'Additionner les volumes sélectionnés' },
    { type: 'action', cle: 'volumeSoustraction', icone: 'volumeSoustraction',
      libelle: 'Soustraire les autres au premier sélectionné' },
    { type: 'action', cle: 'volumeIntersection', icone: 'volumeIntersection',
      libelle: 'Ne garder que la partie commune' },
    { type: 'action', cle: 'volumeFondu', icone: 'volumeFondu',
      libelle: 'Fusionner en fondu — raccord adouci à la jonction' },
    { type: 'action', cle: 'volumeCreuxFondu', icone: 'volumeCreuxFondu',
      libelle: 'Creuser en fondu — empreinte aux bords adoucis' },
    { type: 'action', cle: 'volumeSupprimer', icone: 'volumeSupprimer',
      libelle: 'Supprimer les volumes sélectionnés' },
    // Une case vide, comme pour Annuler et Rétablir : vérifier et découper sont
    // les deux gestes de remise en état, et l'on passe de l'un à l'autre. Sur
    // trois colonnes ils tombaient de part et d'autre d'un retour à la ligne.
    { type: 'espace' },
    { type: 'action', cle: 'reparer', icone: 'reparer',
      libelle: 'Vérifier et réparer les volumes — rebouche les trous' },
    { type: 'bascule', cle: 'decouper', icone: 'decouper',
      libelle: 'Découper — entourer la zone à supprimer, la coupe se referme' },
    { type: 'bascule', cle: 'grille', icone: 'grille', libelle: 'Afficher la grille du sol' }
  ]
}, {
  nom: 'Fichiers',
  colonnes: 3,
  elements: [
    { type: 'action', cle: 'enregistrer', icone: 'enregistrer', libelle: 'Enregistrer le travail (.sgl)' },
    { type: 'menu', cle: 'exporter', icone: 'exporter', libelle: 'Exporter…' },
    // ── Une case vide, et elle est indispensable ───────────────────────
    // Annuler et Rétablir forment un COUPLE : on ne cherche jamais l'un sans
    // penser à l'autre, et la main va de l'un à l'autre sans regarder. Sur
    // trois colonnes, ils tombaient de part et d'autre d'un retour à la ligne.
    // Cette case les renvoie ensemble au début du rang suivant. La retirer, ou
    // insérer une icône avant elles, les sépare de nouveau.
    { type: 'espace' },
    { type: 'action', cle: 'annuler', icone: 'annuler', libelle: 'Annuler (Ctrl+Z)' },
    { type: 'action', cle: 'retablir', icone: 'retablir', libelle: 'Rétablir (Ctrl+Y)' }
  ]
}];

var CSS = [
  // Les quatre groupes sont désormais QUATRE BLOCS distincts, séparés par du
  // vide, au lieu d'un seul panneau coupé par des filets. Un filet se lit comme
  // un ornement ; un intervalle se lit comme une frontière.
  '.modelagix-barre {',
  '  position: fixed;',
  '  left: 22px;',
  '  z-index: 10;',
  '  display: flex;',
  '  flex-direction: column;',
  // ── Resserré en hauteur ───────────────────────────────────────────────
  // Quatre groupes empilés, chacun avec son intervalle et sa marge intérieure :
  // la place perdue entre les boutons finissait par dépasser la place qu'ils
  // occupent. La colonne tient maintenant sur un écran de téléphone, et le
  // relâchement horizontal — qui, lui, sert à séparer les colonnes — est
  // conservé.
  '  gap: 0px;',
  // Largeur et hauteur FIXES : trois colonnes de 40 px, gouttières de 2, plus
  // 6 de marge de chaque côté. Sans cela la colonne se redimensionnait au gré
  // de la fenêtre et changeait d'aspect — l'outil qu'on cherche doit toujours
  // se trouver au même endroit.
  '  width: ' + LARGEUR + 'px;',
  '  transition: top 250ms ease;',
  // Sur un écran étroit, la colonne reçoit en plus le groupe des vues et le
  // cube d'orientation : elle peut alors dépasser le bas de la fenêtre. Sa
  // hauteur maximale est posée par la disposition, qui seule connaît son haut.
  '  overflow-y: auto;',
  '  overflow-x: hidden;',
  '  scrollbar-width: thin;',
  '  scrollbar-color: rgba(255,255,255,0.18) transparent;',
  '  -webkit-user-select: none;',
  '  user-select: none;',
  '}',
  // Bord fondu plutôt que tranché : le panneau se dissout vers l'extérieur au
  // lieu de découper un rectangle dans la zone de travail. Plus discret, et
  // l'outil paraît posé sur la sculpture plutôt que devant elle.
  '.modelagix-groupe {',
  '  display: grid;',
  '  gap: 2px;',
  // Marge intérieure dissymétrique : large sur les côtés, où elle porte le
  // fondu du bord, courte en haut et en bas, où elle ne faisait que rallonger
  // la colonne. Le fondu vertical reste assuré par le masque.
  '  padding: 6px 15px 8px;',
  // ── Contour réellement flou ───────────────────────────────────────────
  // Ni bordure, ni masque : le fond est porté par un calque posé DERRIÈRE le
  // contenu et flouté. Le flou déborde du calque et s'éteint progressivement,
  // ce qui donne un pourtour diffus sur les quatre côtés, sans arête.
  //
  // Les masques en dégradé ont été essayés d'abord : un dégradé radial ne fond
  // que les coins, et deux dégradés croisés s'ADDITIONNENT par défaut au lieu
  // de s'intersecter — le résultat restait opaque partout.
  '  position: relative;',
  '  background: transparent;',
  '  isolation: isolate;',
  '  mask-image: radial-gradient(115% 115% at 50% 50%,',
  '    #000 0%, #000 62%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.28) 90%, rgba(0,0,0,0) 100%);',
  '}',
  // Le titre traverse toute la grille, quel que soit le nombre de colonnes.
  '.modelagix-titre-groupe {',
  '  grid-column: 1 / -1;',
  '  margin-bottom: 1px;',
  '  font: 600 9px/1.2 system-ui, -apple-system, sans-serif;',
  '  text-transform: uppercase;',
  '  letter-spacing: 0.9px;',
  '  color: rgba(255, 255, 255, 0.40);',
  // À gauche, comme tout ce qui se lit : centré, le titre flottait au-dessus
  // d'une grille dont la première colonne, elle, est bien calée à gauche.
  '  text-align: left;',
  '  white-space: nowrap;',
  '}',
  '.modelagix-espace {',
  '  width: ' + COTE_BOUTON + 'px;',
  '  height: ' + COTE_BOUTON + 'px;',
  '}',
  '.modelagix-outil {',
  '  width: ' + COTE_BOUTON + 'px;',
  '  height: ' + COTE_BOUTON + 'px;',
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
  // ── Pendant « Déplacer la vue » ────────────────────────────────────────
  // Le clic gauche fait glisser la vue : aucun outil de sculpture ne peut
  // agir. Ils s'atténuent pour le dire. Seul CE groupe est concerné — les vues,
  // l'affichage et les fichiers marchent toujours.
  //
  // Atténués, mais pas inertes : cliquer l'outil qu'on veut reprendre quitte le
  // mode et le sélectionne d'un seul geste. Un bouton grisé et mort obligerait
  // à retrouver la main d'abord, pour rien.
  //
  // On atténue les BOUTONS, pas le groupe : son fond flouté est porté par un
  // ::before, qui suivrait l'opacité du groupe et ferait pâlir le panneau
  // lui-même. Ce n'est pas le panneau qui est suspendu, ce sont les outils.
  '.modelagix-barre.deplacement .modelagix-groupe-sculpture > * {',
  '  opacity: 0.34;',
  '  transition: opacity 160ms ease;',
  '}',
  '.modelagix-barre.deplacement .modelagix-groupe-sculpture:hover > * {',
  '  opacity: 0.62;',
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
  '  min-width: 232px;',
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
  '}',
  // Une entrée porte sa vignette à gauche et son intitulé à droite.
  '.modelagix-menu-formats button.entree {',
  '  display: flex;',
  '  align-items: center;',
  '  gap: 10px;',
  '}',
  '.modelagix-menu-formats .modelagix-icone {',
  '  flex: 0 0 auto;',
  '  width: 30px;',
  '  height: 30px;',
  '  color: rgba(255, 255, 255, 0.72);',
  '}',
  '.modelagix-menu-formats button.entree:hover .modelagix-icone {',
  '  color: #fff;',
  '}',
  // ── La question, en tête ────────────────────────────────────────────
  // Deux bascules côte à côte plutôt qu'une case à cocher : l'une des deux est
  // toujours allumée, donc le choix courant se lit sans avoir à savoir ce que
  // « décoché » voudrait dire.
  '.modelagix-menu-choix {',
  '  display: flex;',
  '  gap: 4px;',
  '  margin: 3px 5px 8px;',
  '  padding-bottom: 8px;',
  '  border-bottom: 1px solid rgba(255, 255, 255, 0.10);',
  '}',
  '.modelagix-menu-formats button.choix {',
  '  width: auto;',
  '  flex: 1 1 0;',
  '  padding: 5px 8px;',
  '  border-radius: 5px;',
  '  background: rgba(255, 255, 255, 0.06);',
  '  color: rgba(255, 255, 255, 0.55);',
  '  font-size: 11px;',
  '  text-align: center;',
  '}',
  '.modelagix-menu-formats button.choix.actif {',
  '  background: rgba(110, 168, 254, 0.26);',
  '  color: #cfe0ff;',
  '}',
  '.modelagix-groupe::before {',
  '  content: \'\';',
  '  position: absolute;',
  '  inset: 26px;',
  '  border-radius: 16px;',
  '  background: rgba(26, 30, 36, 0.58);',
  '  filter: blur(22px);',
  '  z-index: -1;',
  '  pointer-events: none;',
  '}',
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
    // La façade prévient après chaque changement d'état. Sans cet abonnement,
    // cette barre restait sur l'état d'avant : l'intitulé du haut suivait
    // l'outil, mais le bouton surligné à gauche non.
    if (facade.onChange) facade.onChange(this._cbSync);
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
      bloc.className = 'modelagix-groupe' +
        (groupe.cle ? ' modelagix-groupe-' + groupe.cle : '');
      bloc.style.gridTemplateColumns = 'repeat(' + groupe.colonnes + ', ' + COTE_BOUTON + 'px)';
      bloc.setAttribute('role', 'group');
      bloc.setAttribute('aria-label', groupe.nom);

      // Un titre par groupe. Sans lui, quatre blocs d'icônes se lisent comme
      // une seule liste coupée arbitrairement ; avec lui, chacun annonce ce
      // qu'il contient et l'on cesse de chercher au mauvais endroit.
      var titre = document.createElement('div');
      titre.className = 'modelagix-titre-groupe';
      titre.textContent = groupe.nom;
      bloc.appendChild(titre);

      for (var i = 0; i < groupe.elements.length; ++i) {
        var element = groupe.elements[i];
        bloc.appendChild(element.type === 'espace'
          ? this._creerEspace() : this._creerBouton(element));
      }
      barre.appendChild(bloc);
    }

    document.body.appendChild(barre);
    this._barre = barre;
  }

  /** Une case vide de la taille d'un bouton, pour caler une grille. */
  _creerEspace() {
    var vide = document.createElement('div');
    vide.className = 'modelagix-espace';
    vide.setAttribute('aria-hidden', 'true');
    return vide;
  }

  _creerBouton(def) {
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'modelagix-outil';
    bouton.innerHTML = Icones.baliser(def.icone);

    // L'infobulle portait aussi le raccourci du moteur, entre parenthèses :
    // « Aplatir (5) ». Sans légende nulle part pour dire ce qu'est ce nombre,
    // il ne renseignait sur rien et brouillait le nom de l'outil. Les raccourcis
    // restent actifs — ils vivent dans le moteur, pas ici.
    bouton.title = def.libelle;
    bouton.setAttribute('aria-label', def.libelle);
    bouton.addEventListener('click', this._activer.bind(this, def), false);

    this._boutons[def.cle] = bouton;
    return bouton;
  }

  _activer(def, event) {
    var f = this._facade;
    switch (def.type) {

    case 'outil':
      // Choisir un outil de sculpture quitte les deux modes qui confisquent le
      // clic gauche. Les atténuer sans les rendre inertes évite le cul-de-sac :
      // le geste naturel — cliquer l'outil qu'on veut reprendre — suffit à
      // revenir au pinceau.
      if (f.isPanView()) f.setPanView(false);
      if (f.isRefineMode()) f.setRefineModeOff();
      if (f.isCutMode()) f.setCutModeOff();
      f.setTool(def.cle);
      break;

    case 'bascule':
      if (def.cle === 'wireframe') f.setWireframe(!f.getWireframe());
      else if (def.cle === 'symmetry') f.setSymmetry(!f.getSymmetry());
      else if (def.cle === 'detailDynamique') f.toggleDynamicTopology();
      else if (def.cle === 'grille') f.toggleGrid();
      else if (def.cle === 'deplacerVue') f.togglePanView();
      else if (def.cle === 'decouper') f.toggleCutMode();
      break;

    case 'vue':
      f.setView(def.cle);
      break;

    case 'affiner':
      if (f.isPanView()) f.setPanView(false);
      f.setRefineMode();
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
      else if (def.cle === 'volumeAddition') this._combiner('addition');
      else if (def.cle === 'volumeSoustraction') this._combiner('soustraction');
      else if (def.cle === 'volumeIntersection') this._combiner('intersection');
      else if (def.cle === 'volumeFondu') this._combiner('fondu');
      else if (def.cle === 'volumeCreuxFondu') this._combiner('creuxFondu');
      else if (def.cle === 'volumeSupprimer') this._supprimerVolume();
      else if (def.cle === 'reparer') this._reparer();
      break;

    case 'menu':
      if (def.cle === 'nouvelleForme') {
        this._ouvrirMenu(event.currentTarget, f.listBaseShapes(), f.baseShapeModes());
      } else {
        this._ouvrirMenu(event.currentTarget, f.listExportFormats());
      }
      return; // la synchronisation se fera à la fermeture
    }

    this._synchroniser();
  }

  /** Le bloc des vues, que la façade déplace dans la rangée du haut. */
  groupeVues() {
    return this._barre.querySelector('.modelagix-groupe-vues');
  }

  /**
   * Combine les volumes sélectionnés.
   *
   * Deux volumes au moins sont nécessaires, et la sélection multiple se fait
   * avec Maj + clic sur l'objet. On le DIT plutôt que de laisser le bouton
   * paraître cassé — c'est le genre de condition qu'on ne devine pas.
   */
  _combiner(operation) {
    var f = this._facade;
    if (f.countSelectedVolumes() < 2) {
      window.alert('Il faut au moins deux volumes sélectionnés.\n\n' +
        'Pour en sélectionner un second, maintenez la touche Maj et cliquez ' +
        'dessus dans la vue.');
      return;
    }
    if (!f.combineVolumes(operation)) {
      window.alert('La combinaison n\'a rien produit : les volumes ne se ' +
        'touchent peut-être pas.');
    }
  }

  /**
   * Vérifie les volumes et rebouche ce qui peut l'être.
   *
   * On répond TOUJOURS, même quand tout va bien : un bouton qui ne dit rien
   * quand on le presse laisse croire qu'il n'a pas marché.
   */
  _reparer() {
    var f = this._facade;
    // L'examen APPROFONDI : c'est un geste explicite, on peut y passer une
    // seconde. C'est aussi la seule porte d'entrée vers la mesure des parois et
    // la recherche de pénétrations, que la surveillance continue ne fait pas.
    var bilan = f.deepDiagnoseScene();

    if (bilan.sain) {
      window.alert('Rien à signaler.\n\n' +
        'Les volumes sont fermés, d\'un seul tenant, sans paroi trop mince ni ' +
        'partie qui se traverse — du moins là où les sondages ont regardé.');
      return;
    }

    var fait = f.repairScene();
    var message = fait.trousBouches > 0
      ? fait.trousBouches + (fait.trousBouches > 1 ? ' trous rebouchés' : ' trou rebouché') +
        ' sur ' + fait.volumesRepares + (fait.volumesRepares > 1 ? ' volumes.' : ' volume.')
      : 'Aucun trou à reboucher.';

    var reste = [];
    if (bilan.morceauxEnTrop > 0) {
      reste.push((bilan.morceauxEnTrop + 1) + ' morceaux séparés');
    }
    if (bilan.aiguilles > 0) {
      reste.push(bilan.aiguilles + ' éclat' + (bilan.aiguilles > 1 ? 's' : '') +
        ' sans épaisseur');
    }
    if (bilan.paroisMinces) {
      reste.push('des parois trop minces (jusqu\'à ' +
        (Math.round(bilan.epaisseurMinimale * 1000) / 10) + ' % de la taille de l\'objet)');
    }
    if (bilan.intersections) {
      reste.push('des parties du volume qui se traversent');
    }
    if (bilan.aretesSurchargees > 0) {
      reste.push(bilan.aretesSurchargees + ' arête' +
        (bilan.aretesSurchargees > 1 ? 's' : '') + ' portant plus de deux faces');
    }
    if (reste.length) {
      message += '\n\nIl reste : ' + reste.join(', ') + '.\n\n' +
        'Cela ne se répare pas point par point. Le témoin en bas à droite ' +
        'propose de REFONDRE le volume : une surface propre est reconstruite ' +
        'à partir du volume occupé, mais le détail fin ne survit pas.';
      if (bilan.morceauxEnTrop > 0) {
        message += '\n\nLes morceaux vraiment séparés resteront séparés : ' +
          'on ne soude pas ce qui ne se touche pas.';
      }
    }
    window.alert(message);
  }

  _supprimerVolume() {
    var f = this._facade;
    if (f.countVolumes() < 2) {
      window.alert('C\'est le seul volume de la scène — il n\'y aurait plus ' +
        'rien à sculpter.');
      return;
    }
    f.deleteVolumes();
  }

  /**
   * Petit menu ancré à un bouton.
   *
   * @param {Element} bouton
   * @param {Array} entrees  [{libelle, note, icone, action}, …]
   * @param {Object} [choix] {defaut, valeurs:[{cle, libelle, note}]} — une
   *   question posée AVANT les entrées, dont la réponse leur est transmise.
   *   « Nouvelle 3D » s'en sert pour demander si la forme vient en plus ou en
   *   remplacement ; la question se pose une fois, pas une fois par forme, ce
   *   qui éviterait huit entrées là où quatre suffisent.
   */
  _ouvrirMenu(bouton, entrees, choix) {
    if (this._menuOuvert) return this._fermerMenu();

    var menu = document.createElement('div');
    menu.className = 'modelagix-menu-formats';
    menu.setAttribute('role', 'menu');

    var reponse = { cle: choix ? choix.defaut : null };
    if (choix) menu.appendChild(this._creerChoix(choix, reponse));

    for (var i = 0; i < entrees.length; ++i) {
      var entree = entrees[i];
      var item = document.createElement('button');
      item.type = 'button';
      item.setAttribute('role', 'menuitem');
      item.className = 'entree';
      item.innerHTML = (entree.icone ? Icones.baliser(entree.icone) : '') +
        '<span class="intitule">' + entree.libelle +
        '<span class="note">' + entree.note + '</span></span>';
      item.addEventListener('click', function (action) {
        this._fermerMenu();
        action(reponse.cle);
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
    // À la CAPTURE, et non à la remontée : le moteur arrête la propagation du
    // clic dans la zone de dessin, si bien qu'un menu ouvert par mégarde y
    // restait — et le clic destiné à s'en débarrasser sculptait au passage.
    window.setTimeout(function () {
      window.addEventListener('mousedown', this._cbFermer, true);
      window.addEventListener('keydown', this._cbFermer, true);
    }.bind(this), 0);
  }

  /**
   * La question posée en tête du menu, sous forme de deux bascules.
   *
   * La réponse est rangée dans un objet PARTAGÉ avec les entrées : elles la
   * lisent au moment du clic, et non à la construction — sans quoi elles
   * garderaient la valeur qu'elle avait à l'ouverture du menu.
   */
  _creerChoix(choix, reponse) {
    var bloc = document.createElement('div');
    bloc.className = 'modelagix-menu-choix';
    var boutons = [];

    for (var i = 0; i < choix.valeurs.length; ++i) {
      var valeur = choix.valeurs[i];
      var bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'choix' + (valeur.cle === choix.defaut ? ' actif' : '');
      bouton.textContent = valeur.libelle;
      bouton.title = valeur.note;
      bouton.addEventListener('click', function (cle, ev) {
        ev.stopPropagation();
        reponse.cle = cle;
        for (var j = 0; j < boutons.length; ++j) {
          boutons[j].classList.toggle('actif', boutons[j] === ev.currentTarget);
        }
      }.bind(this, valeur.cle), false);
      boutons.push(bouton);
      bloc.appendChild(bouton);
    }
    return bloc;
  }

  _fermerMenu() {
    if (!this._menuOuvert) return;
    window.removeEventListener('mousedown', this._cbFermer, true);
    window.removeEventListener('keydown', this._cbFermer, true);
    if (this._menuOuvert.parentNode) this._menuOuvert.parentNode.removeChild(this._menuOuvert);
    this._menuOuvert = null;
  }

  /** Aligne l'état affiché sur l'état réel du moteur. */
  _synchroniser() {
    var f = this._facade;

    var affinage = f.isRefineMode();
    this._marquerBascule('affiner', affinage);
    this._marquerBascule('decouper', f.isCutMode());

    // En mode affinage, l'outil support (Creuser) ne doit pas paraître actif :
    // ce serait annoncer une gravure qui n'a pas lieu, la force étant nulle.
    var courant = affinage ? null : f.getTool();
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
    this._marquerBascule('detailDynamique', f.isDynamicTopology());
    this._marquerBascule('grille', f.getGrid());
    this._marquerBascule('deplacerVue', f.isPanView());

    // Tant que la vue se déplace, la sculpture est suspendue : le groupe des
    // outils s'atténue pour le dire, sans devenir inerte pour autant.
    this._barre.classList.toggle('deplacement', f.isPanView());

    var dynamique = f.isDynamicTopology();

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
    // Les niveaux de subdivision et le détail dynamique s'excluent : le mode
    // dynamique convertit l'objet et abandonne les niveaux. On grise plutôt
    // que de laisser cliquer sur ce qui ne peut plus rien faire.
    this._boutons.subdivisionPlus.disabled = !res || dynamique;
    this._boutons.subdivisionMoins.disabled = !res || dynamique;
  }

  _marquerBascule(cle, actif) {
    var bouton = this._boutons[cle];
    if (!bouton) return;
    bouton.classList.toggle('actif', actif === true);
    bouton.setAttribute('aria-pressed', actif === true ? 'true' : 'false');
  }

  /**
   * La colonne, dont la disposition règle le haut et la hauteur.
   *
   * Elle ne se place plus elle-même : son haut dépend du nom de l'application,
   * dont la place dépend à son tour de la rangée. Trois éléments enchaînés,
   * donc un seul endroit pour les calculer — voir Disposition.js.
   */
  element() {
    return this._barre;
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
