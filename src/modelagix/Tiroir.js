/**
 * MODELAGIX — les tiroirs des fonctions avancées
 *
 * L'interface d'origine (yagui) n'est pas supprimée : elle est rangée hors du
 * champ et rappelée à la demande. Ses deux barres — celle du haut et celle de
 * droite — sont **indépendantes** : chacune a sa languette. Elles ne portent
 * pas les mêmes fonctions, il n'y a aucune raison de les lier.
 *
 * Pourquoi passer par le `setVisibility` de yagui plutôt que par du CSS :
 * yagui recalcule lui-même la zone de dessin quand une barre disparaît, et
 * prévient le moteur. Escamoter les barres à la main laisserait un vide.
 *
 * Pourquoi des languettes visibles plutôt qu'un survol du bord : on sculpte en
 * glissant la souris, et un trait tiré jusqu'au bord ferait surgir le panneau
 * en plein geste. Une languette se voit, ce qui compte pour un élève qui
 * découvre l'outil, et ne se déclenche jamais par accident.
 *
 * ── Notification ──────────────────────────────────────────────────────────
 * Les autres éléments de l'interface doivent se replacer quand une barre
 * apparaît. S'appuyer sur `mouseup` ne marche pas : `mouseup` précède `click`,
 * donc ils se replaçaient AVANT que le tiroir ait bougé, avec l'ancienne
 * mesure. D'où `surChangement()` : on prévient explicitement, après coup.
 */

var ID_STYLE = 'modelagix-style-tiroir';

// 24 px d'épaisseur. Une première version en faisait 16 : trop étroit, je l'ai
// ratée moi-même à la souris pendant les essais. La longueur compense la
// finesse de la cible.
var EPAISSEUR = 24;

/** Durée du glissement, en millisecondes. Assez pour suivre l'œil, assez court
 *  pour ne jamais faire attendre. */
var DUREE = 250;

/**
 * Largeur de la languette du haut, réutilisée pour décaler le premier menu.
 *
 * Elle mesurait 120 px, autant que la longueur de la languette de droite, par
 * souci de symétrie. Mais les deux ne jouent pas le même rôle : celle de droite
 * est seule sur son bord, celle du haut partage l'angle avec le nom de
 * l'application. 48 px suffisent largement à la viser — c'est deux fois
 * l'épaisseur —, et l'angle respire.
 */
var LARGEUR_LANGUETTE_HAUT = 48;

/** Barre de droite resserrée : la police y a été réduite à 11 px. */
var LARGEUR_BARRE_DROITE = 232;

var CSS = [
  '.modelagix-languette {',
  '  position: fixed;',
  '  z-index: 10;',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  padding: 0;',
  '  border: none;',
  '  background: rgba(30, 34, 40, 0.85);',
  '  color: rgba(255, 255, 255, 0.75);',
  '  font-size: 16px;',
  '  line-height: 1;',
  '  cursor: pointer;',
  '  transition: background 120ms ease, color 120ms ease;',
  '  -webkit-user-select: none;',
  '  user-select: none;',
  '}',
  '.modelagix-languette:hover {',
  '  background: rgba(52, 58, 68, 0.95);',
  '  color: #fff;',
  '}',
  '.modelagix-languette:focus-visible {',
  '  outline: 2px solid #6ea8fe;',
  '  outline-offset: 2px;',
  '}',
  '.modelagix-languette-droite {',
  '  top: 50%;',
  '  transform: translateY(-50%);',
  '  width: ' + EPAISSEUR + 'px;',
  '  height: 120px;',
  '  border-radius: 6px 0 0 6px;',
  '}',
  // Alignée sur la colonne de gauche, AU-DESSUS du cube : le cube démarre
  // 52 px plus bas, ce qui laisse exactement la place de cette languette.
  //
  // Elle ne commence plus au bord : le nom de l'application occupe l'angle et
  // publie la place qu'il prend dans `--modelagix-nom-reserve` (voir
  // NomApplication.js). La valeur de repli, 22 px, est l'ancienne position —
  // elle sert si le nom n'a pas encore été posé.
  '.modelagix-languette-haut {',
  '  left: var(--modelagix-nom-reserve, 22px);',
  '  width: ' + LARGEUR_LANGUETTE_HAUT + 'px;',
  '  height: ' + EPAISSEUR + 'px;',
  '  border-radius: 0 0 6px 6px;',
  '}',
  '.modelagix-languette {',
  '  transition: top 250ms ease, right 250ms ease, background 120ms ease, color 120ms ease;',
  '}',
  // Les menus déroulants de l'interface d'origine descendent depuis la barre
  // du haut : ils doivent passer PAR-DESSUS nos barres, sinon ils s'ouvrent
  // derrière et deviennent inutilisables. Nos éléments sont en 10.
  // La page est blanche par défaut, et le moteur efface son canevas en
  // transparent : pendant qu'une barre glisse, la zone libérée n'est pas
  // encore peinte et laisse voir ce blanc. On met donc la page à la teinte de
  // l'application, ce qui rend le passage invisible.
  'html, body {',
  '  background: #303030;',
  '}',
  '.gui-topbar {',
  '  z-index: 20 !important;',
  '}',
  // Polices réduites dans les deux tiroirs : ils portent des réglages avancés,
  // consultés rarement. Une taille plus modeste réduit d'autant la place qu'ils
  // prennent quand on les ouvre.
  '.gui-sidebar, .gui-topbar {',
  '  font-size: 11px !important;',
  '}',
  '.gui-sidebar li, .gui-topbar li, .gui-sidebar label, .gui-topbar label,',
  '.gui-sidebar select, .gui-sidebar input, .gui-sidebar button {',
  '  font-size: 11px !important;',
  '}',
  // Le nom de l'application et la languette occupent le coin gauche. Sans ce
  // décalage, ouvrir le tiroir laissait la souris pile sur le premier menu, qui
  // se dépliait tout seul — le geste d'ouverture déclenchait une action non
  // demandée ; et le nom recouvrirait ce même menu.
  //
  // Le `ul` commence lui-même à 10 px du bord : on retranche donc 10 pour que le
  // menu démarre bien 6 px après la languette.
  '.gui-topbar > ul > li:first-child {',
  '  margin-left: calc(var(--modelagix-nom-reserve, 22px) + ' +
    (LARGEUR_LANGUETTE_HAUT - 4) + 'px);',
  '}'
].join('\n');

