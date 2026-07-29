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

// Pour la seule marge du bord droit. Elle est définie là-bas parce que c'est la
// disposition qui décide de l'air autour des panneaux ; deux valeurs dans deux
// fichiers finissaient toujours par diverger — le cube s'est retrouvé à
// quatorze pixels du bord alors qu'on en avait demandé vingt-huit.
import Disposition from 'modelagix/Disposition';

var ID_STYLE = 'modelagix-style-parametres';

/** Calé à droite de la colonne d'outils (22 + 136 + 16), largeur fixe. */
var BORD_GAUCHE = 174;
/**
 * Largeur calée sur le PIRE CAS mesuré, pas sur une valeur choisie :
 *   marges 28 + icône 76 + gouttière 12 + témoin 66 + gouttière 12
 *   + 272 pour la ligne la plus chargée (les quatre actions de Masquer, 267).
 * Toute réduction en dessous tronque cette ligne — c'est ce qui s'est produit
 * deux fois. Si un libellé s'allonge, remesurer et remonter cette valeur.
 */
var LARGEUR = 500;
/**
 * Hauteur fixe, calculée pour DEUX rangées : les réglages en haut, les nuances
 * de l'outil en dessous. Fixe et non « au plus juste » : la barre garde le même
 * aspect quel que soit l'outil, même quand la seconde rangée est vide.
 */
var HAUTEUR = 132;
/** Côté du témoin de pinceau, en pixels. */
var TEMOIN = 66;

