/**
 * MODELAGIX — cube d'orientation
 *
 * Un cube nommé, en bas à droite, qui **tourne avec la vue principale**. On
 * clique une face, une arête ou un coin, la caméra s'y place.
 *
 * ── Pourquoi il doit tourner ──────────────────────────────────────────────
 * Un cube figé serait un trompe-l'œil. L'intérêt d'un tel repère est qu'il
 * dise D'ABORD où l'on est, avant de dire où aller. C'est ce qui le rend plus
 * intuitif qu'une rangée de boutons, et c'est ce qui justifie de remplacer les
 * six boutons de vue orthogonale par lui.
 *
 * ── Comment ───────────────────────────────────────────────────────────────
 * Les huit sommets du cube sont tournés par la rotation courante de la caméra,
 * puis projetés en parallèle (on ignore z pour l'affichage, on le garde pour
 * l'ordre de tracé). Les faces tournées vers l'arrière sont écartées ; les
 * autres sont dessinées de la plus lointaine à la plus proche.
 *
 * Aucune table de correspondance entre zones et vues : chaque zone EST une
 * direction, et `facade.lookFrom(direction)` fait le reste. Les six faces, les
 * huit coins et les douze arêtes sortent du même code.
 *
 * Le suivi se fait par comparaison de la rotation à chaque image plutôt qu'en
 * se greffant sur la boucle de rendu du moteur : on ne touche pas au moteur, et
 * un quaternion inchangé ne coûte qu'une comparaison de quatre nombres.
 */

import CouleursAxes from 'modelagix/CouleursAxes';

var ID_STYLE = 'modelagix-style-cube';
// Même largeur que la colonne d'outils (3 × 40 + 2 × 2 + 12), pour que les
// deux blocs de gauche s'alignent. Si la colonne change, changer ici aussi.
var TAILLE = 136;
// Un cube de demi-arête R vu de coin s'étend jusqu'à R·√3 ≈ 1,73 R. Avec
// TAILLE/2 = 68, un rayon de 30 laisse quinze pixels de marge et le cube ne
// sort jamais du cadre — c'est ce qui le tronquait en cours de rotation.
var RAYON = 30;
// Partagées avec le sol, qui marque ses deux axes des mêmes teintes. Deux
// définitions séparées auraient fini par se contredire, et deux repères qui se
// contredisent ne servent plus à rien.
var COULEURS = CouleursAxes;
/** Pas des flèches de rotation, en degrés. Fin, pour ajuster un point de vue. */
var PAS = 15;

/** Les six faces : normale, sommets (indices), nom affiché. */
var FACES = [
  { normale: [0, 0, 1], sommets: [0, 1, 2, 3], nom: 'Devant' },
  { normale: [0, 0, -1], sommets: [5, 4, 7, 6], nom: 'Derrière' },
  { normale: [1, 0, 0], sommets: [1, 5, 6, 2], nom: 'Droite' },
  { normale: [-1, 0, 0], sommets: [4, 0, 3, 7], nom: 'Gauche' },
  { normale: [0, 1, 0], sommets: [4, 5, 1, 0], nom: 'Dessus' },
  { normale: [0, -1, 0], sommets: [3, 2, 6, 7], nom: 'Dessous' }
];

/** Sommets du cube, dans l'ordre utilisé par FACES. */
var SOMMETS = [
  [-1, 1, 1], [1, 1, 1], [1, -1, 1], [-1, -1, 1],
  [-1, 1, -1], [1, 1, -1], [1, -1, -1], [-1, -1, -1]
];

