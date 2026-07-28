/**
 * MODELAGIX — sprite d'icônes
 *
 * ⚠️ ICÔNES PROVISOIRES. Elles servent à valider la mécanique de la barre
 * d'outils, pas à représenter l'identité visuelle du projet. Elles seront
 * remplacées par les icônes définitives, issues du travail comparatif et
 * sémiotique en cours.
 *
 * Rien ici n'est repris d'une application existante : ce sont des tracés
 * géométriques élémentaires, écrits à la main. Aucune question de droit
 * d'auteur ne se pose, ni maintenant ni au remplacement.
 *
 * Conventions du cahier des charges, section 10 :
 *   - grille 24 × 24, trait de 2 px
 *   - un sprite unique, une icône par <symbol>, appelée par <use href="#...">
 *   - couleur héritée, pour que survol / actif / désactivé se gèrent en CSS
 *
 * Nuance assumée sur la section 10 : le texte demande `fill="currentColor"`.
 * Ces pictogrammes sont dessinés au trait, donc c'est `stroke` qui porte la
 * couleur. L'intention — couleur héritée, états gérés en CSS — est respectée ;
 * c'est la propriété qui change, pas le principe. Les deux sont posées en CSS
 * une seule fois, sur `.modelagix-icone`, plutôt que répétées sur chaque tracé.
 *
 * Pour remplacer une icône : ne toucher qu'à la chaîne correspondante ci-dessous.
 * La barre d'outils n'a pas à être modifiée.
 */

var ID_SPRITE = 'modelagix-sprite';

/**
 * ── Grammaire des icônes d'outils ─────────────────────────────────────────
 *
 * Principe retenu avec Jean-Jacques : **la matière vue en coupe, et le sens de
 * la déformation**. Ce n'est pas un choix d'humeur — c'est l'invariant du
 * domaine. Tous ces outils sont « un pinceau » : montrer l'instrument ne
 * distinguerait rien. Seul l'effet différencie Gonfler de Dessiner.
 *
 * Intérêt pédagogique : l'élève lit une coupe, c'est-à-dire le raisonnement
 * même du modelage — ce qui arrive à l'épaisseur de matière. C'est ce que la
 * vue en perspective d'un volume ne montre jamais.
 *
 * Trois éléments, toujours les mêmes :
 *   1. UN INVARIANT — la ligne de surface, de x=3 à x=21, posée vers y=16 ou 17.
 *      Elle installe le sujet et fait lire la série comme un système.
 *   2. UNE VARIABLE — la déformation appliquée à cette ligne.
 *   3. UN MARQUEUR — une flèche courte, seulement là où deux effets voisins
 *      se confondraient.
 *
 * Les oppositions systématiques lèvent les trois ambiguïtés repérées à
 * l'analyse :
 *   - Dessiner / Gonfler        bosse locale + flèche unique  ≠  arc entier +
 *                               flèches multiples suivant la normale
 *   - Creuser / Dessiner        creux en V + flèche vers le bas  ≠  bosse +
 *                               flèche vers le haut
 *   - Pincer / Redimensionner   flèches rentrantes  ≠  flèches sortantes
 *
 * La clé correspond au nom d'outil de la façade.
 */

