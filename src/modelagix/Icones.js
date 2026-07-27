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
    '<path d="M13 8.5 17.5 13M13 12.5l3.5 3.5M13 16.5l1.8 1.8M14.5 6.2 17.8 9.5"/>'
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