var CSS = [
  // Même traitement que les autres panneaux : ni bordure ni fond net, un
  // calque flouté posé derrière le contenu.
  // Le cadre n'est plus posé à l'écran par lui-même : la façade le range dans
  // la rangée du haut, où il se place tout seul à la suite du groupe des vues.
  '.modelagix-cube-cadre {',
  '  flex: 0 0 auto;',
  '  position: relative;',
  '  isolation: isolate;',
  '  padding: 14px;',
  '  -webkit-user-select: none;',
  '  user-select: none;',
  '}',
  '.modelagix-cube-cadre::before {',
  '  content: \'\';',
  '  position: absolute;',
  '  inset: 26px;',
  '  border-radius: 16px;',
  '  background: rgba(26, 30, 36, 0.58);',
  '  filter: blur(22px);',
  '  z-index: -1;',
  '  pointer-events: none;',
  '}',
  '.modelagix-cube {',
  '  display: block;',
  '  width: ' + TAILLE + 'px;',
  '  height: ' + TAILLE + 'px;',
  '  cursor: grab;',
  '}',
  '.modelagix-cube .face {',
  '  fill: rgba(210, 222, 240, 0.13);',
  '  stroke: rgba(220, 232, 248, 0.55);',
  '  stroke-width: 1.2;',
  '  stroke-linejoin: round;',
  '  cursor: pointer;',
  '}',
  '.modelagix-cube .face:hover {',
  '  fill: rgba(110, 168, 254, 0.45);',
  '}',
  '.modelagix-cube .etiquette {',
  '  fill: rgba(255, 255, 255, 0.88);',
  '  font: 500 9px system-ui, -apple-system, sans-serif;',
  '  text-anchor: middle;',
  '  dominant-baseline: middle;',
  '  pointer-events: none;',
  '}',
  '.modelagix-cube .poignee {',
  '  fill: rgba(255, 255, 255, 0.001);', // cliquable sans être visible
  '  cursor: pointer;',
  '}',
  '.modelagix-cube .poignee:hover {',
  '  fill: rgba(110, 168, 254, 0.6);',
  '}',
  // La lettre est en creux sur sa pastille : encre sombre sur fond coloré.
  '.modelagix-cube .lettre-axe {',
  '  fill: #12151a;',
  '  font: 700 8.5px system-ui, -apple-system, sans-serif;',
  '  text-anchor: middle;',
  '  dominant-baseline: middle;',
  '  pointer-events: none;',
  '}',
  '.modelagix-cube .triedre {',
  '  pointer-events: none;',
  '}',
  '.modelagix-cube .fleche {',
  '  fill: rgba(220, 232, 248, 0.30);',
  '  cursor: pointer;',
  '  transition: fill 110ms ease;',
  '}',
  '.modelagix-cube .fleche:hover {',
  '  fill: rgba(110, 168, 254, 0.9);',
  '}'
].join('\n');

class CubeVues {

  /** @param {Object} facade  seul interlocuteur de ce cube */
  constructor(facade, main) {
    this._facade = facade;
    this._main = main;
    this._derniereRotation = null;

    this._injecterStyle();
    this._construire();
    this._brancherGlisse();
    this._suivre();
  }

  /**
   * Faire tourner la vue en glissant sur le cube.
   *
   * On délègue à la caméra du moteur (`start` puis `rotate`) plutôt que de
   * recalculer une rotation : le cube réagit alors exactement comme un glissé
   * dans la zone de dessin, même inertie, même mode d'orbite.
   *
   * Un déplacement de moins de quatre pixels reste un clic — sans quoi le
   * moindre tremblement de la main transformerait un clic de face en rotation.
   */
  _brancherGlisse() {
    var camera = this._main.getCamera();
    var main = this._main;
    var self = this;

    this._svg.addEventListener('mousedown', function (ev) {
      ev.preventDefault();
      self._presse = true;
      self._aGlisse = false;
      self._depart = [ev.clientX, ev.clientY];
      camera.start(ev.clientX, ev.clientY);
      self._svg.style.cursor = 'grabbing';
    }, false);

    window.addEventListener('mousemove', function (ev) {
      if (!self._presse) return;
      var dx = ev.clientX - self._depart[0];
      var dy = ev.clientY - self._depart[1];
      if (!self._aGlisse && Math.sqrt(dx * dx + dy * dy) < 4) return;
      self._aGlisse = true;
      camera.rotate(ev.clientX, ev.clientY);
      main.render();
    }, false);

    window.addEventListener('mouseup', function () {
      if (!self._presse) return;
      self._presse = false;
      self._svg.style.cursor = 'grab';
      // On laisse le clic suivant passer si l'on n'a pas glissé.
      window.setTimeout(function () { self._aGlisse = false; }, 0);
    }, false);
  }

