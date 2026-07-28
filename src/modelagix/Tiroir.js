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

import Icones from 'modelagix/Icones';

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
  // Elle ne porte plus un chevron mais l'icône des réglages : un chevron ne
  // disait que « ça s'ouvre », l'icône dit ce qu'on y trouve.
  '.modelagix-languette-droite .modelagix-icone {',
  '  width: 18px;',
  '  height: 18px;',
  '  fill: none;',
  '  stroke: currentColor;',
  '  stroke-width: 2;',
  '  stroke-linecap: round;',
  '  stroke-linejoin: round;',
  '  pointer-events: none;',
  '}',
  // Tiroir ouvert, la languette prend le bleu des éléments actifs : le sens du
  // clic n'est plus écrit, il est indiqué comme partout ailleurs dans l'interface.
  '.modelagix-languette-droite.ouvert {',
  '  color: #8ec1ff;',
  '  background: rgba(110, 168, 254, 0.20);',
  '}',
  // ── Le tiroir de droite lui-même ──────────────────────────────────────
  // Le moteur lui donnait un contour « double » de 3 px à 30 % de blanc : une
  // arête franche, plus lourde que tout le reste de l'interface. Un filet d'un
  // pixel suffit à poser la limite ; c'est l'ombre portée VERS LA GAUCHE, donc
  // vers la scène, qui fait le reste — la profondeur sans le trait.
  //
  // `!important` sur la bordure seulement : c'est la seule propriété que la
  // feuille du moteur redéclare.
  '.gui-sidebar {',
  '  border-left: 1px solid rgba(255, 255, 255, 0.08) !important;',
  '  box-shadow: -18px 0 36px rgba(0, 0, 0, 0.34);',
  '}',
  // ── Les menus du haut, descendus dans le tiroir de droite ─────────────
  // Ils étaient posés en rangée (`float: left`), ce qui demandait 1 420 px. En
  // colonne, ils tiennent dans les 232 px du tiroir. Leurs sous-menus, eux,
  // n'ont rien à changer : ils font 220 px et s'ouvrent déjà en dessous de leur
  // titre — c'est ce qui rendait la fusion possible sans les réécrire.
  //
  // ⚠️ Toute la mise en forme des menus était écrite pour `.gui-topbar`. En les
  // sortant de là, ils ont perdu d'un coup leur mise en rangée — tant mieux —
  // mais AUSSI le repli de leurs sous-menus : les neuf s'ouvraient à la fois et
  // se chevauchaient. Les règles ci-dessous rejouent celles du moteur, à
  // l'orientation près. Ne pas en retirer une en la croyant décorative.
  '.modelagix-menus-fusionnes {',
  '  list-style-type: none;',
  '  margin: 8px 0 0;',
  '  padding: 6px 0 0;',
  '  border-top: 1px solid rgba(255, 255, 255, 0.08);',
  '}',
  '.modelagix-menus-fusionnes > li {',
  '  float: none;',
  '  display: block;',
  '  position: relative;',
  '  width: auto;',
  '  line-height: 26px;',
  '  padding: 0 12px;',
  '  cursor: pointer;',
  '}',
  '.modelagix-menus-fusionnes > li:hover {',
  '  color: #fff;',
  '  background: rgba(255, 255, 255, 0.05);',
  '}',
  // Le sous-menu s'ouvre par-dessus ce qui suit, comme dans la barre d'origine.
  // 208 px plus 2 × 8 de marge intérieure : il tient dans les 232 du tiroir.
  '.modelagix-menus-fusionnes > li > ul {',
  '  display: none;',
  '  position: absolute;',
  '  top: 24px;',
  '  left: 4px;',
  '  z-index: 30;',
  '  width: 208px;',
  '  padding: 8px;',
  '  list-style-type: none;',
  '  background: #13161a;',
  '  border-radius: 5px;',
  '  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);',
  '}',
  '.modelagix-menus-fusionnes > li:hover > ul {',
  '  display: block;',
  '}',
  '.modelagix-menus-fusionnes > li > ul > li {',
  '  float: none;',
  '  height: 22px;',
  '  line-height: 22px;',
  '  margin: 6px 0;',
  '  padding-left: 5px;',
  '}',
  '.modelagix-menus-fusionnes .shortcut {',
  '  float: right;',
  '  font-style: oblique;',
  '  margin-right: 11px;',
  '}',
  // Alignée sur la colonne de gauche, AU-DESSUS du cube : le cube démarre
  // 52 px plus bas, ce qui laisse exactement la place de cette languette.
  //
  // Elle ne commence plus au bord : le nom de l'application occupe l'angle et
  // publie la place qu'il prend dans `--modelagix-nom-reserve` (voir
  // NomApplication.js). La valeur de repli, 22 px, est l'ancienne position —
  // elle sert si le nom n'a pas encore été posé.
  // Elle ne descend plus sous la barre quand le tiroir s'ouvre : elle reste
  // collée au bord, à côté du nom, et c'est le chevron qui dit l'état. Le geste
  // « ouvrir » et le geste « fermer » se font donc au même endroit, ce qui vaut
  // mieux qu'une cible qui se dérobe. Il faut pour cela qu'elle passe DEVANT les
  // menus (20) : sans ce plan, elle serait recouverte dès l'ouverture.
  '.modelagix-languette-haut {',
  '  left: var(--modelagix-nom-reserve, 22px);',
  '  top: 0;',
  '  z-index: 30;',
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
  // La règle qui décalait le premier menu de la barre du haut a disparu avec la
  // barre elle-même : les menus vivent désormais dans le tiroir de droite, où
  // rien ne les recouvre.
  '.modelagix-menus-fusionnes > li:first-child {',
  '  margin-top: 2px;',
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
    // Vrai pendant les deux images où la languette de droite est maintenue en
    // position fermée, le temps que le glissement du panneau démarre.
    this._languetteRetenue = false;

    // yagui démarre visible côté moteur ; on ferme le tiroir juste après la
    // construction. La nouvelle interface couvre désormais l'usage courant :
    // les réglages d'origine n'ont plus à occuper l'écran d'entrée.
    //
    // `haut` reste dans l'état pour que le reste du code n'ait pas à se
    // demander s'il existe encore, mais il ne bouge plus : les menus du haut
    // vivent maintenant dans le tiroir de droite (voir `_fusionner`).
    this._etat = { haut: false, droite: true };

    this._injecterStyle();
    // Le sprite d'icônes doit exister avant que la languette n'y renvoie : les
    // tiroirs se construisent avant la barre d'outils, qui l'installe d'ordinaire.
    // L'appel est sans effet s'il est déjà là.
    Icones.injecter();
    this._fusionner();
    this._languettes = {
      droite: this._creerLanguette('droite', 'modelagix-languette-droite')
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
    this.definir('droite', false, true);
  }

  /**
   * ── La fusion des deux tiroirs ────────────────────────────────────────
   *
   * Les menus de la barre du haut descendent EN BAS du tiroir de droite, à la
   * suite de « Sculpture & peinture ». Il n'y a donc plus qu'une languette, et
   * tous les réglages d'origine se trouvent au même endroit.
   *
   * Pourquoi c'était possible sans rien réécrire : mesuré avant de commencer,
   * les menus déroulants font **220 px** de large et le tiroir en fait **232**.
   * Ils y tiennent. Seule la rangée de titres, longue de 1 420 px, ne pouvait
   * pas rester horizontale — d'où les `li` remis en colonne par le CSS.
   *
   * Ce qu'il ne faut pas faire : masquer la barre du haut par le `setVisibility`
   * de yagui. Il masque le conteneur, donc AUSSI les menus qu'on vient d'y
   * prendre. On le laisse « visible » à ses yeux et on cache le conteneur vidé
   * par un `display: none` — sa hauteur mesurée tombe alors à zéro, ce qui est
   * exactement ce qu'on veut : plus rien ne décale la vue vers le bas.
   */
  _fusionner() {
    var haut = this._gui._topbar;
    var barre = this._gui._sidebar && this._gui._sidebar.domSidebar;
    if (!haut || !haut.domTopbar || !barre) return false;

    var menus = haut.domTopbar.querySelector('ul');
    if (!menus) return false;

    haut.setVisibility(true);
    menus.className = 'modelagix-menus-fusionnes';
    barre.appendChild(menus);
    haut.domTopbar.style.display = 'none';
    return true;
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
      // Il n'y a plus qu'un tiroir depuis la fusion : Tab le bascule.
      this.definir('droite', !this.estOuvert('droite'));
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
    // Seule celle de droite suit sa barre : elle est seule sur son bord, et la
    // barre est large. Celle du haut ne bouge plus (voir le CSS) — la barre du
    // haut est mince, la languette y tient devant sans rien masquer.
    //
    // On se règle sur l'état VOULU, pas sur la largeur mesurée. À la fermeture,
    // yagui ne masque sa barre qu'à la fin du glissement (il faut bien qu'elle
    // reste visible pendant qu'elle glisse) : la mesure renvoyait donc encore
    // 232 px pendant toute l'animation. La languette restait plantée à droite
    // puis sautait d'un coup à la fin — c'est le décrochage signalé, et il était
    // plus visible à la fermeture qu'à l'ouverture pour cette raison.
    if (this._languetteRetenue) return;
    this._languettes.droite.style.right =
      (this._etat.droite ? this.largeurBarreDroite() : 0) + 'px';
  }

  _rafraichir() {
    this._positionner();

    var decrire = function (bouton, ouvert, ferme, chevron) {
      var etiquette = ouvert ? ferme : chevron;
      bouton.title = etiquette;
      bouton.setAttribute('aria-label', etiquette);
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    };

    // L'icône est posée une fois pour toutes ; seul l'état change ensuite.
    // La réécrire à chaque rafraîchissement referait le SVG pour rien.
    if (!this._languettes.droite.firstChild) {
      this._languettes.droite.innerHTML = Icones.baliser('reglages');
    }
    this._languettes.droite.classList.toggle('ouvert', this._etat.droite);
    decrire(this._languettes.droite, this._etat.droite,
      'Masquer les réglages de droite', 'Afficher les réglages de droite');

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
        // La languette ne doit pas partir avant la barre. Elle est ramenée à la
        // position fermée sans transition, puis relâchée en même temps que le
        // glissement — sans quoi elle prenait les deux images d'avance qu'on
        // laisse au navigateur ci-dessous, et se détachait du bord du panneau.
        var languette = this._languettes.droite;
        if (partie === 'droite') {
          // Le drapeau neutralise le `_positionner()` du `_rafraichir()` qui
          // suit immédiatement : sans lui, la languette sauterait à sa position
          // finale pendant que la transition est encore coupée, et n'aurait
          // plus rien à animer.
          this._languetteRetenue = true;
          languette.style.transition = 'none';
          languette.style.right = '0px';
        }
        var relacher = function () {
          conteneur.style.transform = '';
          if (partie !== 'droite' || !this._languetteRetenue) return;
          languette.style.transition = '';
          this._languetteRetenue = false;
          this._positionner();
        }.bind(this);

        // Un temps de rendu avant de lancer le retour, sinon le navigateur
        // applique les deux transformations d'un bloc et rien ne s'anime.
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(relacher);
        });
        // Filet de sécurité : si les images ne sont pas rendues — onglet en
        // arrière-plan, volet d'inspection — la languette resterait retenue,
        // transition coupée. `relacher` ne fait rien s'il a déjà eu lieu.
        window.setTimeout(relacher, DUREE);
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

  // Depuis la fusion il n'y a plus qu'un tiroir. Les deux noms restent : ils
  // sont appelés ailleurs, et « tout » veut simplement dire « le tiroir ».
  ouvrirTout() {
    this.definir('droite', true);
  }

  fermerTout() {
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
