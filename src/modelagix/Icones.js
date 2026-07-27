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
 * Le geste de chaque outil, traduit en forme.
 * La clé correspond au nom d'outil de la façade.
 */
var TRACES = {

  // Pousser la matière vers l'extérieur : une bosse naît de la surface.
  draw: '<circle cx="12" cy="14" r="6"/><path d="M8.5 8.5Q12 2.5 15.5 8.5"/>',

  // Gonfler : la forme pousse dans toutes les directions.
  inflate: '<circle cx="12" cy="12" r="5"/>' +
    '<path d="M12 5V2M12 19v3M5 12H2M19 12h3"/>' +
    '<path d="M10.5 3.5 12 2l1.5 1.5M10.5 20.5 12 22l1.5-1.5"/>' +
    '<path d="M3.5 10.5 2 12l1.5 1.5M20.5 10.5 22 12l-1.5 1.5"/>',

  // Creuser une arête : un sillon en V.
  crease: '<circle cx="12" cy="12" r="7"/><path d="M8 8.5l4 7 4-7"/>',

  // Aplatir : une surface devient plane.
  flatten: '<circle cx="12" cy="12" r="7"/><path d="M4.5 10h15"/>',

  // Pincer : la matière est ramenée vers un point.
  pinch: '<circle cx="12" cy="12" r="4.5"/>' +
    '<path d="M2 12h3.5M22 12h-3.5"/>' +
    '<path d="M4 10l1.5 2L4 14M20 10l-1.5 2 1.5 2"/>',

  // Lisser : l'ondulation s'apaise.
  smooth: '<path d="M3 8.5c3-5 6 5 9 0s6-5 9 0"/><path d="M3 16.5h18"/>',

  // Saisir et déplacer la matière.
  grab: '<circle cx="9.5" cy="12" r="5"/><path d="M16 12h5.5"/><path d="M19 9l3 3-3 3"/>',

  // Tirer : la forme suit le mouvement, laissant une traînée.
  drag: '<circle cx="14" cy="12" r="5"/><path d="M2.5 9h4M1.5 12h5M2.5 15h4"/>',

  // Faire tourner la matière sur elle-même.
  rotate: '<path d="M19 12a7 7 0 1 1-2.05-4.95"/><path d="M19.5 3.5V8h-4.5"/>',

  // Agrandir ou réduire localement.
  scale: '<circle cx="12" cy="12" r="4.5"/>' +
    '<path d="M2.5 2.5v5M2.5 2.5h5M2.5 2.5 6 6"/>' +
    '<path d="M21.5 21.5v-5M21.5 21.5h-5M21.5 21.5 18 18"/>',

  // Masquer : une part est protégée, l'autre non.
  mask: '<circle cx="12" cy="12" r="7"/><path d="M12 5v14"/>' +
    '<path d="M13 8.5 17.5 13M13 12.5l3.5 3.5M13 16.5l1.8 1.8M14.5 6.2 17.8 9.5"/>',

  // ── Affichage et maillage ───────────────────────────────────────────
  // Ces icônes ne représentent pas une déformation de matière : elles ne
  // relèvent donc pas de la grammaire « coupe + sens de déformation »
  // retenue pour les outils, et resteront conventionnelles.

  // Le maillage : une surface décomposée en triangles.
  wireframe: '<path d="M3 19 12 4l9 15z"/><path d="M7.5 19 12 11.5 16.5 19M7.5 19h9"/>',

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

  // Les trois axonométries : le même cube, vu sous des angles de plus en plus
  // dissymétriques. La différence est ténue à 24 px — faiblesse assumée de
  // cette série provisoire, à retravailler au passage définitif.
  vueIsometrique: '<path d="M12 3.5 20.5 8.5v7L12 20.5 3.5 15.5v-7z"/><path d="M12 3.5v17M3.5 8.5l8.5 5 8.5-5"/>',
  vueDimetrique: '<path d="M12 5 20.5 9v5.5L12 19l-8.5-4.5V9z"/><path d="M12 5v14M3.5 9l8.5 4.5L20.5 9"/>',
  vueTrimetrique: '<path d="M12 4 20.5 9.5v5L12 20l-8.5-5.5v-6z"/><path d="M12 4v16M3.5 8.5l8.5 5 8.5-4"/>',

  // Projection : le tronc de pyramide de la perspective, le prisme droit de
  // l\'orthographique. Deux icônes distinctes plutôt qu\'une seule à état, pour
  // qu\'on lise le mode courant sans avoir à interpréter un surlignage.
  projectionPerspective: '<path d="M9 4h6l5 16H4z"/><path d="M9 4 4 20M15 4l5 16"/>',
  projectionOrthographique: '<path d="M5 4h14v16H5z"/><path d="M5 9h14M5 15h14"/>',

  // Recadrer sur la scène.
  recadrer: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><circle cx="12" cy="12" r="3"/>',

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