var CSS = [
  // Pendant « Déplacer la vue », l'outil affiché ici ne peut plus rien : ni sa
  // taille, ni sa force, ni ses options n'ont d'effet. On atténue le CONTENU de
  // la barre, pas la barre — son fond flouté est porté par un ::before, qui
  // pâlirait avec elle. Ce n'est pas le panneau qui est suspendu, ce sont les
  // réglages.
  '.modelagix-parametres.deplacement > * {',
  '  opacity: 0.34;',
  '  transition: opacity 160ms ease;',
  '}',
  // ── Une seule rangée en haut ──────────────────────────────────────────
  // Réglages, matières, vues et cube d'orientation y sont côte à côte. Chacun
  // se plaçait auparavant à la main, ce qui demandait de recalculer trois
  // positions à chaque changement de fenêtre ou de tiroir. Un conteneur en
  // flux fait ce travail sans qu'on ait à le décrire.
  '.modelagix-rangee-haut {',
  '  position: fixed;',
  '  top: 10px;',
  '  left: ' + BORD_GAUCHE + 'px;',
  '  right: ' + Disposition.MARGE + 'px;',
  '  z-index: 10;',
  '  display: flex;',
  '  align-items: flex-start;',
  '  gap: 10px;',
  // Jamais de retour à la ligne : le tiroir de droite en s'ouvrant rétrécit la
  // rangée, et un enfant qui passe à la ligne retombe au milieu de la vue,
  // par-dessus l'objet. C'est le panneau de réglages qui absorbe la
  // différence — il est le seul dont le contenu supporte de se resserrer.
  '  flex-wrap: nowrap;',
  '  pointer-events: none;',
  '  transition: right 250ms ease;',
  '}',
  // Les enfants, eux, restent cliquables : c'est la rangée qui laisse passer
  // la souris, pour ne pas voler les clics dans les vides entre les panneaux.
  '.modelagix-rangee-haut > * {',
  '  pointer-events: auto;',
  '}',
  '.modelagix-parametres {',
  '  flex: 0 1 auto;',
  // En dessous, les curseurs deviendraient illisibles : la rangée déborderait
  // plutôt que de descendre sous ce seuil.
  '  min-width: 400px;',
  // Dimensions FIXES. La barre était centrée sur la fenêtre et bornée par les
  // éléments voisins : elle changeait donc de largeur, de hauteur et de place
  // au gré de la fenêtre et du tiroir de droite. Un panneau de réglages doit
  // avoir un aspect stable — on lit un curseur là où on l'a laissé.
  // Seule la barre du haut la décale, verticalement.
  '  width: ' + LARGEUR + 'px;',
  '  box-sizing: border-box;',
  '  z-index: 10;',
  // Grille à colonnes FIXES, sur le principe de l'ergonomie visée : l'icône
  // de l'outil actif rappelle à quoi s'appliquent les réglages, Taille et
  // Force s'empilent juste à côté, puis les deux matières en vignette.
  // Colonnes fixes = rien ne se déplace quand un réglage devient indisponible.
  '  display: grid;',
  '  grid-template-columns: auto auto 1fr;',
  '  grid-template-rows: auto auto;',
  '  align-items: center;',
  '  height: ' + HAUTEUR + 'px;',
  '  gap: 4px 12px;',
  '  padding: 24px 30px;',
  // ── Contour réellement flou ───────────────────────────────────────────
  // Ni bordure, ni masque : le fond est porté par un calque posé DERRIÈRE le
  // contenu et flouté. Le flou déborde du calque et s'éteint progressivement,
  // ce qui donne un pourtour diffus sur les quatre côtés, sans arête.
  //
  // Les masques en dégradé ont été essayés d'abord : un dégradé radial ne fond
  // que les coins, et deux dégradés croisés s'ADDITIONNENT par défaut au lieu
  // de s'intersecter — le résultat restait opaque partout.
  '  background: transparent;',
  '  isolation: isolate;',
  '  mask-image: radial-gradient(115% 115% at 50% 50%,',
  '    #000 0%, #000 62%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.28) 90%, rgba(0,0,0,0) 100%);',
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
  // L'icône de l'outil actif, en grand.
  // L'icône dans son cadre, l'intitulé DESSOUS et hors du cadre : le nom
  // désigne l'outil, il n'est pas une partie de son pictogramme.
  // L'intitulé appartient à l'icône : centré sous elle, et non aligné sur la
  // ligne des paramètres, qui se rapporte aux réglages et non au nom.
  '.modelagix-outil-actif {',
  '  display: flex;',
  '  flex-direction: column;',
  '  align-items: center;',
  '  gap: 3px;',
  '}',
  '.modelagix-outil-actif .cadre-icone {',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  width: 66px;',
  '  height: 66px;',
  '  border-radius: 9px;',
  '  background: rgba(110, 168, 254, 0.16);',
  '  color: #8ec1ff;',
  '}',
  // Un cran au-dessus des étiquettes d'options : le nom de l'outil prime sur
  // ses réglages. Il ouvre leur rangée, aligné sous l'icône.
  // Largeur bornée et retour à la ligne autorisé : « Redimensionner » sur une
  // seule ligne élargissait cette colonne d'une trentaine de pixels, pris sur
  // la ligne des paramètres — qui s'en trouvait tronquée.
  '.modelagix-outil-actif .nom-outil {',
  '  max-width: 76px;',
  '  text-align: center;',
  '  font-size: 12px;',
  '  line-height: 1.15;',
  '  font-weight: 600;',
  '  color: #cfe0ff;',
  '}',
  '.modelagix-outil-actif svg {',
  '  fill: none;',
  '  stroke: currentColor;',
  '  stroke-width: 1.7;',
  '  stroke-linecap: round;',
  '  stroke-linejoin: round;',
  '}',
  // Pleine largeur de sa colonne : sans cela, ce bloc se dimensionnait sur les
  // curseurs et bridait la rangée des paramètres, qui s'en trouvait tronquée.
  // Témoin du pinceau : rayon = Taille, opacité = Force.
  '.modelagix-temoin {',
  '  width: ' + TEMOIN + 'px;',
  '  height: ' + TEMOIN + 'px;',
  '  align-self: center;',
  '}',
  '.modelagix-temoin .bord {',
  '  fill: none;',
  '  stroke: rgba(255, 255, 255, 0.22);',
  '  stroke-width: 1;',
  '  stroke-dasharray: 3 3;',
  '}',
  '.modelagix-temoin .disque {',
  '  fill: #8ec1ff;',
  '}',
  // Les trois lignes sont réparties sur toute la hauteur et centrées sur le
  // disque témoin, plutôt que tassées en haut.
  '.modelagix-reglages-empiles {',
  '  display: flex;',
  '  flex-direction: column;',
  '  align-items: stretch;',
  '  justify-content: space-between;',
  '  align-self: stretch;',
  '  width: 100%;',
  '  min-width: 0;',
  '  padding: 2px 0;',
  '}',
  '.modelagix-reglages-empiles > .modelagix-reglage {',
  '  flex: 0 0 auto;',
  '}',
  // Vignette de matière et de tampon : on choisit ce qu'on VOIT, pas un nom.
  '.modelagix-vignette {',
  '  width: 72px;',
  '  padding: 0;',
  '  border: 1px solid rgba(255, 255, 255, 0.18);',
  '  border-radius: 8px;',
  '  background: rgba(255, 255, 255, 0.05);',
  '  color: rgba(255, 255, 255, 0.7);',
  '  font: inherit;',
  '  cursor: pointer;',
  '  overflow: hidden;',
  '}',
  '.modelagix-vignette:hover {',
  '  border-color: rgba(110, 168, 254, 0.7);',
  '  color: #fff;',
  '}',
  '.modelagix-vignette img, .modelagix-vignette canvas {',
  '  display: block;',
  '  width: 100%;',
  '  height: 44px;',
  '  object-fit: contain;',
  '}',
  '.modelagix-vignette .vide {',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  height: 44px;',
  '  color: rgba(255,255,255,0.35);',
  '}',
  '.modelagix-vignette .nom {',
  '  display: block;',
  '  padding: 2px 4px;',
  '  font-size: 9px;',
  '  white-space: nowrap;',
  '  overflow: hidden;',
  '  text-overflow: ellipsis;',
  '}',
  // La grille de choix, ouverte au clic sur une vignette.
  // Panneau des matières, accolé à droite de la barre : ce ne sont pas des
  // réglages de l'outil, la barre ne doit donc encadrer qu'eux.
  '.modelagix-matieres {',
  '  flex: 0 0 auto;',
  '  box-sizing: border-box;',
  '  display: flex;',
  '  align-items: stretch;',
  '  gap: 10px;',
  '  height: ' + HAUTEUR + 'px;',
  '  padding: 24px 30px;',
  // ── Contour réellement flou ───────────────────────────────────────────
  // Ni bordure, ni masque : le fond est porté par un calque posé DERRIÈRE le
  // contenu et flouté. Le flou déborde du calque et s'éteint progressivement,
  // ce qui donne un pourtour diffus sur les quatre côtés, sans arête.
  //
  // Les masques en dégradé ont été essayés d'abord : un dégradé radial ne fond
  // que les coins, et deux dégradés croisés s'ADDITIONNENT par défaut au lieu
  // de s'intersecter — le résultat restait opaque partout.
  '  background: transparent;',
  '  isolation: isolate;',
  '  mask-image: radial-gradient(115% 115% at 50% 50%,',
  '    #000 0%, #000 62%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.28) 90%, rgba(0,0,0,0) 100%);',
  '  font: 12px/1.2 system-ui, -apple-system, sans-serif;',
  '  transition: top 250ms ease;',
  '}',
  '.modelagix-bloc-vignette {',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 3px;',
  '}',
  '.modelagix-bloc-vignette .titre-vignette {',
  // Gris atténué : ce sont des étiquettes de repérage, elles ne doivent pas
  // concurrencer les vignettes qu'elles surmontent.
  '  color: rgba(255, 255, 255, 0.45);',
  '  font-size: 13px;',
  '  font-weight: 600;',
  '  text-align: center;',
  '}',
  '.modelagix-bloc-vignette .modelagix-vignette {',
  '  flex: 1;',
  '  display: flex;',
  '  flex-direction: column;',
  '}',
  '.modelagix-bloc-vignette .modelagix-vignette img,',
  '.modelagix-bloc-vignette .modelagix-vignette canvas {',
  '  flex: 1;',
  '  height: auto;',
  '  min-height: 0;',
  '}',
  // ── Les matières sont des SPHÈRES : leur vignette est ronde ───────────
  //
  // L'image d'une matière est un carré dont les coins ne sont pas la sphère
  // mais le fond du rendu. Étalée sur toute la vignette, elle donnait un carré
  // aux angles sombres dont la boule débordait jusqu'au cadre.
  //
  // On la découpe donc en disque et on la centre, avec de l'air tout autour :
  // la sphère ne touche plus le contour arrondi. `object-fit: cover` sur une
  // boîte carrée et une source carrée ne déforme rien — c'est un recadrage à
  // l'identique.
  //
  // Le tampon, lui, N'EST PAS une sphère : c'est une empreinte carrée, et la
  // découper en rond en amputerait les coins, qui portent souvent le motif.
  // D'où la classe, plutôt qu'une règle valant pour les deux.
  '.modelagix-vignette.spherique img,',
  '.modelagix-vignette.spherique canvas {',
  '  flex: 0 0 auto;',
  // 40 px dans une vignette de 63 : le disque, son nom et l'air qui les sépare
  // du contour tiennent alors sans que rien ne frôle le bord arrondi. À 46, le
  // nom venait buter dessus.
  '  width: 40px;',
  '  height: 40px;',
  '  margin: 5px auto 2px;',
  '  border-radius: 50%;',
  '  object-fit: cover;',
  '}',
  // Le compteur d'origine, celui de yagui, disparaissait avec le tiroir ; le
  // nôtre reste. Les deux ensemble donnaient la même information deux fois,
  // à deux tailles et à deux endroits. C'est celui d'origine qui s'efface.
  //
  // Il n'a ni classe ni identifiant : c'est le seul <span> enfant direct de la
  // barre du haut (`<span><ul>Vertex : …</ul><ul>Faces : …</ul></span>`), et
  // c'est par là qu'on le désigne. Vérifié : il n'y en a qu'un.
  '.gui-topbar > span {',
  '  display: none !important;',
  '}',
  // ── Compteur discret, en bas à droite ────────────────────────────────
  // Il occupait l'angle HAUT-droit, où passe désormais la rangée : le cube
  // d'orientation et lui se disputaient les mêmes pixels. L'angle bas-droit
  // était vide, et un décompte se consulte sans qu'on ait besoin de l'avoir
  // sous les yeux en permanence.
  '.modelagix-compteur {',
  '  position: fixed;',
  '  z-index: 10;',
  '  padding: 5px 10px;',
  '  color: rgba(255, 255, 255, 0.55);',
  // 13 px : la taille exacte qu'avait celui d'origine, relevée dans la page.
  '  font: 13px/1.4 system-ui, -apple-system, sans-serif;',
  '  text-align: right;',
  '  white-space: nowrap;',
  '  pointer-events: none;',
  '  transition: right 250ms ease;',
  '}',
  '.modelagix-grille {',
  '  position: fixed;',
  '  z-index: 12;',
  '  display: grid;',
  '  grid-template-columns: auto auto 1fr;',
  '  gap: 6px;',
  '  max-height: 60vh;',
  '  overflow-y: auto;',
  '  padding: 8px;',
  '  border-radius: 10px;',
  '  background: rgba(36, 41, 48, 0.98);',
  '  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.5);',
  '}',
  '.modelagix-grille .titre {',
  '  grid-column: 1 / -1;',
  '  padding: 4px 2px 0;',
  '  color: rgba(255,255,255,0.45);',
  '  font-size: 10px;',
  '}',
  '.modelagix-grille .choisi {',
  '  border-color: #6ea8fe;',
  '  box-shadow: 0 0 0 1px #6ea8fe inset;',
  '}',
  // La ligne qui porte Force à gauche et Détail à droite.
  '.modelagix-ligne-force {',
  '  display: flex;',
  '  align-items: center;',
  '  min-width: 0;',
  '}',
  // La course de Force est figée à 145 px comme celle de Taille : la ligne ne
  // s'étire donc pas, elle prend ce qu'il lui faut et « Détail » suit.
  '.modelagix-ligne-force > .modelagix-reglage {',
  '  flex: 0 0 auto;',
  '}',
  // ── « Détail » : deux étages, à droite de Force ───────────────────────
  '.modelagix-detail {',
  // `position: relative` et un intitulé décollé : la barre des paramètres a une
  // hauteur FIXE, et deux étages empilés faisaient grandir la ligne de Force —
  // la rangée des options en était chassée hors du panneau. L'intitulé flotte
  // donc au-dessus sans compter dans la hauteur.
  '  position: relative;',
  '  display: flex;',
  '  align-items: center;',
  '  margin-left: 18px;',
  // La moitié de la course de Force — 72 px contre 145. En pixels et non en
  // proportion : les deux autres courses sont figées, une proportion aurait
  // rendu celle-ci seule élastique et l'aurait fait empiéter sur la valeur de
  // Force, ce qu'un premier essai a montré.
  '  flex: 0 0 72px;',
  '}',
  '.modelagix-detail input[type=range] {',
  '  flex: 0 0 72px;',
  '  width: 72px;',
  '  height: 14px;',
  '  -webkit-appearance: none;',
  '  appearance: none;',
  '  background: transparent;',
  '  cursor: pointer;',
  '}',
  '.modelagix-detail .titre-detail {',
  '  position: absolute;',
  '  left: 0;',
  '  right: 0;',
  '  top: -11px;',
  '  color: rgba(255, 255, 255, 0.55);',
  '  font-size: 10px;',
  '  line-height: 1;',
  '  text-align: center;',
  '  pointer-events: none;',
  '}',
  '.modelagix-reglage > span:first-child {',
  '  min-width: 38px;',
  '  color: rgba(255, 255, 255, 0.65);',
  '}',
  // Ligne fine et allongée d'un quart : on vise plus précisément sur une
  // course plus longue, et un trait mince encombre moins le regard.
  '.modelagix-reglage input[type=range] {',
  // flex figé : sans cela la mise en page comprimait la course à 130 px.
  '  flex: 0 0 145px;',
  '  width: 145px;',
  '  height: 14px;',
  '  -webkit-appearance: none;',
  '  appearance: none;',
  '  background: transparent;',
  '  cursor: pointer;',
  '}',
  // La part parcourue est bleue : on lit la valeur d'un coup d'œil, sans avoir
  // à comparer la position du bouton aux deux extrémités.
  '.modelagix-reglage input[type=range]::-webkit-slider-runnable-track,',
  '.modelagix-detail input[type=range]::-webkit-slider-runnable-track {',
  '  height: 3px;',
  '  border-radius: 2px;',
  '  background: linear-gradient(to right, #6ea8fe var(--part), rgba(255,255,255,0.22) var(--part));',
  '}',
  '.modelagix-reglage input[type=range]::-webkit-slider-thumb,',
  '.modelagix-detail input[type=range]::-webkit-slider-thumb {',
  '  -webkit-appearance: none;',
  '  width: 12px;',
  '  height: 12px;',
  '  margin-top: -4.5px;',
  '  border-radius: 50%;',
  '  background: #6ea8fe;',
  '}',
  '.modelagix-reglage input[type=range]::-moz-range-track,',
  '.modelagix-detail input[type=range]::-moz-range-track {',
  '  height: 3px;',
  '  border-radius: 2px;',
  '  background: linear-gradient(to right, #6ea8fe var(--part), rgba(255,255,255,0.22) var(--part));',
  '}',
  '.modelagix-reglage input[type=range]::-moz-range-thumb,',
  '.modelagix-detail input[type=range]::-moz-range-thumb {',
  '  width: 12px;',
  '  height: 12px;',
  '  border: none;',
  '  border-radius: 50%;',
  '  background: #6ea8fe;',
  '}',
  '.modelagix-valeur {',
  '  min-width: 30px;',
  '  text-align: right;',
  '  font-variant-numeric: tabular-nums;',
  '}',
  '.modelagix-liste {',
  '  max-width: 112px;',
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
  // Deuxième rangée : le tampon et les interrupteurs, seule partie de largeur
  // variable. Elle défile plutôt que de déformer la barre.
  '.modelagix-rangee2 {',
  // Hauteur fixe : le nombre de nuances change d'un outil à l'autre, et sans
  // cela la rangée rétrécissait, ce qui remontait Taille et Force de quelques
  // pixels — exactement le déplacement signalé sur l'outil Tirer.
  '  height: 22px;',
  '  align-items: center;',
  '  display: flex;',
  '  align-items: center;',
  '  gap: 14px;',
  '  overflow-x: auto;',
  '  scrollbar-width: thin;',
  '}',
  '.modelagix-pastilles {',
  '  display: flex;',
  '  flex: 0 1 auto;',
  '  min-width: 0;',
  '  gap: 7px;',
  // Les interrupteurs changent d'un outil à l'autre : leur rangée est la seule
  // partie de largeur variable. Elle défile plutôt que de déformer la barre.
  '  overflow-x: auto;',
  '  scrollbar-width: thin;',
  '}',
  // 11 px : c'est la taille qui permet à la ligne de l'outil Masquer — quatre
  // actions — de tenir entière sans être tronquée.
  '.modelagix-case {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 4px;',
  '  font-size: 11px;',
  '  color: rgba(255, 255, 255, 0.78);',
  '  white-space: nowrap;',
  '  cursor: pointer;',
  '}',
  '.modelagix-case input {',
  '  accent-color: #6ea8fe;',
  '  cursor: pointer;',
  '}',
  '.modelagix-pastille {',
  '  padding: 3px 7px;',
  '  font-size: 11px;',
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
  // Une action se produit une fois ; un interrupteur décrit un état. Le carré
  // les distingue de la pastille arrondie, pour qu'on ne cherche pas à savoir
  // si « Inverser » est enclenché.
  '.modelagix-action {',
  '  border-radius: 6px;',
  '  border-style: dashed;',
  // Même corps que les cases à cocher des autres outils : rien ne justifie
  // que les paramètres de Masquer s'affichent plus gros.
  '  font-size: 11px;',
  '  line-height: 1.2;',
  '}',
  '.modelagix-actions {',
  '  padding-left: 6px;',
  '  border-left: 1px solid rgba(255, 255, 255, 0.16);',
  '}',
  '.modelagix-pastille:focus-visible {',
  '  outline: 2px solid #6ea8fe;',
  '  outline-offset: 2px;',
  '}',
  '.modelagix-parametres::before {',
  '  content: \'\';',
  '  position: absolute;',
  '  inset: 26px;',
  '  border-radius: 16px;',
  '  background: rgba(26, 30, 36, 0.58);',
  '  filter: blur(22px);',
  '  z-index: -1;',
  '  pointer-events: none;',
  '}',
  '',
  '.modelagix-matieres::before {',
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
    // La façade prévient explicitement après chaque changement d'état : c'est
    // ce qui évite d'avoir à cliquer deux fois pour voir la barre suivre.
    if (facade.onChange) facade.onChange(this._cbSync);
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
    // La rangée du haut : elle accueillera les réglages, les matières, puis —
    // rattachés par la façade — le groupe des vues et le cube d'orientation.
    var rangee = document.createElement('div');
    rangee.className = 'modelagix-rangee-haut';
    document.body.appendChild(rangee);
    this._rangee = rangee;

    var barre = document.createElement('div');
    barre.className = 'modelagix-parametres';
    barre.setAttribute('role', 'group');
    barre.setAttribute('aria-label', 'Réglages de l\'outil');

    // 1. L'icône de l'outil actif : elle rappelle à quoi s'appliquent les
    //    réglages qui suivent, comme dans l'ergonomie visée.
    this._icone = document.createElement('div');
    this._icone.className = 'modelagix-outil-actif';
    barre.appendChild(this._icone);

    // 2. Le témoin du pinceau : un disque dont le rayon suit la Taille et
    //    l'opacité la Force, comme dans l'ergonomie visée. Il montre d'un coup
    //    d'oeil l'empreinte qu'on s'apprête à laisser, ce qu'aucun nombre ne
    //    dit aussi vite.
    this._temoin = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this._temoin.setAttribute('class', 'modelagix-temoin');
    this._temoin.setAttribute('viewBox', '0 0 ' + TEMOIN + ' ' + TEMOIN);
    this._temoin.setAttribute('aria-hidden', 'true');
    this._temoin.innerHTML =
      '<circle class="bord" cx="' + (TEMOIN / 2) + '" cy="' + (TEMOIN / 2) + '" r="' + (TEMOIN / 2 - 2) + '"/>' +
      '<circle class="disque" cx="' + (TEMOIN / 2) + '" cy="' + (TEMOIN / 2) + '" r="4"/>';
    barre.appendChild(this._temoin);

    // 3. Taille, Force et les paramètres de l'outil, empilés et alignés.
    var empiles = document.createElement('div');
    empiles.className = 'modelagix-reglages-empiles';
    barre.appendChild(empiles);

    this._curseurTaille = this._creerReglage(empiles, 'Taille', 5, 500, 1,
      function (v) { this._facade.setRadius(v); }.bind(this));

    // ── « Détail » partage la ligne de Force ─────────────────────────────
    //
    // Une ligne d'accueil, et les deux réglages dedans. Premier essai : greffer
    // « Détail » DANS la ligne de Force. La ligne s'est mise à grandir, la
    // grille du panneau a cédé et la rangée des options a disparu — un enfant
    // de plus dans une ligne calibrée pour trois, cela ne pardonne pas.
    var ligneForce = document.createElement('div');
    ligneForce.className = 'modelagix-ligne-force';
    empiles.appendChild(ligneForce);

    this._curseurForce = this._creerReglage(ligneForce, 'Force', 0, 100, 1,
      function (v) { this._facade.setIntensity(v); }.bind(this));

    // Il ne règle pas l'outil mais la FINESSE DE LA MATIÈRE sous l'outil : la
    // taille des polygones que le moteur crée en passant, et celle que la
    // préparation d'un tampon atteint. D'où la barre deux fois plus courte et
    // l'intitulé posé au-dessus plutôt qu'à côté — il n'est pas de la même
    // nature que Taille et Force.
    this._curseurDetail = this._creerDetail(ligneForce);

    // 3. Les deux matières sortent de la barre : elles ne sont pas des
    //    réglages de l'outil. Panneau accolé, à la même hauteur, chacune
    //    surmontée de son titre.
    var matieres = document.createElement('div');
    matieres.className = 'modelagix-matieres';
    this._rangee.appendChild(matieres);
    this._matieres = matieres;

    this._vignetteMatiere = this._creerVignette(matieres, 'Matière',
      this._ouvrirGrilleMatieres.bind(this), true);
    this._vignetteTampon = this._creerVignette(matieres, 'Tampon',
      this._ouvrirGrilleTampons.bind(this));

    // Deuxième rangée : uniquement les nuances de l'outil, toujours sous les
    // réglages de Taille et Force auxquels elles se rapportent.
    // Les paramètres de l'outil rejoignent la colonne des réglages : ils
    // s'alignent sur « Taille » et « Force », auxquels ils se rapportent,
    // plutôt que sur l'intitulé qui, lui, appartient à l'icône.
    var rangee2 = document.createElement('div');
    rangee2.className = 'modelagix-rangee2';
    empiles.appendChild(rangee2);

    this._pastilles = document.createElement('div');
    this._pastilles.className = 'modelagix-pastilles';
    rangee2.appendChild(this._pastilles);

    // Les actions immédiates de l'outil — aujourd'hui celles du masque.
    this._actions = document.createElement('div');
    this._actions.className = 'modelagix-pastilles modelagix-actions';
    rangee2.appendChild(this._actions);

    // La barre est le PREMIER enfant de la rangée : le panneau des matières,
    // créé plus tôt, y a déjà été ajouté.
    rangee.insertBefore(barre, rangee.firstChild);
    this._barre = barre;

    // Le compteur de sommets et de faces vivait dans la barre du haut de
    // l'interface d'origine : il disparaissait donc avec elle. C'est une
    // information de suivi, pas un réglage — elle doit rester visible.
    this._compteur = document.createElement('div');
    this._compteur.className = 'modelagix-compteur';
    document.body.appendChild(this._compteur);
  }

  _creerReglage(parent, libelle, min, max, pas, onChange) {
    var bloc = document.createElement('div');
    bloc.className = 'modelagix-reglage';
    // Rendu à l'appelant : « Détail » vient se greffer dans la ligne de Force.
    var leBloc = bloc;

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

    var appliquer = function (v) {
      v = Math.max(min, Math.min(max, v));
      curseur.value = v;
      curseur.style.setProperty('--part', ((v - min) / (max - min) * 100) + '%');
      valeur.textContent = Math.round(v);
      onChange(v);
      if (this._temoin) this._majTemoin();
    }.bind(this);

    // Clavier et clic simple : le comportement natif suffit.
    curseur.addEventListener('input', function () {
      appliquer(parseFloat(curseur.value));
    }, false);

    // ── Glissement piloté à la main ────────────────────────────────────────
    // Le glissement NATIF de ces curseurs ne fonctionne pas, et la cause est
    // hors de notre code : chaque curseur de yagui installe un écouteur
    // `mousemove` sur la fenêtre entière et appelle `preventDefault()` AVANT
    // de vérifier s'il est lui-même manipulé. Tout mouvement de souris de la
    // page est donc annulé, ce qui neutralise le glissement du navigateur.
    //
    // On ne peut pas le corriger à la source : yagui lie ses écouteurs à la
    // construction (`.bind`), donc corriger son prototype après coup n'atteint
    // pas les fonctions déjà liées, et la bibliothèque n'expose pas sa classe.
    //
    // On calcule donc la valeur nous-mêmes à partir de la position de la
    // souris. `preventDefault` n'empêche pas nos propres écouteurs de courir.
    var enCours = false;
    var depuisX = function (clientX) {
      var r = curseur.getBoundingClientRect();
      var t = r.width ? (clientX - r.left) / r.width : 0;
      appliquer(min + Math.max(0, Math.min(1, t)) * (max - min));
    };

    curseur.addEventListener('mousedown', function (ev) {
      enCours = true;
      depuisX(ev.clientX);
    }, false);

    window.addEventListener('mousemove', function (ev) {
      if (enCours) depuisX(ev.clientX);
    }, false);

    window.addEventListener('mouseup', function () {
      enCours = false;
    }, false);

    bloc.appendChild(titre);
    bloc.appendChild(curseur);
    bloc.appendChild(valeur);
    parent.appendChild(bloc);

    return { curseur: curseur, valeur: valeur, bloc: leBloc };
  }

  /**
   * Le réglage « Détail », greffé dans la ligne de Force.
   *
   * Deux étages : l'intitulé au-dessus, la barre en dessous. C'est ce qui permet
   * de le loger dans une ligne déjà occupée sans le faire passer pour un
   * troisième paramètre de l'outil — il n'en est pas un. Il ne règle pas l'outil
   * mais la FINESSE DE LA MATIÈRE sous l'outil.
   */
  _creerDetail(ligneDeForce) {
    var bloc = document.createElement('div');
    bloc.className = 'modelagix-detail';

    var titre = document.createElement('span');
    titre.className = 'titre-detail';
    titre.textContent = 'Détail';

    var curseur = document.createElement('input');
    curseur.type = 'range';
    curseur.min = 0;
    curseur.max = 100;
    curseur.step = 1;
    curseur.setAttribute('aria-label', 'Niveau de détail du maillage');
    curseur.title = 'Finesse des polygones créés par les outils et les tampons';

    var appliquer = function (v) {
      v = Math.max(0, Math.min(100, v));
      curseur.value = v;
      curseur.style.setProperty('--part', v + '%');
      this._facade.setDetail(v);
    }.bind(this);

    curseur.addEventListener('input', function () {
      appliquer(parseFloat(curseur.value));
    }, false);

    // Même correctif de glissement que pour Taille et Force : yagui annule tout
    // `mousemove` de la page, on calcule donc la valeur à la main.
    var enCours = false;
    var depuisX = function (clientX) {
      var r = curseur.getBoundingClientRect();
      var t = r.width ? (clientX - r.left) / r.width : 0;
      appliquer(Math.max(0, Math.min(1, t)) * 100);
    };
    curseur.addEventListener('mousedown', function (ev) {
      enCours = true;
      depuisX(ev.clientX);
    }, false);
    window.addEventListener('mousemove', function (ev) {
      if (enCours) depuisX(ev.clientX);
    }, false);
    window.addEventListener('mouseup', function () { enCours = false; }, false);

    bloc.appendChild(titre);
    bloc.appendChild(curseur);
    ligneDeForce.appendChild(bloc);

    // ── L'état de départ, sans quoi le rail reste invisible ─────────────
    //
    // Le rail est peint par un dégradé qui s'arrête à `--part`. Cette variable
    // n'existe qu'après le premier réglage : à l'ouverture, le dégradé n'avait
    // pas de borne et le rail ne se voyait pas — seul le bouton apparaissait,
    // posé sur rien. On pose donc la valeur tout de suite.
    var depart = this._facade.getDetail ? this._facade.getDetail() : 50;
    curseur.value = depart;
    curseur.style.setProperty('--part', depart + '%');

    return { curseur: curseur };
  }

  /**
   * Une vignette cliquable, surmontée de son titre.
   * @param {boolean} [spherique] la vignette montre une sphère : on la découpe
   *   en disque. Les tampons, eux, sont des empreintes carrées.
   */
  _creerVignette(parent, etiquette, onClick, spherique) {
    var bloc = document.createElement('div');
    bloc.className = 'modelagix-bloc-vignette';
    var titre = document.createElement('span');
    titre.className = 'titre-vignette';
    titre.textContent = etiquette;
    bloc.appendChild(titre);
    parent.appendChild(bloc);
    parent = bloc;

    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'modelagix-vignette' + (spherique ? ' spherique' : '');
    bouton.setAttribute('aria-label', etiquette);
    bouton.addEventListener('click', function (ev) { onClick(ev.currentTarget); }, false);
    parent.appendChild(bouton);
    return { bouton: bouton, etiquette: etiquette, dernier: null };
  }

  /** Remplit une vignette avec une image (ou un canevas) et un nom. */
  _remplirVignette(v, contenu, nom) {
    if (v.dernier === nom) return;
    v.dernier = nom;
    v.bouton.innerHTML = '';
    if (contenu) v.bouton.appendChild(contenu);
    else {
      var vide = document.createElement('span');
      vide.className = 'vide';
      vide.textContent = '—';
      v.bouton.appendChild(vide);
    }
    var titre = document.createElement('span');
    titre.className = 'nom';
    titre.textContent = nom;
    v.bouton.appendChild(titre);
    v.bouton.title = v.etiquette + ' : ' + nom;
  }

  _fermerGrille() {
    if (!this._grille) return;
    window.removeEventListener('mousedown', this._cbFermerGrille, false);
    if (this._grille.parentNode) this._grille.parentNode.removeChild(this._grille);
    this._grille = null;
  }

  /** Grille de choix ancrée sous une vignette. */
  _ouvrirGrille(ancre, entrees, courant, choisir, spherique) {
    if (this._grille) return this._fermerGrille();

    var grille = document.createElement('div');
    grille.className = 'modelagix-grille';
    var familleCourante = null;

    entrees.forEach(function (e) {
      if (e.famille && e.famille !== familleCourante) {
        familleCourante = e.famille;
        var t = document.createElement('div');
        t.className = 'titre';
        t.textContent = e.famille;
        grille.appendChild(t);
      }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'modelagix-vignette' + (e.cle === courant ? ' choisi' : '') +
        (spherique ? ' spherique' : '');
      if (e.contenu) b.appendChild(e.contenu);
      else {
        var vide = document.createElement('span');
        vide.className = 'vide';
        vide.textContent = '—';
        b.appendChild(vide);
      }
      var n = document.createElement('span');
      n.className = 'nom';
      n.textContent = e.libelle;
      b.appendChild(n);
      b.title = e.libelle;
      // Une entrée peut porter sa propre action au lieu d'être un choix — c'est
      // ainsi qu'« Importer une image » prend place dans la grille des tampons,
      // à l'endroit même où on cherche un tampon.
      b.addEventListener('click', function () {
        this._fermerGrille();
        if (e.action) e.action();
        else choisir(e.cle);
        this._synchroniser();
      }.bind(this), false);
      grille.appendChild(b);
    }.bind(this));

    document.body.appendChild(grille);
    var r = ancre.getBoundingClientRect();
    grille.style.left = Math.max(8, Math.min(r.left,
      document.documentElement.clientWidth - grille.offsetWidth - 8)) + 'px';
    grille.style.top = (r.bottom + 6) + 'px';
    this._grille = grille;

    this._cbFermerGrille = function (ev) {
      if (!grille.contains(ev.target) && !ancre.contains(ev.target)) this._fermerGrille();
    }.bind(this);
    window.setTimeout(function () {
      window.addEventListener('mousedown', this._cbFermerGrille, false);
    }.bind(this), 0);
  }

  /**
   * L'aperçu d'une matière. Les sphères de matière ont leur image ; les
   * environnements n'ont qu'un panorama illisible en vignette, on calcule donc
   * la sphère qu'ils éclairent.
   */
  _apercuMatiere(m, cote) {
    if (m.cle === 'normal') return this._facade.normalesVignette(cote);
    if (m.cle.indexOf('pbr:') === 0) {
      return this._facade.environnementVignette(parseInt(m.cle.slice(4), 10), cote);
    }
    if (!m.vignette) return null;
    var img = document.createElement('img');
    img.src = m.vignette;
    img.alt = '';
    return img;
  }

  _ouvrirGrilleMatieres(ancre) {
    var f = this._facade;
    var entrees = f.listMaterials().map(function (m) {
      return { cle: m.cle, libelle: m.libelle, famille: m.famille,
               contenu: this._apercuMatiere(m, 72) };
    }.bind(this));
    this._ouvrirGrille(ancre, entrees, f.getMaterial(), function (c) { f.setMaterial(c); }, true);
  }

  _ouvrirGrilleTampons(ancre) {
    var f = this._facade;

    // ── Rangés par thème ─────────────────────────────────────────────────
    // Un tampon importé depuis un dossier porte le nom de ce dossier. On
    // regroupe donc la grille comme l'utilisateur avait rangé ses images : les
    // tampons livrés d'abord, sans titre, puis un bloc par dossier.
    var groupes = {};
    var sansTheme = [];
    f.listAlphas().forEach(function (nom) {
      var entree = {
        cle: nom, libelle: nom, famille: null,
        contenu: f.alphaVignette(nom, 72)
      };
      var theme = f.alphaTheme(nom);
      if (!theme) return sansTheme.push(entree);
      entree.famille = theme;
      (groupes[theme] || (groupes[theme] = [])).push(entree);
    });

    var entrees = sansTheme;
    Object.keys(groupes).sort().forEach(function (theme) {
      entrees = entrees.concat(groupes[theme]);
    });

    // Les deux imports sont les PREMIÈRES entrées, pas des boutons ailleurs :
    // on cherche un tampon ici, c'est donc ici qu'on doit pouvoir en apporter.
    var pastille = function (signe) {
      var e = document.createElement('span');
      e.className = 'vide';
      e.textContent = signe;
      return e;
    };
    entrees.unshift({
      cle: null, libelle: 'Importer un dossier…', famille: null,
      contenu: pastille('++'),
      action: this._importerTampons.bind(this, true)
    });
    entrees.unshift({
      cle: null, libelle: 'Importer des images…', famille: null,
      contenu: pastille('+'),
      action: this._importerTampons.bind(this, false)
    });

    this._ouvrirGrille(ancre, entrees, f.getAlpha(), function (c) { f.setAlpha(c); });
  }

  /**
   * Ouvre le sélecteur de fichier et fabrique un tampon avec l'image choisie.
   *
   * Le champ de fichier est créé puis jeté à chaque fois : un `input` conservé
   * dans la page garde son ancienne valeur, et réimporter deux fois la même
   * image ne déclencherait alors aucun événement `change`.
   */
  _importerTampons(dossier) {
    var champ = document.createElement('input');
    champ.type = 'file';
    champ.style.display = 'none';

    if (dossier) {
      // `webkitdirectory` n'est pas une norme, mais c'est le seul moyen
      // d'ouvrir un dossier, et les trois navigateurs de bureau le comprennent.
      // Il descend dans les SOUS-DOSSIERS : choisir un dossier parent qui en
      // contient plusieurs importe donc tous les thèmes d'un coup.
      champ.setAttribute('webkitdirectory', '');
      champ.setAttribute('directory', '');
    } else {
      champ.accept = 'image/*';
      champ.multiple = true;
    }

    document.body.appendChild(champ);

    champ.addEventListener('change', function () {
      var fichiers = champ.files;
      document.body.removeChild(champ);
      if (!fichiers || !fichiers.length) return;

      this._facade.importAlphaFiles(fichiers, function (bilan) {
        // Le dernier importé devient le tampon courant : c'est celui qu'on
        // vient de choisir, on ne va pas le faire chercher dans la liste.
        if (bilan.dernier) this._facade.setAlpha(bilan.dernier);
        this._synchroniser();

        var message = bilan.ajoutes + ' tampon(s) ajouté(s)';
        if (bilan.themes.length) {
          message += ', rangés en ' + bilan.themes.length + ' thème(s) : ' +
            bilan.themes.join(', ');
        }
        message += '.';
        if (bilan.souci) message += '\n\n' + bilan.souci;
        // On ne dérange que s'il y a quelque chose à dire au-delà du succès
        // d'un import unique — sinon le message serait un obstacle de plus.
        if (bilan.souci || bilan.ajoutes > 1) window.alert(message);
      }.bind(this));
    }.bind(this), false);

    champ.click();
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

  /** L'icône de l'outil actif, en grand. */
  /**
   * Le témoin : rayon proportionnel à la Taille, opacité à la Force.
   *
   * Le rayon suit une racine plutôt que la valeur brute : la Taille va de 5 à
   * 500, et une échelle linéaire écraserait toutes les petites valeurs — or
   * c'est précisément là qu'on a besoin de voir la différence.
   */
  _majTemoin() {
    var taille = this._facade.getRadius();
    if (this._curseurDetail && document.activeElement !== this._curseurDetail.curseur) {
      var detail = this._facade.getDetail();
      this._curseurDetail.curseur.value = detail;
      this._curseurDetail.curseur.style.setProperty('--part', detail + '%');
    }

    var force = this._facade.getIntensity();
    var disque = this._temoin.querySelector('.disque');
    var rMax = TEMOIN / 2 - 2;

    var t = taille === null ? 0 : (taille - 5) / 495;
    disque.setAttribute('r', (3 + Math.sqrt(Math.max(0, t)) * (rMax - 3)).toFixed(1));
    // Un fond minimal même à force nulle, sinon le disque disparaît et on ne
    // voit plus la taille qu'on règle.
    disque.setAttribute('fill-opacity',
      (0.12 + (force === null ? 0 : force / 100) * 0.88).toFixed(3));
  }

  /** Sommets et faces de la scène, format identique à celui d'origine. */
  _majCompteur() {
    var info = this._facade.getMeshInfo();
    var texte = 'Sommets : ' + info.sommets.toLocaleString('fr-FR') +
      '\nFaces : ' + info.faces.toLocaleString('fr-FR');
    if (texte === this._dernierCompteur) return;
    this._dernierCompteur = texte;
    this._compteur.innerHTML = texte.split('\n')
      .map(function (l) { return '<div>' + l + '</div>'; }).join('');
  }

  _majIcone() {
    var cle = this._facade.getToolIconKey();
    if (cle === this._derniereIcone) return;
    this._derniereIcone = cle;
    this._icone.innerHTML = cle
      ? '<span class="cadre-icone"><svg width="46" height="46" viewBox="0 0 24 24">' +
        '<use href="#outil-' + cle + '"></use></svg></span>' +
        '<span class="nom-outil">' + (this._facade.getToolLabel() || '') + '</span>'
      : '';
  }

  /** Les deux vignettes : matière visible, tampon en niveaux de gris. */
  _majVignettes() {
    var f = this._facade;

    var cle = f.getMaterial();
    var mat = f.listMaterials().filter(function (m) { return m.cle === cle; })[0];
    if (mat) this._remplirVignette(this._vignetteMatiere, this._apercuMatiere(mat, 96), mat.libelle);

    var dispo = f.hasAlpha();
    this._vignetteTampon.bouton.disabled = !dispo;
    this._vignetteTampon.bouton.style.opacity = dispo ? '' : '0.4';
    if (dispo) {
      var nom = f.getAlpha();
      this._remplirVignette(this._vignetteTampon, f.alphaVignette(nom, 72), nom);
    }
  }

  _majMatiereAncien() {
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
    importer.textContent = 'Importer';
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
      // Une case à cocher, pas une pastille : ces réglages décrivent un état
      // qu'on active ou non, et la case le dit sans qu'on ait à interpréter
      // un surlignage.
      var etiquette = document.createElement('label');
      etiquette.className = 'modelagix-case';
      etiquette.dataset.cle = opt.cle;

      var boite = document.createElement('input');
      boite.type = 'checkbox';
      boite.checked = opt.actif;
      boite.addEventListener('change', this._basculerOption.bind(this, opt.cle), false);

      etiquette.appendChild(boite);
      etiquette.appendChild(document.createTextNode(opt.libelle));
      this._pastilles.appendChild(etiquette);
    }
  }

  /**
   * Les actions immédiates de l'outil courant. Séparées visuellement des
   * interrupteurs : une pastille d'option décrit un état, une action se produit
   * une fois. Les confondre ferait croire qu'« Inverser » reste enclenché.
   */
  _reconstruireActions() {
    var actions = this._facade.listToolActions();
    this._actions.innerHTML = '';
    for (var i = 0; i < actions.length; ++i) {
      var a = actions[i];
      if (a.cle === 'invert') {
        // Inverser est le seul état : appliqué deux fois, il revient au point
        // de départ. Une case le dit mieux qu'un bouton.
        var etiq = document.createElement('label');
        etiq.className = 'modelagix-case';
        var boite = document.createElement('input');
        boite.type = 'checkbox';
        boite.addEventListener('change', a.action, false);
        etiq.appendChild(boite);
        etiq.appendChild(document.createTextNode(a.libelle));
        this._actions.appendChild(etiq);
        continue;
      }
      var bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'modelagix-pastille modelagix-action';
      bouton.textContent = a.libelle;
      bouton.addEventListener('click', a.action, false);
      this._actions.appendChild(bouton);
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
  /** La rangée du haut, pour que la façade y range les vues et le cube. */
  /** Le panneau des réglages (taille, force, options). */
  panneauReglages() {
    return this._barre;
  }

  /** Le panneau des matières et des tampons. */
  panneauMatieres() {
    return this._matieres;
  }

  rangeeHaut() {
    return this._rangee;
  }

  /**
   * Il ne reste presque rien à placer.
   *
   * Réglages, matières, vues et cube sont désormais côte à côte dans une même
   * rangée en flux : elle les dispose et les renvoie à la ligne toute seule
   * quand la fenêtre se resserre. Trois calculs de position ont disparu avec
   * elle, dont celui qui faisait passer le panneau des matières sous la barre.
   *
   * Seuls le bord droit de la rangée et le compteur suivent encore le tiroir.
   */
  _positionner() {
    var droite = (this._tiroir ? this._tiroir.largeurDroiteVoulue() : 0) + Disposition.MARGE;
    if (this._rangee) this._rangee.style.right = droite + 'px';
    if (this._compteur) {
      this._compteur.style.bottom = '8px';
      this._compteur.style.right = droite + 'px';
    }
  }

  /** Aligne l'affichage sur l'état réel du moteur. */
  _synchroniser() {
    this._positionner();

    // Pendant « Déplacer la vue », l'outil affiché ici ne peut rien faire : ni
    // sa taille, ni sa force, ni ses options n'ont d'effet. La barre s'atténue
    // pour le dire, comme le groupe d'outils de la colonne de gauche.
    //
    // Le panneau « Matière » n'en fait pas partie et reste à pleine intensité :
    // changer de matière est un choix d'affichage, il marche toujours.
    this._barre.classList.toggle('deplacement', this._facade.isPanView());

    var outil = this._facade.getTool();
    if (outil !== this._dernierOutil) {
      this._dernierOutil = outil;
      this._reconstruirePastilles();
      this._reconstruireActions();
    }

    var taille = this._facade.getRadius();
    if (taille !== null && document.activeElement !== this._curseurTaille.curseur) {
      this._curseurTaille.curseur.value = taille;
      this._curseurTaille.curseur.style.setProperty('--part', ((taille - 5) / 495 * 100) + '%');
    }
    this._curseurTaille.valeur.textContent = taille === null ? '—' : Math.round(taille);
    this._curseurTaille.curseur.disabled = taille === null;

    if (this._curseurDetail && document.activeElement !== this._curseurDetail.curseur) {
      var detail = this._facade.getDetail();
      this._curseurDetail.curseur.value = detail;
      this._curseurDetail.curseur.style.setProperty('--part', detail + '%');
    }

    var force = this._facade.getIntensity();
    if (force !== null && document.activeElement !== this._curseurForce.curseur) {
      this._curseurForce.curseur.value = force;
      this._curseurForce.curseur.style.setProperty('--part', force + '%');
    }
    // On DÉSACTIVE au lieu de masquer : Tirer n'a pas de force, et faire
    // disparaître la ligne déplaçait Taille sous le regard de l'utilisateur.
    this._curseurForce.valeur.textContent = force === null ? '—' : Math.round(force);
    this._curseurForce.curseur.disabled = force === null;
    this._curseurForce.curseur.style.opacity = force === null ? '0.35' : '';

    this._majCompteur();
    this._majIcone();
    this._majTemoin();
    this._majVignettes();

    var cases = this._pastilles.children;
    for (var i = 0; i < cases.length; ++i) {
      var c = cases[i];
      var boiteC = c.querySelector('input');
      if (boiteC) boiteC.checked = this._facade.getOption(c.dataset.cle) === true;
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