/**
 * ── Hiérarchie des traits ─────────────────────────────────────────────────
 *
 * Une icône dit trois choses à la fois, et jusqu'ici elle les disait toutes du
 * même trait : la matière, la référence et le sens du geste avaient le même
 * poids, si bien que l'œil ne savait pas par où commencer. D'où trois niveaux,
 * du plus lourd au plus léger.
 *
 *   1. L'EFFET — la matière et la forme qu'elle prend. Trait plein, 2 px,
 *      pleine intensité. C'est le sujet ; rien d'autre n'a ce poids.
 *      Aucun attribut à écrire : c'est ce que le CSS pose par défaut.
 *
 *   2. L'ACTION — ce que l'outil impose et qui n'est PAS de la matière :
 *      l'état d'avant, le plan visé, l'empreinte du pinceau. 1,5 px, 60 %,
 *      le plus souvent en pointillé. Présent, mais en retrait.
 *
 *   3. LE SENS — la flèche, posée par-dessus pour lever une ambiguïté.
 *      1 px, 45 %. Elle se lit en second, jamais avant la forme.
 *
 * Règle de partage, simple à appliquer : **si le trait est de la matière, c'est
 * le niveau 1 ; si c'est une référence ou un état révolu, le niveau 2 ; si
 * c'est une indication de sens posée par-dessus, le niveau 3.**
 *
 * Une conséquence à connaître, car elle surprend : dans « Tourner », l'arc EST
 * la matière en train de pivoter, ce n'est pas un commentaire sur le geste. Il
 * reste donc au niveau 1 bien qu'il ressemble à une flèche. Même chose pour le
 * cache de « Masquer » : c'est de la matière couverte, pas une indication.
 *
 * Les familles « vues » et « fichiers » ne relèvent pas de cette grammaire :
 * elles ne montrent aucune matière déformée et gardent leurs conventions.
 */
var ACTION = ' stroke-width="1.5" stroke-opacity="0.6"';
var SENS = ' stroke-width="1" stroke-opacity="0.45"';

/** Trait de niveau 2, en pointillé. */
var action = function (d, tirets) {
  return '<path d="' + d + '"' + ACTION +
    ' stroke-dasharray="' + (tirets || '2.5 2.5') + '"/>';
};

/** Flèche de niveau 3 — hampe et pointe, toujours du même poids. */
var fleche = function (hampe, pointe) {
  return '<path d="' + hampe + '"' + SENS + '/>' +
    (pointe ? '<path d="' + pointe + '"' + SENS + '/>' : '');
};