class Tiroir {

  /**
   * @param {Object} gui   l'instance Gui de SculptGL (celle qui détient yagui)
   * @param {Object} main  l'application (Scene)
   */
  constructor(gui, main) {
    this._gui = gui;
    this._main = main;
    this._ecouteurs = [];

    // yagui démarre visible côté moteur ; on ferme les deux tiroirs juste
    // après la construction. La nouvelle interface couvre désormais l'usage
    // courant : les réglages d'origine n'ont plus à occuper l'écran d'entrée.
    this._etat = { haut: true, droite: true };

    this._injecterStyle();
    this._languettes = {
      droite: this._creerLanguette('droite', 'modelagix-languette-droite'),
      haut: this._creerLanguette('haut', 'modelagix-languette-haut')
    };
    this._brancherClavier();

    // La largeur de la barre latérale est ajustable à la souris : on repositionne
    // les languettes après chaque relâchement, et à chaque redimensionnement.
    this._cbPositionner = this._positionner.bind(this);
    window.addEventListener('resize', this._cbPositionner, false);
    window.addEventListener('mouseup', this._cbPositionner, false);

    this._resserrerBarreDroite();
    this._rafraichir();

    // Fermeture initiale, sans animation : on ne montre pas un mouvement que
    // l'utilisateur n'a pas demandé.
    this.definir('haut', false, true);
    this.definir('droite', false, true);
  }

  /**
   * Réduit la barre de droite. Sa largeur d'origine était calculée pour une
   * police plus grande ; celle-ci ayant été réduite, autant récupérer la place.
   *
   * On déplace aussi sa poignée de redimensionnement : yagui la positionne une
   * seule fois, à la création, d'après la largeur d'alors.
   */
  _resserrerBarreDroite() {
    var barre = this._gui._sidebar;
    if (!barre || !barre.domSidebar) return;
    barre.domSidebar.style.width = LARGEUR_BARRE_DROITE + 'px';
    if (barre.domResize) barre.domResize.style.right = LARGEUR_BARRE_DROITE + 'px';
    if (barre.callbackResize) barre.callbackResize();
  }

