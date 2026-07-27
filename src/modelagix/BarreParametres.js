/**
 * MODELAGIX — barre de paramètres, en haut
 *
 * Les deux réglages permanents de la sculpture — Taille et Force — puis les
 * interrupteurs de l'outil courant, sous forme de pastilles.
 *
 * Ces interrupteurs changent d'un outil à l'autre : Argile n'existe que pour
 * Dessiner, Tangentiel que pour Lisser. La barre se reconstruit donc à chaque
 * changement d'outil, plutôt que d'afficher des réglages sans effet.
 *
 * Comme la barre de gauche, elle ne parle QU'À LA FAÇADE.
 */

var ID_STYLE = 'modelagix-style-parametres';

var CSS = [
  '.modelagix-parametres {',
  '  position: fixed;',
  // Bornes calculées, pas de centrage sur la fenêtre : la barre doit rester
  // entre la colonne d'outils et le cube d'orientation. Centrée sur la
  // fenêtre, elle passait SOUS le cube, qui interceptait alors les curseurs —
  // on pouvait cliquer mais pas glisser.
  '  margin: 0 auto;',
  '  z-index: 10;',
  '  transition: top 250ms ease, left 250ms ease, right 250ms ease;',
  '  display: flex;',
  '  align-items: center;',
  '  flex-wrap: wrap;',
  '  justify-content: center;',
  '  gap: 14px;',
  '  padding: 8px 16px;',
  '  border-radius: 10px;',
  '  background: rgba(30, 34, 40, 0.82);',
  '  color: rgba(255, 255, 255, 0.85);',
  '  font: 12px/1.2 system-ui, -apple-system, sans-serif;',
  '  -webkit-user-select: none;',
  '  user-select: none;',
  '}',
  '.modelagix-reglage {',
  '  display: flex;',
  '  align-items: center;',
  '  gap: 8px;',
  '}',
  '.modelagix-reglage > span:first-child {',
  '  min-width: 42px;',
  '  color: rgba(255, 255, 255, 0.65);',
  '}',
  '.modelagix-reglage input[type=range] {',
  '  width: 128px;',
  '  accent-color: #6ea8fe;',
  '  cursor: pointer;',
  '}',
  '.modelagix-valeur {',
  '  min-width: 30px;',
  '  text-align: right;',
  '  font-variant-numeric: tabular-nums;',
  '}',
  '.modelagix-liste {',
  '  max-width: 150px;',
  '  padding: 4px 6px;',
  '  border: 1px solid rgba(255, 255, 255, 0.18);',
  '  border-radius: 6px;',
  '  background: rgba(255, 255, 255, 0.06);',
  '  color: rgba(255, 255, 255, 0.85);',
  '  font: inherit;',
  '  cursor: pointer;',
  '}',
  '.modelagix-liste option {',
  '  color: #111;',
  '}',
  '.modelagix-pastilles {',
  '  display: flex;',
  '  gap: 6px;',
  '}',
  '.modelagix-pastille {',
  '  padding: 5px 12px;',
  '  border: 1px solid rgba(255, 255, 255, 0.18);',
  '  border-radius: 999px;',
  '  background: transparent;',
  '  color: rgba(255, 255, 255, 0.7);',
  '  font: inherit;',
  '  cursor: pointer;',
  '  transition: background 110ms ease, color 110ms ease, border-color 110ms ease;',
  '}',
  '.modelagix-pastille:hover {',
  '  background: rgba(255, 255, 255, 0.1);',
  '  color: #fff;',
  '}',
  '.modelagix-pastille.actif {',
  '  background: rgba(110, 168, 254, 0.22);',
  '  border-color: rgba(110, 168, 254, 0.55);',
  '  color: #8ec1ff;',
  '}',
  '.modelagix-pastille:focus-visible {',
  '  outline: 2px solid #6ea8fe;',
  '  outline-offset: 2px;',
  '}'
].join('\n');

class BarreParametres {

  /**
   * @param {Object} facade  seul interlocuteur de cette barre
   * @param {Object} gui     l'interface d'origine, pour se placer sous sa barre du haut
   */
  constructor(facade, gui, tiroir) {
    this._facade = facade;
    this._gui = gui;
    this._tiroir = tiroir;
    this._dernierOutil = null;

    // Le tiroir prévient après chaque changement : on se replace au bon moment.
    if (tiroir) tiroir.surChangement(function () { this._positionner(); }.bind(this));

    this._injecterStyle();
    this._construire();

    // Taille, force et options peuvent changer sans passer par ici : raccourcis
    // X et C, maintien de Maj, ou réglages du tiroir. On se resynchronise après
    // chaque interaction plutôt que de se croire seul maître à bord.
    this._cbSync = this._synchroniser.bind(this);
    window.addEventListener('keyup', this._cbSync, false);
    window.addEventListener('mouseup', this._cbSync, false);
    window.addEventListener('resize', this._cbSync, false);

    this._surveillerLesTampons();
    this._synchroniser();
  }

