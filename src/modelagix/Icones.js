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
var TRACES = {

  // Pousser la matière : une bosse locale naît de la surface, sous une
  // poussée unique et dirigée.
  draw: '<path d="M3 17h4.5c2 0 2.2-7 4.5-7s2.5 7 4.5 7H21"/>' +
    '<path d="M12 9.2V1.6" stroke-width="1" stroke-opacity="0.5"/><path d="M10.4 3.2 12 1.6l1.6 1.6" stroke-width="1" stroke-opacity="0.5"/>',

  // Gonfler : toute la surface enfle. Deuxième essai — les trois flèches de la
  // première version devenaient des taches à 24 px. C'est l'écart entre l'état
  // d'avant (pointillé) et l'état d'après (plein) qui dit le gonflement, sans
  // qu'aucune flèche soit nécessaire pour le décrire.
  inflate: '<path d="M3 18q9-5 18 0" stroke-dasharray="2.5 2.5"/>' +
    '<path d="M3 18q9-12 18 0"/>' +
    '<path d="M12 9.4V2" stroke-width="1" stroke-opacity="0.5"/><path d="M10.5 3.5 12 2l1.5 1.5" stroke-width="1" stroke-opacity="0.5"/>',

  // Creuser : un sillon étroit est enfoncé. Exactement l'inverse de Dessiner,
  // flèche comprise.
  crease: '<path d="M3 11.5h6l3 6.5 3-6.5h6"/>' +
    '<path d="M12 1.6v7.6" stroke-width="1" stroke-opacity="0.5"/><path d="M10.4 7.6 12 9.2l1.6-1.6" stroke-width="1" stroke-opacity="0.5"/>',

  // Aplatir : un plan est imposé, les reliefs qui le dépassent sont rasés.
  // Deuxième essai — les flèches ont sauté. Les sommets dessinés PLATS disent
  // à eux seuls le rasage ; le plan en pointillé rappelle que c'est une
  // référence, non de la matière.
  flatten: '<path d="M3 17.5h2l1.5-6.5h4l1.5 6.5h1l1.5-6.5h4l1.5 6.5H21"/>' +
    '<path d="M3 11h18" stroke-dasharray="2.5 2.5"/>',

  // Pincer : la matière est ramenée latéralement vers une arête.
  // Flèches RENTRANTES — opposé strict de Redimensionner.
  pinch: '<path d="M3 17.5h6l3-8 3 8h6"/>' +
    '<path d="M2 20.5h7" stroke-width="1" stroke-opacity="0.5"/><path d="M4 18.6 2 20.5l2 1.9" stroke-width="1" stroke-opacity="0.5"/>' +
    '<path d="M22 20.5h-7" stroke-width="1" stroke-opacity="0.5"/><path d="M20 18.6 22 20.5l-2 1.9" stroke-width="1" stroke-opacity="0.5"/>',

  // Lisser : l'ondulation s'apaise jusqu'à disparaître.
  // Deuxième essai — la première version enchaînait six oscillations, qui à
  // 24 px se confondaient en un grésillement. Trois suffisent, et l'amplitude
  // qui décroît devient lisible.
  smooth: '<path d="M3 13c1.6-6.5 3.2 6.5 4.8 0s3.2 4 4.8 0 3.2 1.8 4.8 0h3.6"/>',

  // Saisir : une portion de matière est emportée sur le côté, en bloc.
  grab: '<path d="M3 17.5h4c1-5.5 4-7.5 6.5-5s.5 5 5.5 5h2"/>' +
    '<path d="M7.5 5.5h8" stroke-width="1" stroke-opacity="0.5"/><path d="M13.6 3.4l2.1 2.1-2.1 2.1" stroke-width="1" stroke-opacity="0.5"/>',

  // Tirer : la matière est entraînée et traîne derrière le geste.
  // Deuxième essai — les lignes de vitesse se collaient à la bosse à 24 px.
  // C'est désormais la FORME qui porte la différence : une montée longue et
  // une chute brève, au lieu de la bosse symétrique de Saisir. Aucune flèche
  // n'est nécessaire, l'asymétrie donne déjà le sens.
  drag: '<path d="M3 17.5c7.5 0 7-9 10.5-9L15.5 17.5H21"/>',

  // Tourner : la matière pivote autour de l'axe du pinceau, la surface reste.
  rotate: '<path d="M3 17.5h18"/>' +
    '<path d="M16.5 8.5a4.8 4.8 0 1 1-1.4-3.4"/>' +
    '<path d="M17 2.5v3.6h-3.6"/>',

  // Redimensionner : la matière enfle ou se rétracte sur place.
  // Flèches SORTANTES — opposé strict de Pincer.
  scale: '<path d="M3 17.5h3c1.5-8.5 7.5-8.5 9 0h3"/>' +
    '<path d="M9 20.5H2" stroke-width="1" stroke-opacity="0.5"/><path d="M4 18.6 2 20.5l2 1.9" stroke-width="1" stroke-opacity="0.5"/>' +
    '<path d="M15 20.5h7" stroke-width="1" stroke-opacity="0.5"/><path d="M20 18.6 22 20.5l-2 1.9" stroke-width="1" stroke-opacity="0.5"/>',

  // Masquer : une part de la surface est mise hors d'atteinte.
  // Deuxième essai — la hachure devenait un pâté à 24 px. Un cache plein,
  // posé sur la moitié droite, se lit d'un coup d'œil.
  mask: '<path d="M3 17.5h18"/>' +
    '<path d="M12.5 13.5h8" stroke-width="4.5"/>' +
    '<path d="M12 17.5v-6"/>',

  // Transformer : l'objet entier saisi par une poignée à trois axes. Il ne
  // déforme pas la matière — il la déplace —, donc il échappe à la grammaire
  // de la coupe et emprunte au vocabulaire des repères.
  transform: '<rect x="7.5" y="7.5" width="9" height="9" rx="1"/>' +
    '<path d="M12 7.5V1.6M10.2 3.4 12 1.6l1.8 1.8" stroke-width="1" stroke-opacity="0.5"/>' +
    '<path d="M16.5 12h5.9M20.6 10.2 22.4 12l-1.8 1.8" stroke-width="1" stroke-opacity="0.5"/>' +
    '<path d="M12 16.5v5.9M10.2 20.6 12 22.4l1.8-1.8" stroke-width="1" stroke-opacity="0.5"/>' +
    '<path d="M7.5 12H1.6M3.4 10.2 1.6 12l1.8 1.8" stroke-width="1" stroke-opacity="0.5"/>',

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
    '<circle cx="16.5" cy="15.2" r="4.6" stroke-dasharray="2 2"/>',

  // La grille du sol : un damier en perspective.
  grille: '<path d="M2 20h20"/><path d="M4.5 15.5h15M7 11.5h10M9 8h6"/>' +
    '<path d="M2 20 9 8M22 20 15 8M12 20V8"/>',

  // Symétrie : deux moitiés en miroir de part et d'autre d'un axe.
  symmetry: '<path d="M12 3v18" stroke-dasharray="2 2.5"/>' +
    '<path d="M9.5 7 4.5 12l5 5z"/><path d="M14.5 7l5 5-5 5z"/>',

  // Maillage plus fin : la même surface, davantage divisée.
  subdivisionPlus: '<rect x="2.5" y="8" width="8" height="8" rx="1"/>' +
    '<rect x="13.5" y="8" width="8" height="8" rx="1"/>' +
    '<path d="M17.5 8v8M13.5 12h8"/>',

  // Maillage plus grossier : l'inverse.
  subdivisionMoins: '<rect x="2.5" y="8" width="8" height="8" rx="1"/>' +
    '<path d="M6.5 8v8M2.5 12h8"/>' +
    '<rect x="13.5" y="8" width="8" height="8" rx="1"/>',

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

  // Recadrer sur la scène.
  recadrer: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><circle cx="12" cy="12" r="3"/>',

  // Affiner : le pinceau densifie le maillage sans déformer la surface.
  affiner: '<path d="M3 18h18"/>' +
    '<path d="M7.5 18v-4.5h9V18M12 18v-4.5M7.5 15.7h9"/>' +
    '<circle cx="12" cy="12.4" r="5.2" stroke-dasharray="2 2"/>',

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