  _injecterStyle() {
    if (document.getElementById(ID_STYLE)) return;
    var style = document.createElement('style');
    style.id = ID_STYLE;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _creerLanguette(partie, classe) {
    var bouton = document.createElement('button');
    bouton.className = 'modelagix-languette ' + classe;
    bouton.type = 'button';
    bouton.addEventListener('click', this.basculer.bind(this, partie), false);
    document.body.appendChild(bouton);
    return bouton;
  }

  _brancherClavier() {
    this._cbClavier = function (event) {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
      // Capture avant SculptGL, et on empêche le navigateur de déplacer le focus.
      event.preventDefault();
      event.stopPropagation();
      // Tab agit sur les deux d'un coup : c'est le geste « libérer l'écran ».
      // Les languettes servent au réglage fin, partie par partie.
      var tout = this.estOuvert('haut') || this.estOuvert('droite');
      this.definir('haut', !tout);
      this.definir('droite', !tout);
    }.bind(this);
    window.addEventListener('keydown', this._cbClavier, true);
  }

  // -----------------------------------------------------------------
  //  Notification
  // -----------------------------------------------------------------

  /** Prévient à chaque changement d'état. Reçoit {haut, droite}. */
  surChangement(callback) {
    this._ecouteurs.push(callback);
  }

  _prevenir() {
    for (var i = 0; i < this._ecouteurs.length; ++i) {
      this._ecouteurs[i]({ haut: this._etat.haut, droite: this._etat.droite });
    }
  }

  // -----------------------------------------------------------------
  //  Placement
  // -----------------------------------------------------------------

  /** Hauteur occupée par la barre du haut, 0 si elle est rangée. */
  hauteurBarreHaut() {
    var haut = this._gui._topbar && this._gui._topbar.domTopbar;
    return (haut && !haut.hidden) ? haut.offsetHeight : 0;
  }

  /** Largeur occupée par la barre de droite, 0 si elle est rangée. */
  largeurBarreDroite() {
    var barre = this._gui._sidebar && this._gui._sidebar.domSidebar;
    return (barre && !barre.hidden) ? barre.offsetWidth : 0;
  }

  _positionner() {
    // Chaque languette se colle contre sa barre, ou contre le bord si rangée.
    this._languettes.droite.style.right = this.largeurBarreDroite() + 'px';
    this._languettes.haut.style.top = this.hauteurBarreHaut() + 'px';
  }

  _rafraichir() {
    this._positionner();

    var decrire = function (bouton, ouvert, ferme, chevron) {
      var etiquette = ouvert ? ferme : chevron;
      bouton.title = etiquette;
      bouton.setAttribute('aria-label', etiquette);
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    };

    this._languettes.droite.textContent = this._etat.droite ? '›' : '‹';
    decrire(this._languettes.droite, this._etat.droite,
      'Masquer les réglages de droite', 'Afficher les réglages de droite');

    this._languettes.haut.textContent = this._etat.haut ? '⌃' : '⌄';
    decrire(this._languettes.haut, this._etat.haut,
      'Masquer les menus du haut', 'Afficher les menus du haut');
  }

  // -----------------------------------------------------------------
  //  État
  // -----------------------------------------------------------------

  /** @param {string} [partie] 'haut' ou 'droite' ; sans argument, l'un ou l'autre */
  estOuvert(partie) {
    if (!partie) return this._etat.haut || this._etat.droite;
    return this._etat[partie] === true;
  }

  /**
   * @param {string} partie   'haut' ou 'droite'
   * @param {boolean} visible
   *
   * ── L'animation ───────────────────────────────────────────────────────
   * yagui masque ses barres avec l'attribut `hidden`, c'est-à-dire
   * `display: none` — qui ne s'anime pas. On glisse donc la barre hors du
   * champ par une transformation CSS, ET on appelle son `setVisibility` au bon
   * moment : tout de suite à l'ouverture, à la fin du glissement à la
   * fermeture.
   *
   * Conséquence assumée : la zone de dessin, elle, se redimensionne d'un coup,
   * puisque c'est yagui qui la recalcule. Le glissement des panneaux suffit à
   * donner la continuité du geste.
   */
  definir(partie, visible, sansAnimation) {
    if (this._etat[partie] === visible) return;
    this._etat[partie] = visible;

    if (sansAnimation) {
      var immediat = partie === 'haut' ? this._gui._topbar : this._gui._sidebar;
      if (immediat) immediat.setVisibility(visible);
      this._rafraichir();
      this._main.render();
      this._prevenir();
      return;
    }

    var conteneur = partie === 'haut'
      ? (this._gui._topbar && this._gui._topbar.domTopbar)
      : (this._gui._sidebar && this._gui._sidebar.domSidebar);
    var barre = partie === 'haut' ? this._gui._topbar : this._gui._sidebar;
    var sortie = partie === 'haut' ? 'translateY(-100%)' : 'translateX(100%)';

    if (conteneur) {
      conteneur.style.transition = 'transform ' + DUREE + 'ms ease';
      if (visible) {
        conteneur.style.transform = sortie;
        if (barre) barre.setVisibility(true);
        // Un temps de rendu avant de lancer le retour, sinon le navigateur
        // applique les deux transformations d'un bloc et rien ne s'anime.
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            conteneur.style.transform = '';
          });
        });
      } else {
        conteneur.style.transform = sortie;
        window.setTimeout(function () {
          if (this._etat[partie] !== false || !barre) return;
          barre.setVisibility(false);
          conteneur.style.transform = '';
          // Indispensable : tant que l'animation dure, la barre occupe encore
          // sa place et `largeurBarreDroite` renvoie l'ancienne mesure. Sans
          // ce second passage, les languettes restaient décalées après une
          // fermeture.
          this._rafraichir();
          this._prevenir();
        }.bind(this), DUREE);
      }
    } else if (barre) {
      barre.setVisibility(visible);
    }

    this._rafraichir();
    this._main.render();
    this._prevenir();
  }

  basculer(partie) {
    this.definir(partie, !this._etat[partie]);
  }

  ouvrirTout() {
    this.definir('haut', true);
    this.definir('droite', true);
  }

  fermerTout() {
    this.definir('haut', false);
    this.definir('droite', false);
  }

  /** Retire tout ce que les tiroirs ont ajouté à la page. */
  detruire() {
    window.removeEventListener('resize', this._cbPositionner, false);
    window.removeEventListener('mouseup', this._cbPositionner, false);
    window.removeEventListener('keydown', this._cbClavier, true);
    for (var partie in this._languettes) {
      var l = this._languettes[partie];
      if (l && l.parentNode) l.parentNode.removeChild(l);
    }
  }
}

export default Tiroir;