  /**
   * Les tampons ne sont pas tous là au démarrage : ils se chargent en différé,
   * et l'utilisateur peut en importer. Le moteur signale leur arrivée en
   * appelant `addAlphaOptions` sur l'interface d'origine ; on se greffe dessus.
   *
   * Sans ça, la liste restait figée sur son contenu du premier instant, et les
   * tampons chargés ensuite n'apparaissaient jamais.
   */
  _surveillerLesTampons() {
    var gui = this._gui;
    var original = gui.addAlphaOptions;
    if (typeof original !== 'function') return;

    var self = this;
    gui.addAlphaOptions = function () {
      var retour = original.apply(gui, arguments);
      self._synchroniser();
      return retour;
    };
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
    barre.className = 'modelagix-parametres';
    barre.setAttribute('role', 'group');
    barre.setAttribute('aria-label', 'Réglages de l\'outil');

    this._curseurTaille = this._creerReglage(barre, 'Taille', 5, 500, 1,
      function (v) { this._facade.setRadius(v); }.bind(this));

    this._curseurForce = this._creerReglage(barre, 'Force', 0, 100, 1,
      function (v) { this._facade.setIntensity(v); }.bind(this));

    this._blocMatiere = this._creerMatiere(barre);
    this._blocAlpha = this._creerAlpha(barre);

    this._pastilles = document.createElement('div');
    this._pastilles.className = 'modelagix-pastilles';
    barre.appendChild(this._pastilles);

    document.body.appendChild(barre);
    this._barre = barre;
  }

  _creerReglage(parent, libelle, min, max, pas, onChange) {
    var bloc = document.createElement('div');
    bloc.className = 'modelagix-reglage';

    var titre = document.createElement('span');
    titre.textContent = libelle;

    var curseur = document.createElement('input');
    curseur.type = 'range';
    curseur.min = min;
    curseur.max = max;
    curseur.step = pas;
    curseur.setAttribute('aria-label', libelle);

    var valeur = document.createElement('span');
    valeur.className = 'modelagix-valeur';

    curseur.addEventListener('input', function () {
      var v = parseFloat(curseur.value);
      valeur.textContent = Math.round(v);
      onChange(v);
    }, false);

    bloc.appendChild(titre);
    bloc.appendChild(curseur);
    bloc.appendChild(valeur);
    parent.appendChild(bloc);

    return { curseur: curseur, valeur: valeur };
  }

  /**
   * Le matériau de rendu (matcap) — la sphère de matière de l'interface visée.
   *
   * Ce n'est pas de la peinture : une matcap relève de l'éclairage, pas de la
   * couleur peinte. Elle est donc dans le périmètre, et c'est un élément
   * d'identité visuelle important de l'ergonomie visée.
   */
  _creerMatiere(parent) {
    var bloc = document.createElement('div');
    bloc.className = 'modelagix-reglage';

    var titre = document.createElement('span');
    titre.textContent = 'Matière';

    var liste = document.createElement('select');
    liste.className = 'modelagix-liste';
    liste.setAttribute('aria-label', 'Matériau de rendu');
    liste.addEventListener('change', function () {
      this._facade.setMaterial(liste.value);
    }.bind(this), false);

    // Regroupées par famille : sphères de matière, environnements, analyse.
    // Une liste plate de vingt entrées hétérogènes ne se parcourt pas.
    var familles = {};
    this._facade.listMaterials().forEach(function (m) {
      if (!familles[m.famille]) {
        var g = document.createElement('optgroup');
        g.label = m.famille;
        liste.appendChild(g);
        familles[m.famille] = g;
      }
      var opt = document.createElement('option');
      opt.value = m.cle;
      opt.textContent = m.libelle;
      familles[m.famille].appendChild(opt);
    });

    bloc.appendChild(titre);
    bloc.appendChild(liste);
    parent.appendChild(bloc);

    return { bloc: bloc, liste: liste };
  }

  _majMatiere() {
    var courant = this._facade.getMaterial();
    var liste = this._blocMatiere.liste;
    if (courant && document.activeElement !== liste) liste.value = courant;
  }

  /**
   * Le tampon (alpha) : une image qui module l'empreinte de l'outil.
   * Tous les outils n'en acceptent pas — le bloc disparaît alors, plutôt que
   * de proposer un réglage sans effet.
   */
  _creerAlpha(parent) {
    var bloc = document.createElement('div');
    bloc.className = 'modelagix-reglage';

    var titre = document.createElement('span');
    titre.textContent = 'Tampon';

    var liste = document.createElement('select');
    liste.className = 'modelagix-liste';
    liste.setAttribute('aria-label', 'Tampon de l\'outil');
    liste.addEventListener('change', function () {
      this._facade.setAlpha(liste.value);
    }.bind(this), false);

    var importer = document.createElement('button');
    importer.type = 'button';
    importer.className = 'modelagix-pastille';
    importer.textContent = 'Importer…';
    importer.title = 'Importer une image comme tampon (jpg, png…)';
    importer.addEventListener('click', function () {
      this._facade.importAlpha();
    }.bind(this), false);

    bloc.appendChild(titre);
    bloc.appendChild(liste);
    bloc.appendChild(importer);
    parent.appendChild(bloc);

    return { bloc: bloc, liste: liste, dernierInventaire: '' };
  }