  _injecterStyle() {
    if (document.getElementById(ID_STYLE)) return;
    var style = document.createElement('style');
    style.id = ID_STYLE;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _construire() {
    // Un cadre porte le fond flouté : un pseudo-élément ne s'applique pas de
    // façon fiable sur une balise SVG, il faut donc un conteneur HTML.
    var cadre = document.createElement('div');
    cadre.className = 'modelagix-cube-cadre';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'modelagix-cube');
    svg.setAttribute('viewBox', '0 0 ' + TAILLE + ' ' + TAILLE);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Cube d\'orientation de la vue');

    cadre.appendChild(svg);
    document.body.appendChild(cadre);
    this._cadre = cadre;
    this._svg = svg;
  }

  /**
   * Le repère du cube, dérivé de la projection RÉELLE du moteur.
   *
   * J'ai d'abord voulu tourner les points par le quaternion de la caméra. Deux
   * essais, deux échecs : la rotation directe donnait le bon axe vertical mais
   * inversait gauche et droite, la conjuguée faisait l'inverse. Les conventions
   * de signe ne se devinent pas.
   *
   * On demande donc au moteur où atterrissent les trois axes du monde, et on
   * s'en sert tels quels. Le cube est juste par construction, quelle que soit
   * la convention interne — et il hérite du même raccourcissement que la vue
   * principale, ce qui est exactement ce qu'on veut d'un repère.
   *
   * La profondeur vient de la position de la caméra : une face est tournée
   * vers nous si sa normale pointe du même côté qu'elle.
   */
  _repere() {
    var camera = this._main.getCamera();
    var o = camera.project([0, 0, 0]);
    var axe = function (v) {
      var p = camera.project(v);
      return [p[0] - o[0], p[1] - o[1]];
    };
    var ax = axe([1, 0, 0]);
    var ay = axe([0, 1, 0]);
    var az = axe([0, 0, 1]);

    // Les images des trois axes donnent les deux premières lignes de la
    // rotation : ligne 0 = où va X à l'écran, ligne 1 = où va Y.
    var l0 = [ax[0], ay[0], az[0]];
    var l1 = [ax[1], ay[1], az[1]];

    // ── Pourquoi on orthonormalise ────────────────────────────────────────
    // `project` inclut la perspective : les trois axes ne se raccourcissent
    // pas du même facteur selon la distance, et le cube s'étirait en
    // rectangle. Un repère d'orientation doit rester un cube — il indique une
    // direction, il ne mesure pas. On redresse donc en base orthonormée
    // (Gram-Schmidt), ce qui conserve l'orientation et supprime l'étirement.
    var norme = function (v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); };
    var divise = function (v, k) { return [v[0] / k, v[1] / k, v[2] / k]; };
    var scal = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };

    var n0 = norme(l0) || 1;
    var r0 = divise(l0, n0);
    var d = scal(l1, r0);
    var reste = [l1[0] - d * r0[0], l1[1] - d * r0[1], l1[2] - d * r0[2]];
    var r1 = divise(reste, norme(reste) || 1);
    var r2 = [
      r0[1] * r1[2] - r0[2] * r1[1],
      r0[2] * r1[0] - r0[0] * r1[2],
      r0[0] * r1[1] - r0[1] * r1[0]
    ];

    return { r0: r0, r1: r1, r2: r2 };
  }

  /** Place un point du cube à l'écran. */
  _projeter(point, repere) {
    var r0 = repere.r0, r1 = repere.r1;
    return [
      TAILLE / 2 + (point[0] * r0[0] + point[1] * r0[1] + point[2] * r0[2]) * RAYON,
      TAILLE / 2 + (point[0] * r1[0] + point[1] * r1[1] + point[2] * r1[2]) * RAYON
    ];
  }

  /**
   * Une face nous regarde-t-elle ? On lit le SENS D'ENROULEMENT de son
   * polygone projeté — l'aire signée de Gauss.
   *
   * J'ai d'abord voulu comparer la normale à la position de la caméra. Échec :
   * `computePosition` n'a pas la même convention de signe en X que le reste du
   * moteur, et gauche/droite restaient inversées. L'enroulement ne dépend
   * d'aucune convention interne : il se lit sur ce qui est réellement dessiné.
   *
   * Le signe attendu découle de l'ordre des sommets choisi dans FACES et de
   * l'axe Y de l'écran, orienté vers le bas.
   */
  _tourneeVersNous(sommets, projetes) {
    return this._aire(sommets, projetes) > 1; // le seuil écarte les faces vues par la tranche
  }

  _dessiner() {
    var repere = this._repere();

    var projetes = SOMMETS.map(function (s) {
      return this._projeter(s, repere);
    }.bind(this));

    var svg = this._svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Un cube est convexe : ses faces visibles ne se recouvrent jamais.
    // Aucun tri en profondeur n'est donc nécessaire.
    var visibles = FACES.filter(function (face) {
      return this._tourneeVersNous(face.sommets, projetes);
    }.bind(this));

    this._facesVisibles = {};
    for (var i = 0; i < visibles.length; ++i) {
      this._facesVisibles[visibles[i].nom] = visibles[i].normale;
      this._dessinerFace(visibles[i], projetes);
    }

    // Coins et arêtes : de petites zones cliquables posées par-dessus.
    this._dessinerPoignees(repere, visibles);

    // Les axes, portés par les arêtes du cube.
    this._dessinerAxes(projetes, visibles);

    // Les flèches de rotation, autour du cube.
    this._dessinerFleches(repere);
  }

  /**
   * Les axes X (rouge), Y (vert), Z (bleu) — convention universelle en 3D et
   * celle du repère pris pour modèle.
   *
   * Ils sont portés par les ARÊTES du cube, partant du sommet (−1,−1,−1), et
   * non dessinés à côté : un trièdre flottant se lit comme un second objet,
   * alors qu'une arête colorée dit que l'axe appartient au cube.
   *
   * Chaque arête n'est tracée que si au moins une des deux faces qui la
   * bordent nous fait face. Le cube n'est pas transparent : une arête et sa
   * lettre passant derrière doivent disparaître, sans quoi le repère ment sur
   * ce qu'on regarde.
   */
  _dessinerAxes(projetes, visibles) {
    // ── Origine FIXE, au coin bas-gauche de la face avant ─────────────────
    // Le trièdre reste attaché au même sommet du cube et tourne avec lui.
    // Depuis la vue de face : Z vers le haut, X vers la droite le long de
    // l'arête basse, Y vers la profondeur.
    //
    // Conséquence assumée : ce coin passe derrière le cube quand on regarde
    // depuis l'octant opposé. Plutôt que de faire disparaître le repère — on
    // perdrait l'orientation au moment où l'on en a le plus besoin — on le
    // dessine alors en retrait, ce qui dit qu'il est derrière sans mentir sur
    // l'opacité du cube.
    var estVisible = function (normale) {
      for (var i = 0; i < visibles.length; ++i) {
        var n = visibles[i].normale;
        if (n[0] === normale[0] && n[1] === normale[1] && n[2] === normale[2]) return true;
      }
      return false;
    };

    var DEVANT = [0, 0, 1], DESSOUS = [0, -1, 0], GAUCHE = [-1, 0, 0];
    var ORIGINE = 3; // (-1, -1, 1) : bas-gauche de la face avant
    var axes = [
      { vers: 2, nom: 'X', couleur: COULEURS.x, faces: [DEVANT, DESSOUS] },
      { vers: 0, nom: 'Z', couleur: COULEURS.z, faces: [DEVANT, GAUCHE] },
      { vers: 7, nom: 'Y', couleur: COULEURS.y, faces: [GAUCHE, DESSOUS] }
    ];

    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'triedre');
    var p1 = projetes[ORIGINE];

    for (var i = 0; i < axes.length; ++i) {
      var a = axes[i];
      var p2 = projetes[a.vers];
      var devant = estVisible(a.faces[0]) || estVisible(a.faces[1]);
      var opacite = devant ? '1' : '0.32';

      var trait = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      trait.setAttribute('x1', p1[0].toFixed(1));
      trait.setAttribute('y1', p1[1].toFixed(1));
      trait.setAttribute('x2', p2[0].toFixed(1));
      trait.setAttribute('y2', p2[1].toFixed(1));
      trait.setAttribute('stroke', a.couleur);
      trait.setAttribute('stroke-width', devant ? '2.6' : '1.6');
      trait.setAttribute('stroke-opacity', opacite);
      trait.setAttribute('stroke-linecap', 'round');
      g.appendChild(trait);

      // ── La lettre est une PASTILLE, pas un caractère posé sur la scène ──
      //
      // Une lettre de la couleur de son axe se confondait avec le trait qui la
      // portait, et se perdait sur les faces claires du cube. Un disque plein
      // avec la lettre en creux se détache toujours, quelle que soit la face
      // derrière — et il reste droit quand tout tourne, ce qui est justement le
      // travail d'un repère.
      var lx = p2[0] + (p2[0] - p1[0]) * 0.20;
      var ly = p2[1] + (p2[1] - p1[1]) * 0.20;

      var pastille = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pastille.setAttribute('cx', lx.toFixed(1));
      pastille.setAttribute('cy', ly.toFixed(1));
      pastille.setAttribute('r', devant ? '6.4' : '5.4');
      pastille.setAttribute('fill', a.couleur);
      pastille.setAttribute('fill-opacity', opacite);
      g.appendChild(pastille);

      var lettre = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lettre.setAttribute('x', lx.toFixed(1));
      lettre.setAttribute('y', ly.toFixed(1));
      lettre.setAttribute('fill-opacity', opacite);
      lettre.setAttribute('class', 'lettre-axe');
      lettre.textContent = a.nom;
      g.appendChild(lettre);
    }

    this._svg.appendChild(g);
  }

  _dessinerFace(face, projetes) {
    var s = face.sommets;
    var points = s.map(function (i) {
      return projetes[i][0].toFixed(1) + ',' + projetes[i][1].toFixed(1);
    }).join(' ');

    var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('class', 'face');
    poly.setAttribute('points', points);
    poly.addEventListener('click', this._regarder.bind(this, face.normale), false);
    var titre = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    titre.textContent = face.nom;
    poly.appendChild(titre);
    this._svg.appendChild(poly);

    // Centre de la face.
    var cx = 0, cy = 0;
    for (var i = 0; i < 4; ++i) {
      cx += projetes[s[i]][0] / 4;
      cy += projetes[s[i]][1] / 4;
    }

    // ── L'étiquette est posée sur la face comme un décalque ───────────────
    //
    // La version précédente ne faisait que la FAIRE TOURNER : le texte suivait
    // l'inclinaison de l'arête basse, mais restait plat. Une face vue de trois
    // quarts portait donc un texte non déformé, qui flottait au-dessus d'elle au
    // lieu d'y adhérer — et comme il gardait sa taille, il fallait masquer
    // l'étiquette dès que la face se refermait, faute de place. Les faces
    // latérales perdaient ainsi leur nom au moment où on en avait besoin.
    //
    // On lui applique maintenant la BASE PROJETÉE de la face : `u` le long de
    // l'arête basse, `v` le long du montant. Le texte subit exactement le même
    // raccourci que la face, il se penche et se resserre avec elle. C'est ce que
    // ferait une texture collée sur le cube, sans texture.
    //
    // La base est RAMENÉE À L'ÉCHELLE 1 (divisée par RAYON) : de face, la
    // matrice ne fait plus que translater, et la police garde sa taille en
    // pixels. Quand la face se referme, la base rétrécit et le texte avec elle.
    //
    // On aurait pu laisser la base à sa taille réelle et exprimer la police en
    // unités de face — essayé, et abandonné : une feuille de style du moteur
    // impose une taille aux éléments `text`, et **une règle CSS l'emporte sur
    // un attribut de présentation**. La police sortait à 13 px multipliés par
    // 30, soit une lettre plus grande que le cube. Ne pas y revenir.
    var aire = Math.abs(this._aire(s, projetes)) / 2;
    var aireMax = 4 * RAYON * RAYON;
    if (aire < aireMax * 0.08) return;

    var p3 = projetes[s[3]], p2 = projetes[s[2]], p0 = projetes[s[0]];
    var ux = (p2[0] - p3[0]) / (2 * RAYON), uy = (p2[1] - p3[1]) / (2 * RAYON);
    var vx = (p0[0] - p3[0]) / (2 * RAYON), vy = (p0[1] - p3[1]) / (2 * RAYON);

    var texte = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    texte.setAttribute('class', 'etiquette');
    texte.setAttribute('x', '0');
    texte.setAttribute('y', '0');
    // Le second vecteur est INVERSÉ : `v` monte le long de la face, alors que
    // l'axe des y d'un SVG descend. Sans ce signe, tous les noms seraient
    // retournés.
    texte.setAttribute('transform', 'matrix(' +
      ux.toFixed(3) + ' ' + uy.toFixed(3) + ' ' +
      (-vx).toFixed(3) + ' ' + (-vy).toFixed(3) + ' ' +
      cx.toFixed(2) + ' ' + cy.toFixed(2) + ')');
    texte.textContent = face.nom;
    this._svg.appendChild(texte);
  }
  /** Aire signée du polygone projeté (formule de Gauss). */
  _aire(sommets, projetes) {
    var aire = 0;
    for (var i = 0; i < sommets.length; ++i) {
      var a = projetes[sommets[i]];
      var b = projetes[sommets[(i + 1) % sommets.length]];
      aire += a[0] * b[1] - b[0] * a[1];
    }
    return aire;
  }

  /**
   * Les huit coins et les douze arêtes. Chacun n'est qu'une direction : la
   * somme des normales des faces qu'il touche.
   *
   * Un coin est de notre côté si TOUTES les faces qu'il touche le sont — pas
   * besoin de calculer une profondeur, la liste des faces visibles suffit.
   */
  _dessinerPoignees(repere, visibles) {
    var normalesVisibles = visibles.map(function (f) { return f.normale; });
    var estVisible = function (axe, signe) {
      for (var i = 0; i < normalesVisibles.length; ++i) {
        if (normalesVisibles[i][axe] === signe) return true;
      }
      return false;
    };

    var v = [-1, 0, 1];
    for (var a = 0; a < 3; ++a) {
      for (var b = 0; b < 3; ++b) {
        for (var c = 0; c < 3; ++c) {
          var d = [v[a], v[b], v[c]];
          var nb = Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]);
          if (nb !== 2 && nb !== 3) continue; // ni arête ni coin

          var visible = true;
          for (var axe = 0; axe < 3; ++axe) {
            if (d[axe] !== 0 && !estVisible(axe, d[axe])) { visible = false; break; }
          }
          if (!visible) continue;

          var p = this._projeter(d, repere);
          var cercle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          cercle.setAttribute('class', 'poignee');
          cercle.setAttribute('cx', p[0].toFixed(1));
          cercle.setAttribute('cy', p[1].toFixed(1));
          cercle.setAttribute('r', nb === 3 ? '8' : '6');
          cercle.addEventListener('click', this._regarder.bind(this, d), false);
          var t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
          t.textContent = nb === 3 ? 'Vue de coin' : 'Vue d\'arête';
          cercle.appendChild(t);
          this._svg.appendChild(cercle);
        }
      }
    }
  }

  /**
   * Les quatre flèches de rotation autour du cube.
   *
   * Le pas est volontairement FIN — 15° — et non le quart de tour habituel :
   * on veut ajuster un point de vue, pas sauter d'une face à l'autre. Les
   * faces du cube sont déjà là pour les sauts.
   */
  _dessinerFleches(repere) {
    var c = TAILLE / 2, bord = 11, taille = 8;
    var fleches = [
      { d: [0, -1], x: c, y: bord, axe: 'r0', signe: 1, nom: 'Basculer vers le haut' },
      { d: [0, 1], x: c, y: TAILLE - bord, axe: 'r0', signe: -1, nom: 'Basculer vers le bas' },
      { d: [-1, 0], x: bord, y: c, axe: 'r1', signe: -1, nom: 'Tourner vers la gauche' },
      { d: [1, 0], x: TAILLE - bord, y: c, axe: 'r1', signe: 1, nom: 'Tourner vers la droite' }
    ];

    for (var i = 0; i < fleches.length; ++i) {
      var f = fleches[i];
      // Un triangle pointant vers l'extérieur.
      var px = -f.d[1], py = f.d[0]; // perpendiculaire
      var pts = [
        [f.x + f.d[0] * taille, f.y + f.d[1] * taille],
        [f.x - f.d[0] * taille * 0.5 + px * taille * 0.8, f.y - f.d[1] * taille * 0.5 + py * taille * 0.8],
        [f.x - f.d[0] * taille * 0.5 - px * taille * 0.8, f.y - f.d[1] * taille * 0.5 - py * taille * 0.8]
      ].map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');

      var tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      tri.setAttribute('class', 'fleche');
      tri.setAttribute('points', pts);
      tri.addEventListener('click', this._pivoter.bind(this, repere[f.axe], f.signe), false);
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = f.nom;
      tri.appendChild(t);
      this._svg.appendChild(tri);
    }
  }

  /**
   * Fait pivoter la vue de PAS degrés autour d'un axe du repère de l'écran.
   * Formule de Rodrigues : on tourne la direction de visée, puis on demande à
   * la façade de regarder depuis la nouvelle direction.
   */
  _pivoter(axe, signe) {
    if (this._aGlisse) return;
    var repere = this._repere();
    // r2 est l'axe de profondeur de l'écran ; la caméra se trouve à l'opposé.
    var d = [-repere.r2[0], -repere.r2[1], -repere.r2[2]];

    var a = signe * PAS * Math.PI / 180;
    var cos = Math.cos(a), sin = Math.sin(a);
    var k = axe;
    var kd = k[0] * d[0] + k[1] * d[1] + k[2] * d[2];
    var croix = [
      k[1] * d[2] - k[2] * d[1],
      k[2] * d[0] - k[0] * d[2],
      k[0] * d[1] - k[1] * d[0]
    ];
    var nouveau = [
      d[0] * cos + croix[0] * sin + k[0] * kd * (1 - cos),
      d[1] * cos + croix[1] * sin + k[1] * kd * (1 - cos),
      d[2] * cos + croix[2] * sin + k[2] * kd * (1 - cos)
    ];
    this._facade.lookFrom(nouveau);
  }

  _regarder(direction) {
    if (this._aGlisse) return; // c'était une rotation, pas un choix de face
    this._facade.lookFrom(direction);
  }

  /**
   * Redessine seulement si l'état de la caméra a changé.
   *
   * La signature ne peut PAS se limiter au quaternion. Au démarrage, le cube
   * se dessinait une fois avant que la caméra ait atteint sa position finale,
   * puis plus jamais — la rotation ne changeant pas, rien ne déclenchait de
   * redessin. Résultat : un cube figé sur une orientation qui n'était pas
   * celle de l'objet, ce qui est pire que pas de cube du tout.
   *
   * On y ajoute donc la translation, la taille du canevas et le type de
   * projection : tout ce dont dépend le repère.
   */
  _signature() {
    var cam = this._main.getCamera();
    var q = cam._quatRot, t = cam._trans;
    return q[0] + ',' + q[1] + ',' + q[2] + ',' + q[3] + '|' +
      t[0] + ',' + t[1] + ',' + t[2] + '|' +
      this._main.getCanvasWidth() + 'x' + this._main.getCanvasHeight() + '|' +
      (cam.isOrthographic() ? 'o' : 'p');
  }

  _verifier() {
    var s = this._signature();
    if (s === this._derniereSignature) return;
    this._derniereSignature = s;
    this._dessiner();
  }

  /**
   * Deux sources, volontairement.
   *
   * `requestAnimationFrame` donne un suivi fluide pendant qu'on fait tourner
   * l'objet. Mais il est suspendu dès que le navigateur cesse de peindre —
   * onglet en arrière-plan, fenêtre masquée, outils d'inspection. Le cube
   * restait alors figé sur une orientation périmée, ce qui est pire que pas
   * de cube du tout puisqu'il affirme quelque chose de faux.
   *
   * Le minuteur de secours, huit fois par seconde, ne coûte que la comparaison
   * de quatre nombres quand rien ne bouge.
   */
  _suivre() {
    var boucle = function () {
      this._verifier();
      this._image = window.requestAnimationFrame(boucle);
    }.bind(this);
    boucle();
    this._minuteur = window.setInterval(this._verifier.bind(this), 125);
  }

  /**
   * Se décale pour ne recouvrir ni la barre de droite ni celle du haut.
   * Sans le décalage vertical, le cube se posait par-dessus les menus de
   * l'interface d'origine et les rendait inaccessibles.
   */
  /** Le cadre, que la façade range dans la rangée du haut. */
  cadre() {
    return this._cadre;
  }

  /**
   * Sans effet depuis que le cube vit dans la rangée du haut : c'est elle qui
   * le place. La méthode reste pour ne pas casser l'appel de la façade.
   */
  suivreLeTiroir() {
  }

  detruire() {
    if (this._image) window.cancelAnimationFrame(this._image);
    if (this._minuteur) window.clearInterval(this._minuteur);
    if (this._cadre && this._cadre.parentNode) this._cadre.parentNode.removeChild(this._cadre);
  }
}

export default CubeVues;