var TRACES = {

  // Pousser la matière : une bosse locale naît de la surface, sous une
  // poussée unique et dirigée.
  draw: '<path d="M3 17h4.5c2 0 2.2-7 4.5-7s2.5 7 4.5 7H21"/>' +
    fleche('M12 7.6V1.4', 'M10.4 3 12 1.4l1.6 1.6'),

  // Gonfler : toute la surface enfle. Deuxième essai — les trois flèches de la
  // première version devenaient des taches à 24 px. C'est l'écart entre l'état
  // d'avant (pointillé) et l'état d'après (plein) qui dit le gonflement, sans
  // qu'aucune flèche soit nécessaire pour le décrire.
  inflate: action('M3 18q9-5 18 0') +
    '<path d="M3 18q9-12 18 0"/>' +
    fleche('M12 8.8V1.6', 'M10.5 3.1 12 1.6l1.5 1.5'),

  // Creuser : un sillon étroit est enfoncé. Exactement l'inverse de Dessiner,
  // flèche comprise.
  crease: '<path d="M3 11.5h6l3 6.5 3-6.5h6"/>' +
    fleche('M12 1.4v6.6', 'M10.4 7 12 8.6l1.6-1.6'),

  // Aplatir : le relief qui dépassait est ramené à un même niveau.
  //
  // Troisième essai. Les deux précédents dessinaient la surface DÉJÀ plate et
  // ajoutaient un plan en pointillé — mais rien ne disait ce qui avait été
  // enlevé, et le pointillé se confondait avec les sommets qu'il touchait.
  // Pire : dans « Gonfler », le pointillé veut dire « état d'avant », et ici il
  // voulait dire « plan de référence ». Le même code visuel pour deux idées
  // différentes : l'œil ne pouvait pas s'y retrouver.
  //
  // Le pointillé reprend donc partout le même sens — l'état d'avant. On voit le
  // relief qui a été enlevé (niveau 2, révolu) et, en plein, le plateau qui l'a
  // remplacé (niveau 1, long et franchement horizontal : c'est lui le sujet).
  //
  // Pas de flèche, et c'est délibéré. La position relative des deux états suffit
  // à donner le sens, sans rien ajouter : dans « Gonfler » le plein est AU-DESSUS
  // du pointillé — ça a monté ; ici le plein est EN DESSOUS — ça a été rasé.
  // Une flèche centrée a été essayée : sa pointe venait toucher le sommet du
  // pointillé, exactement le défaut signalé sur les icônes agrandies.
  flatten: '<path d="M3 18H5L7.5 12H16.5L19 18H21"/>' +
    // Tirets courts : sur des segments de 6 unités, un pointillé ordinaire ne
    // poserait que deux marques, qu'on lirait comme deux accents et non comme
    // une ligne interrompue.
    action('M7.5 12L12 6.5L16.5 12', '1.8 1.4'),

  // Pincer : la matière est ramenée latéralement vers une arête.
  // Flèches RENTRANTES — opposé strict de Redimensionner.
  pinch: '<path d="M3 17.5h6l3-8 3 8h6"/>' +
    fleche('M2 20.5h7', 'M4 18.6 2 20.5l2 1.9') +
    fleche('M22 20.5h-7', 'M20 18.6 22 20.5l-2 1.9'),

  // Lisser : l'ondulation s'apaise jusqu'à disparaître.
  // Deuxième essai — la première version enchaînait six oscillations, qui à
  // 24 px se confondaient en un grésillement. Trois suffisent, et l'amplitude
  // qui décroît devient lisible.
  smooth: '<path d="M3 13c1.6-6.5 3.2 6.5 4.8 0s3.2 4 4.8 0 3.2 1.8 4.8 0h3.6"/>',

  // Saisir : une portion de matière est emportée sur le côté, en bloc.
  grab: '<path d="M3 17.5h4c1-5.5 4-7.5 6.5-5s.5 5 5.5 5h2"/>' +
    fleche('M7.5 5.5h8', 'M13.6 3.4l2.1 2.1-2.1 2.1'),

  // Tirer : la matière est entraînée et traîne derrière le geste.
  // Deuxième essai — les lignes de vitesse se collaient à la bosse à 24 px.
  // C'est désormais la FORME qui porte la différence : une montée longue et
  // une chute brève, au lieu de la bosse symétrique de Saisir. Aucune flèche
  // n'est nécessaire, l'asymétrie donne déjà le sens.
  drag: '<path d="M3 17.5c7.5 0 7-9 10.5-9L15.5 17.5H21"/>',

  // Tourner : la matière pivote autour de l'axe du pinceau, la surface reste.
  // L'arc est au niveau 1 : c'est la matière en mouvement, pas une flèche
  // d'indication. L'affaiblir viderait l'icône de son sujet.
  rotate: '<path d="M3 17.5h18"/>' +
    '<path d="M16.5 8.5a4.8 4.8 0 1 1-1.4-3.4"/>' +
    '<path d="M17 2.5v3.6h-3.6"/>',

  // Redimensionner : la matière enfle ou se rétracte sur place.
  // Flèches SORTANTES — opposé strict de Pincer.
  scale: '<path d="M3 17.5h3c1.5-8.5 7.5-8.5 9 0h3"/>' +
    fleche('M9 20.5H2', 'M4 18.6 2 20.5l2 1.9') +
    fleche('M15 20.5h7', 'M20 18.6 22 20.5l-2 1.9'),

  // Masquer : une part de la surface est mise hors d'atteinte.
  // Deuxième essai — la hachure devenait un pâté à 24 px. Un cache plein,
  // posé sur la moitié droite, se lit d'un coup d'œil. Il est plus épais que
  // le niveau 1 sans le contredire : ce n'est pas un trait mais une masse.
  mask: '<path d="M3 17.5h18"/>' +
    '<path d="M12.5 13.5h8" stroke-width="4.5"/>' +
    '<path d="M12 17.5v-6"/>',

  // Transformer : l'objet entier saisi par une poignée à trois axes. Il ne
  // déforme pas la matière — il la déplace —, donc il échappe à la grammaire
  // de la coupe et emprunte au vocabulaire des repères.
  transform: '<rect x="7.5" y="7.5" width="9" height="9" rx="1"/>' +
    fleche('M12 5.6V1.2M10.4 3 12 1.2l1.8 1.8') +
    fleche('M18.4 12h4.4M21 10.2 22.8 12l-1.8 1.8') +
    fleche('M12 18.4v4.4M10.4 21 12 22.8l1.8-1.8') +
    fleche('M5.6 12H1.2M3 10.2 1.2 12l1.8 1.8'),

  // ── Affichage et maillage ───────────────────────────────────────────
  // Ces icônes ne représentent pas une déformation de matière : elles ne
  // relèvent donc pas de la grammaire « coupe + sens de déformation »
  // retenue pour les outils, et resteront conventionnelles.

  // Le maillage : une surface décomposée en triangles.
  wireframe: '<path d="M3 19 12 4l9 15z"/><path d="M7.5 19 12 11.5 16.5 19M7.5 19h9"/>',

  // Détail dynamique : le maillage s'affine là où le pinceau passe.
  // Une moitié grossière, une moitié dense, et le cercle du pinceau.
  detailDynamique: '<path d="M3 19 12 4l9 15z"/>' +
    '<path d="M12 4v15M12 11.5h9M16.5 19 12 11.5"/>' +
    '<path d="M14.2 15.2h4.6M16.5 11.5v7.5"/>' +
    // L'empreinte du pinceau n'est pas de la matière : niveau 2.
    '<circle cx="16.5" cy="15.2" r="4.6"' + ACTION + ' stroke-dasharray="2 2"/>',

  // La grille du sol : un damier en perspective.
  grille: '<path d="M2 20h20"/><path d="M4.5 15.5h15M7 11.5h10M9 8h6"/>' +
    '<path d="M2 20 9 8M22 20 15 8M12 20V8"/>',

  // Symétrie : deux moitiés en miroir de part et d'autre d'un axe.
  // L'axe est une référence, pas de la matière : niveau 2.
  symmetry: action('M12 3v18', '2 2.5') +
    '<path d="M9.5 7 4.5 12l5 5z"/><path d="M14.5 7l5 5-5 5z"/>',

  // Maillage plus fin : la même surface, davantage divisée.
  subdivisionPlus: '<rect x="2.5" y="8" width="8" height="8" rx="1"/>' +
    '<rect x="13.5" y="8" width="8" height="8" rx="1"/>' +
    '<path d="M17.5 8v8M13.5 12h8"/>',

  // Maillage plus grossier : l'inverse.
  subdivisionMoins: '<rect x="2.5" y="8" width="8" height="8" rx="1"/>' +
    '<path d="M6.5 8v8M2.5 12h8"/>' +
    '<rect x="13.5" y="8" width="8" height="8" rx="1"/>',

  // ── Combiner des volumes ────────────────────────────────────────────
  //
  // Grammaire commune aux trois : DEUX DISQUES QUI SE CHEVAUCHENT, et c'est le
  // remplissage qui dit l'opération. C'est le langage des diagrammes d'ensemble,
  // celui qu'on apprend à l'école — inutile d'en inventer un autre.
  //
  // Le disque plein est dessiné avec un trait très épais plutôt qu'un `fill` :
  // le jeu entier est au trait, et un aplat s'y lirait comme un corps étranger.
  // Trop épais toutefois pour se lire seul : c'est le CONTOUR des deux disques,
  // toujours présent, qui donne la figure ; le remplissage ne fait que la
  // qualifier.

  // Additionner : les deux entiers.
  volumeAddition: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>' +
    '<path d="M12 6.7a6 6 0 0 0 0 10.6" stroke-opacity="0.35"/>',

  // Soustraire : le premier moins le second. Le disque de gauche est marqué,
  // moins la lentille commune — donc une lune.
  volumeSoustraction: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>' +
    '<path d="M9 6.2a6 6 0 0 0 0 11.6" stroke-width="4.4" stroke-opacity="0.55"/>',

  // Intersection : la lentille commune seule.
  volumeIntersection: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>' +
    '<path d="M12 6.9a6 6 0 0 0 0 10.2" stroke-width="4.4" stroke-opacity="0.55"/>',

  // Fusionner en fondu : les deux disques entiers, comme l'addition, mais leur
  // rencontre est adoucie par un congé — la goutte que forment deux bulles qui
  // se touchent. C'est le seul signe qui distingue les deux, et il suffit :
  // l'addition montre l'intersection, le fondu montre un raccord.
  volumeFondu: '<path d="M9 6.1a6 6 0 0 0 0 11.8"/>' +
    '<path d="M15 6.1a6 6 0 0 1 0 11.8"/>' +
    '<path d="M9 6.1c1.4 0 1.6 2.4 3 2.4s1.6-2.4 3-2.4"/>' +
    '<path d="M9 17.9c1.4 0 1.6-2.4 3-2.4s1.6 2.4 3 2.4"/>',

  // Creuser en fondu : le même raccord, mais en retrait — le disque de gauche
  // amputé d'une empreinte aux bords adoucis.
  volumeCreuxFondu: '<path d="M9 6.1a6 6 0 0 0 0 11.8"/>' +
    '<path d="M9 6.1c1.4 0 1.6 2.4 3 2.4s1.6-2.4 3-2.4"/>' +
    '<path d="M9 17.9c1.4 0 1.6-2.4 3-2.4s1.6 2.4 3 2.4"/>' +
    '<path d="M15 6.1a6 6 0 0 1 0 11.8" stroke-dasharray="2 2" stroke-opacity="0.5"/>',

  // Supprimer le volume sélectionné : la corbeille, sans ambiguïté possible.
  volumeSupprimer: '<path d="M4 6.5h16"/><path d="M9.5 6.5V4h5v2.5"/>' +
    '<path d="M6.5 6.5 7.6 20h8.8l1.1-13.5"/><path d="M10.3 10v6M13.7 10v6"/>',

  // ── Orientation des vues ────────────────────────────────────────────
  // Convention de cette famille : un rectangle figure l'objet, une barre
  // épaisse marque le côté depuis lequel on regarde. La vue de face et la vue
  // de derrière n'ont pas de côté à marquer : un disque signale qu'on est
  // dans l'axe, en trait plein devant, en pointillé derrière.

  vueFace: '<rect x="5" y="5" width="14" height="14" rx="1"/><circle cx="12" cy="12" r="2.5"/>',
  vueArriere: '<rect x="5" y="5" width="14" height="14" rx="1" stroke-dasharray="3 2.5"/>' +
    '<circle cx="12" cy="12" r="2.5"/>',
  vueDessus: '<rect x="5" y="8.5" width="14" height="10.5" rx="1"/><path d="M4 4.5h16" stroke-width="3"/>',
  vueDessous: '<rect x="5" y="5" width="14" height="10.5" rx="1"/><path d="M4 19.5h16" stroke-width="3"/>',
  vueGauche: '<rect x="8.5" y="5" width="10.5" height="14" rx="1"/><path d="M4.5 4v16" stroke-width="3"/>',
  vueDroite: '<rect x="5" y="5" width="10.5" height="14" rx="1"/><path d="M19.5 4v16" stroke-width="3"/>',

  // Les trois axonométries. Les tracés ne sont plus dessinés à vue : ils sont
  // CALCULÉS en projetant un cube selon l'orientation exacte de chaque vue,
  // puis mis à la même échelle. La silhouette hexagonale et la position du
  // sommet proche diffèrent donc réellement d'une icône à l'autre — c'est ce
  // qui les rend distinguables, là où trois cubes approximatifs se
  // confondaient.
  vueIsometrique: '<path d="M12.0 12.0 20.3 7.2 12.0 2.4 3.7 7.2 3.7 16.8 12.0 21.6ZM12.0 12.0L3.7 7.2M12.0 12.0L12.0 21.6M12.0 12.0L20.3 7.2"/>',
  vueDimetrique: '<path d="M12.0 8.3 21.6 5.5 12.0 2.7 2.4 5.5 2.4 18.5 12.0 21.3ZM12.0 8.3L2.4 5.5M12.0 8.3L12.0 21.3M12.0 8.3L21.6 5.5"/>',
  vueTrimetrique: '<path d="M14.5 8.8 21.3 4.7 9.5 2.4 2.7 6.4 2.7 19.3 14.5 21.6ZM14.5 8.8L2.7 6.4M14.5 8.8L14.5 21.6M14.5 8.8L21.3 4.7"/>',

  // Projection : le tronc de pyramide de la perspective, le prisme droit de
  // l\'orthographique. Deux icônes distinctes plutôt qu\'une seule à état, pour
  // qu\'on lise le mode courant sans avoir à interpréter un surlignage.
  projectionPerspective: '<path d="M9 4h6l5 16H4z"/><path d="M9 4 4 20M15 4l5 16"/>',
  projectionOrthographique: '<path d="M5 4h14v16H5z"/><path d="M5 9h14M5 15h14"/>',

  // Réglages : trois curseurs, chacun poussé à un endroit différent. Portée par
  // la languette du tiroir de droite, elle annonce ce qu'on y trouve — des
  // réglages — là où un chevron ne disait que « ça s'ouvre ».
  //
  // Les traits sont INTERROMPUS de part et d'autre de chaque bouton plutôt que
  // de passer dessous : à cette taille, un disque posé sur une ligne continue
  // devient un renflement, pas un curseur.
  reglages: '<path d="M4 7.5h4M12 7.5h8M4 12h10M18 12h2M4 16.5h6M14 16.5h6"/>' +
    '<circle cx="10" cy="7.5" r="2"/><circle cx="16" cy="12" r="2"/>' +
    '<circle cx="12" cy="16.5" r="2"/>',

  // Recadrer sur la scène.
  recadrer: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><circle cx="12" cy="12" r="3"/>',

  // Déplacer la vue : la main qui empoigne l'image et la fait coulisser.
  //
  // Trois dessins ont été comparés côte à côte, à 110, 46 et 24 px :
  //   - des coins de cadrage entourant une croix fléchée — les traits se
  //     rejoignaient en un losange plein dès 46 px, illisible ;
  //   - une croix fléchée seule — nette, mais elle raconte la même chose que
  //     « Transformer », qui porte déjà quatre flèches. Deux gestes opposés
  //     (l'objet bouge / le regard bouge) sous le même signe : à écarter ;
  //   - la main — aucun autre pictogramme du jeu n'est une main, la confusion
  //     est donc impossible, et le curseur prend justement cette forme dès que
  //     le mode est actif. Le dessin répond au geste.
  //
  // Autour d'elle, quatre chevrons cardinaux au NIVEAU 3 (fins, à 45 %) : ils ne
  // racontent plus le geste — la main s'en charge —, ils disent seulement dans
  // quelles directions il porte.
  //
  // **Ce sont des pointes seules, sans hampe**, et c'est la clé du dessin : une
  // flèche complète mange 4 unités de chaque bord, une pointe n'en mange que 1,6.
  // Les 5 unités ainsi rendues à la main lui ont fait gagner près de 40 % de
  // taille. Ne pas rallonger ces chevrons en croyant les compléter : la main
  // rapetisserait d'autant.
  //
  // La main est PLEINE, et c'est la seule du jeu dans ce cas. La version au trait
  // ne supportait pas d'être réduite : ses doigts sont écartés de 3 unités et le
  // trait en fait 2 : passé 30 % de réduction, l'intervalle se referme et les
  // doigts se soudent en un moignon — constaté à l'écran, pas déduit. Compenser
  // l'épaisseur ne change rien, c'est l'écart qui rétrécit, pas le trait. Une
  // silhouette pleine n'a aucun intervalle intérieur à boucher : elle tient à
  // n'importe quelle taille. Elle fait exception comme le cache de « Masquer »,
  // qui est lui aussi une masse et non une ligne.
  deplacerVue: '<g transform="translate(12 12) scale(0.85) translate(-11 -13)"' +
    ' fill="currentColor" stroke="none">' +
    '<path d="M8 14.2V7.4a1.5 1.5 0 0 1 3 0V6a1.5 1.5 0 0 1 3 0v1.6a1.5 1.5 0 0 1 3 0V15' +
    'c0 3.9-2.6 6.5-6.2 6.5c-2.5 0-4-1-5.2-2.7l-2.7-3.8a1.6 1.6 0 0 1 2.4-2L8 16.4Z"/>' +
    '</g>' +
    fleche('M10.4 3.4 12 1.8l1.6 1.6') +
    fleche('M10.4 20.6 12 22.2l1.6-1.6') +
    fleche('M3.4 10.4 1.8 12l1.6 1.6') +
    fleche('M20.6 10.4 22.2 12l-1.6 1.6'),

  // Affiner : le pinceau densifie le maillage sans déformer la surface.
  affiner: '<path d="M3 18h18"/>' +
    '<path d="M7.5 18v-4.5h9V18M12 18v-4.5M7.5 15.7h9"/>' +
    '<circle cx="12" cy="12.4" r="5.2"' + ACTION + ' stroke-dasharray="2 2"/>',

  // ── Fichiers ────────────────────────────────────────────────────────

  // Ouvrir : la matière entre dans l'application.
  importer: '<path d="M12 3v10"/><path d="M8 9.5l4 4 4-4"/><path d="M3.5 15.5v5h17v-5"/>',

  // Enregistrer : le support de sauvegarde.
  enregistrer: '<path d="M4 4h11.5L20 8.5V20H4z"/><path d="M8 4v5.5h7V4"/>' +
    '<path d="M7.5 20v-5.5h9V20"/>',

  // Exporter : la matière sort de l'application.
  exporter: '<path d="M12 14.5V4"/><path d="M8 8l4-4 4 4"/><path d="M3.5 15.5v5h17v-5"/>',

  // Nouvelle forme de départ : la motte de matière avant tout geste.
  nouvelleForme: '<circle cx="12" cy="13.5" r="6.5"/><path d="M12 3.5v3M9.5 4.5l1 2.5M14.5 4.5l-1 2.5"/>',

  // Annuler et rétablir : la flèche qui revient, et son miroir.
  annuler: '<path d="M4 10h11a5 5 0 0 1 0 10H8"/><path d="M8 6 4 10l4 4"/>',
  retablir: '<path d="M20 10H9a5 5 0 0 0 0 10h7"/><path d="M16 6l4 4-4 4"/>'
};

/** Injecte le sprite dans la page. Sans effet s'il y est déjà. */
var injecter = function () {
  if (document.getElementById(ID_SPRITE)) return;

  var symboles = '';
  for (var nom in TRACES) {
    symboles += '<symbol id="outil-' + nom + '" viewBox="0 0 24 24">' + TRACES[nom] + '</symbol>';
  }

  var conteneur = document.createElement('div');
  conteneur.id = ID_SPRITE;
  conteneur.setAttribute('aria-hidden', 'true');
  conteneur.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  conteneur.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg">' + symboles + '</svg>';
  document.body.appendChild(conteneur);
};

/** Le balisage d'une icône, à insérer dans un bouton. */
var baliser = function (nom) {
  return '<svg class="modelagix-icone" width="24" height="24" aria-hidden="true" focusable="false">' +
    '<use href="#outil-' + nom + '"></use></svg>';
};

export default {
  injecter: injecter,
  baliser: baliser,
  noms: Object.keys(TRACES)
};