  /**
   * Remplit la liste des tampons. Elle s'allonge en cours de session — les
   * alphas se chargent en différé et l'utilisateur peut en importer — donc on
   * la reconstruit dès que l'inventaire change.
   */
  _majAlpha() {
    var a = this._blocAlpha;
    var dispo = this._facade.hasAlpha();
    a.bloc.style.display = dispo ? '' : 'none';
    if (!dispo) return;

    var noms = this._facade.listAlphas();
    var inventaire = noms.join(' ');
    if (inventaire !== a.dernierInventaire) {
      a.dernierInventaire = inventaire;
      a.liste.innerHTML = '';
      for (var i = 0; i < noms.length; ++i) {
        var opt = document.createElement('option');
        opt.value = opt.textContent = noms[i];
        a.liste.appendChild(opt);
      }
    }

    var courant = this._facade.getAlpha();
    if (courant !== null && document.activeElement !== a.liste) a.liste.value = courant;
  }

  /** Reconstruit les pastilles pour l'outil courant. */
  _reconstruirePastilles() {
    var options = this._facade.listOptions();
    this._pastilles.innerHTML = '';

    for (var i = 0; i < options.length; ++i) {
      var opt = options[i];
      var bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'modelagix-pastille';
      bouton.textContent = opt.libelle;
      bouton.dataset.cle = opt.cle;
      bouton.addEventListener('click', this._basculerOption.bind(this, opt.cle), false);
      this._pastilles.appendChild(bouton);
    }
  }

  _basculerOption(cle) {
    this._facade.setOption(cle, !this._facade.getOption(cle));
    this._synchroniser();
  }

  /**
   * Place la barre sous celle de l'interface d'origine quand elle est visible.
   *
   * Le décalage est demandé au tiroir, qui prévient explicitement après chaque
   * changement. S'appuyer sur `mouseup` ne marchait pas : `mouseup` précède
   * `click`, donc on se replaçait AVANT que la barre du haut ait bougé, et
   * elle passait sous celle-ci.
   */
  _positionner() {
    var decalage = this._tiroir ? this._tiroir.hauteurBarreHaut() : 0;
    this._barre.style.top = (decalage + 10) + 'px';

    // Bornes gauche et droite : la colonne d'outils et le cube d'un côté (tous
    // deux à gauche désormais), la barre de droite de l'autre. Sans bornes, la
    // barre passait sous le cube, qui interceptait alors les curseurs — on
    // pouvait cliquer mais pas glisser.
    var colonne = document.querySelector('.modelagix-barre');
    var cube = document.querySelector('.modelagix-cube');
    var gauche = 14;
    [colonne, cube].forEach(function (el) {
      if (el) gauche = Math.max(gauche, el.getBoundingClientRect().right + 16);
    });
    var barreDroite = this._tiroir ? this._tiroir.largeurBarreDroite() : 0;

    this._barre.style.left = Math.round(gauche) + 'px';
    this._barre.style.right = Math.round(barreDroite + 20) + 'px';
  }

  /** Aligne l'affichage sur l'état réel du moteur. */
  _synchroniser() {
    this._positionner();

    var outil = this._facade.getTool();
    if (outil !== this._dernierOutil) {
      this._dernierOutil = outil;
      this._reconstruirePastilles();
    }

    var taille = this._facade.getRadius();
    if (taille !== null && document.activeElement !== this._curseurTaille.curseur) {
      this._curseurTaille.curseur.value = taille;
    }
    this._curseurTaille.valeur.textContent = taille === null ? '—' : Math.round(taille);
    this._curseurTaille.curseur.disabled = taille === null;

    var force = this._facade.getIntensity();
    if (force !== null && document.activeElement !== this._curseurForce.curseur) {
      this._curseurForce.curseur.value = force;
    }
    this._curseurForce.valeur.textContent = force === null ? '—' : Math.round(force);
    this._curseurForce.curseur.disabled = force === null;

    this._majMatiere();
    this._majAlpha();

    var pastilles = this._pastilles.children;
    for (var i = 0; i < pastilles.length; ++i) {
      var p = pastilles[i];
      var actif = this._facade.getOption(p.dataset.cle) === true;
      p.classList.toggle('actif', actif);
      p.setAttribute('aria-pressed', actif ? 'true' : 'false');
    }
  }

  detruire() {
    window.removeEventListener('keyup', this._cbSync, false);
    window.removeEventListener('mouseup', this._cbSync, false);
    window.removeEventListener('resize', this._cbSync, false);
    if (this._barre && this._barre.parentNode)
      this._barre.parentNode.removeChild(this._barre);
  }
}

export default BarreParametres;
