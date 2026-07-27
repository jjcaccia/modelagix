# NOTES.md — MODELAGIX

Mémoire du projet entre les sessions. Voir `Ressources/CLAUDE.md` pour le
cahier des charges.

---

## Où en est-on

**Jalon 1 atteint (27 juillet 2026) : SculptGL fonctionne, sans aucune
modification du code.**

C'est notre point de comparaison. Si quelque chose casse plus tard, on sait que
ça marchait ici.

---

## Comment relancer l'application

### La méthode simple

**Double-cliquer sur `demarrer.command`** dans le Finder.

Le script active Node 18, applique l'option de compatibilité OpenSSL, construit
l'application, lance le serveur, ouvre le navigateur, et reconstruit
automatiquement à chaque fichier enregistré. Après une modification, il suffit
de recharger la page (`Cmd` + `R`).

Pour tout arrêter : `Ctrl` + `C` dans la fenêtre du Terminal ouverte par le
script.

Si macOS refuse de l'ouvrir la première fois (« développeur non identifié »),
faire un clic droit sur le fichier → **Ouvrir** → confirmer. C'est à faire une
seule fois.

### La méthode manuelle

Utile pour comprendre ce que fait le script, ou pour dépanner. Ouvrir le
Terminal, puis coller ces trois blocs l'un après l'autre.

**1. Se placer dans le projet et activer Node 18 :**

```bash
cd ~/Documents/MODELAGIX/modelagix
export PATH="/opt/homebrew/opt/node@18/bin:$PATH"
export NODE_OPTIONS=--openssl-legacy-provider
```

**2. Construire l'application** (à refaire après chaque modification du code) :

```bash
node_modules/.bin/webpack
```

Pour qu'elle se reconstruise automatiquement à chaque enregistrement de
fichier, ajouter `-w` : `node_modules/.bin/webpack -w`.

**3. Lancer le serveur local**, puis ouvrir `http://localhost:8080` :

```bash
node_modules/.bin/http-server app -p 8080 -c-1
```

Pour arrêter le serveur : `Ctrl` + `C` dans le Terminal.

---

## Environnement installé

| Élément | Version | Remarque |
| --- | --- | --- |
| Node.js (projet) | 18.20.8 | via Homebrew, `node@18` |
| Node.js (système) | 26.3.1 | inchangé, non utilisé ici |
| yarn | 1.22.22 | via `corepack`, pas d'installation globale |
| webpack | 5.21.2 | figé par `yarn.lock`, daté de 2021 |

---

## Pièges rencontrés — à ne pas réapprendre

**1. Node 18 est obligatoire.** Avec Node 26 (la version du système), la
construction échoue. Ne pas « moderniser » la chaîne d'outils : elle est datée,
mais elle fonctionne.

**2. `NODE_OPTIONS=--openssl-legacy-provider` est obligatoire.** Sans cette
variable, webpack s'arrête sur `ERR_OSSL_EVP_UNSUPPORTED`. Webpack 5.21 calcule
des empreintes de fichiers avec une méthode que Node 18 refuse par défaut.
La variable réautorise l'ancienne méthode. Ce n'est pas un correctif provisoire,
c'est la condition de fonctionnement de ce projet.

**3. Electron a été volontairement écarté à l'installation**
(`ELECTRON_SKIP_BINARY_DOWNLOAD=1`). Il sert à fabriquer une version installable
sur ordinateur, hors périmètre : MODELAGIX vit dans le navigateur. Aucun fichier
du projet n'a été modifié pour cela. Si la version bureau devenait utile, il
suffirait de relancer `yarn install` sans cette variable.

**4. Le chemin du projet ne doit contenir ni espace ni deux-points.** Les outils
de construction JavaScript traitent souvent `:` comme un séparateur de chemins.
Le projet a été déplacé dans `~/Documents/MODELAGIX` pour cette raison.

**5. `package-lock.json` et `pnpm-lock.yaml` traînent à la racine** en plus de
`yarn.lock`. Ils viennent du dépôt d'origine. On utilise **yarn** et uniquement
yarn ; yarn affiche un avertissement à ce sujet, il est sans conséquence.

**6. Une seule reconstruction à la fois.** `webpack -w` est un processus séparé
qui survivait à la fermeture brutale de sa fenêtre Terminal. On s'est retrouvé
avec **quatre reconstructions simultanées** écrivant toutes `app/sculptgl.js` :
c'est une course, le fichier produit peut devenir incohérent, et la panne est
alors incompréhensible — le code source est juste, le résultat non.

`demarrer.command` s'en protège maintenant de deux façons : il enregistre le
numéro de la reconstruction dans `.veille.pid` et arrête celle d'une session
précédente au démarrage ; et son `trap` couvre `EXIT INT TERM HUP`, donc la
reconstruction meurt avec son script quelle que soit la façon de quitter.

Pour vérifier à la main :

```bash
pgrep -fl webpack
```

Une seule ligne doit apparaître. S'il y en a plusieurs, fermer toutes les
fenêtres Terminal de MODELAGIX et relancer `demarrer.command`.

---

## Inventaire du moteur — noms vérifiés dans `src/`

Relevé en lisant le code, pas de mémoire. C'est la matière de la façade.

| Fonction | Où ça se passe |
| --- | --- |
| Choisir un outil | menu déroulant de `GuiSculpting`, valeurs dans `Enums.Tools` |
| Taille du pinceau | curseur Rayon → écrit `tool._radius` (5 à 500) |
| Force du pinceau | curseur Intensité → écrit `tool._intensity` (0 à 100, divisé par 100) |
| Symétrie | `sculptManager._symmetry` — **aucune fonction dédiée**, l'interface d'origine écrit le champ directement |
| Filaire | `mesh.setShowWireframe(bool)` |
| Matériau (matcap) | `mesh.setMatcap(n)` + mode d'affichage sur `Enums.Shader.MATCAP` |
| Ouvrir un fichier 3D | champ caché `fileopen` (OBJ, PLY, STL, SGL) |
| Annuler / Rétablir | `gui._ctrlStates.onUndo()` / `onRedo()` — **pas** `stateManager.undo()` seul, qui n'interrompt pas la sculpture en cours ni ne rafraîchit l'interface |
| Export STL | `Export.exportBinarySTL(meshes)` |
| Formes de base | `scene.addSphere()`, `addCube()`, `addCylinder()`, `addTorus()` |

### Deux constats d'architecture

**Le moteur d'affichage ne dépend pas de l'interface.** `Gui.js` expose bien
`getWireframe()`, `getShaderType()` et `getFlatShading()`, mais rien ne les
appelle : ce sont des restes inutilisés. L'état d'affichage vit sur l'objet 3D.

**L'interface de sculpture, elle, porte de l'état.** Le menu déroulant de yagui
fait autorité pour les raccourcis clavier (`Maj` bascule sur Lissage et revient
au relâchement ; `X` et `C` règlent taille et force à la souris, en passant par
les curseurs).

→ **Règle pour la façade :** là où un réglage yagui existe, la façade le
**pilote** au lieu de l'ignorer. On écrit dans le curseur, le curseur écrit dans
le moteur. Sinon deux vérités divergent et le bogue devient introuvable.

### `Paint.js` ne peut pas être supprimé

`Masking.js` réutilise `Paint.prototype.stroke` : le masque est une peinture
appliquée dans un canal invisible. Le masque est dans le périmètre, donc le
fichier reste. On peut seulement retirer Peinture de la liste des outils
proposés.

---

## Décisions prises

**Le tiroir latéral remplace la suppression de yagui** (modifie la section 9 du
cahier des charges). yagui n'est plus retiré au troisième temps : il devient le
tiroir des fonctions avancées, rangé hors du champ. La barre inspirée du modèle
d'ergonomie reste à gauche, permanente. Rien n'est perdu, beaucoup de travail
est évité.

- Ouverture par **languette visible au bord droit**, plus raccourci clavier.
  Pas de survol (déclenchement accidentel en cours de sculpture), pas de
  double-clic (invisible pour un élève, en concurrence avec les gestes du
  stylet).
- Contrepartie assumée : yagui reste une dépendance non maintenue, et son style
  diffère de la nouvelle barre.

**Peinture : cachée d'abord.** On ne la met pas dans la barre de gauche — coût
nul. On essaiera de vider sa case dans le registre des outils au moment de
construire le tiroir ; si l'essai est propre, on garde le retrait. Résidu assumé
en attendant : la peinture reste atteignable par le tiroir, ce que la section 6
excluait.

---

## La façade — faite et vérifiée

`src/modelagix/Facade.js`. **Seul fichier de src/ qui nous appartient**, tout le
reste est du SculptGL d'origine.

Branchement : `main.js` l'expose sous `window.ModelagixFacade`, et
`tools/index.dev.html` en crée une instance dans `window.modelagix` juste après
le démarrage.

> ⚠️ `tools/index.release.html` et `tools/index.website.html` n'ont **pas**
> encore cette ligne. À ajouter avant toute mise en ligne, sinon la nouvelle
> interface n'aura rien à appeler.

Ce qu'elle expose : `listTools`, `getTool`, `setTool`, `getRadius`/`setRadius`,
`getIntensity`/`setIntensity`, `getSymmetry`/`setSymmetry`,
`getWireframe`/`setWireframe`, `listMatcaps`/`getMatcap`/`setMatcap`,
`addSphere`/`addCube`/`addCylinder`/`addTorus`, `openFile`, `exportSTL`,
`exportGLB`/`buildGLB`, `undo`/`redo`.

Noms d'outils acceptés (vocabulaire de l'interface visée, section 8) :
`draw`, `inflate`, `crease`, `flatten`, `pinch`, `smooth`, `grab`, `drag`,
`rotate`, `scale`, `mask`. Peinture et Transform en sont absents.

### Vérification faite dans le navigateur : 21 tests, 21 réussis

Les 11 outils changent bien l'index réel du moteur ; taille et force écrivent
bien `_radius` et `_intensity` ; symétrie, filaire et matériau agissent sur le
moteur ; annuler/rétablir ajoutent et retirent réellement un objet. Après ces
manipulations, l'ancien panneau affichait toujours le bon état — c'est la
preuve que piloter les réglages, plutôt que les contourner, garde une seule
vérité dans le logiciel.

**Non testés, volontairement :** `openFile` (ouvre un dialogue) et `exportSTL`
(déclenche un téléchargement). Seul leur câblage a été vérifié. À essayer à la
main depuis la console du navigateur :

```js
modelagix.exportSTL()   // doit télécharger yourMesh.stl
modelagix.openFile()    // doit ouvrir le sélecteur de fichier
```

## Export GLB — ajouté par MODELAGIX

`src/modelagix/ExportGLB.js`. SculptGL exporte en OBJ, PLY, STL et SGL, mais pas
en glTF : il a fallu l'écrire. **Aucune dépendance ajoutée, aucun fichier du
moteur modifié** — on lui demande ses données fusionnées via
`Remesh.mergeArrays`, exactement comme le fait l'export STL d'origine, et on les
met en forme.

Le GLB contient position, normale et couleur par sommet, plus une matière PBR
neutre. Les normales sont recalculées et lissées : sans elles, les visionneuses
en fabriquent par face et la sculpture apparaît à facettes.

`modelagix.buildGLB()` fabrique le fichier sans l'enregistrer,
`modelagix.exportGLB()` le télécharge. Cette séparation existe pour pouvoir
vérifier le fichier produit sans déclencher de téléchargement.

**Repère :** glTF et SculptGL partagent la même convention (repère direct, Y
vers le haut). Aucune conversion d'axes.

### Vérification : 15 contrôles de structure, plus l'orientation

Signature, version, longueurs, alignement sur 4 octets, cohérence des vues
mémoire, indices dans les bornes, normales unitaires. Puis l'orientation, qui
est le vrai risque d'un exportateur écrit à la main : volume signé positif, et
normales identiques à celles du moteur sur les 98 306 sommets.

**Piège rencontré pendant ce contrôle :** les normales du moteur ne sont **pas**
unitaires — elles valent environ 4·10⁻⁵, pondérées par l'aire, et sont
normalisées plus tard dans le shader. Un test qui les suppose unitaires ne
compare rien. Ses tableaux sont par ailleurs sur-alloués (297 603 valeurs pour
98 306 sommets) : ne jamais parcourir un tableau du moteur sur sa longueur, mais
sur `getNbVertices()`.

**Vérifié par l'usage (27 juillet 2026) :** fichier produit et ouvert avec
succès par Jean-Jacques. L'export GLB est fonctionnel de bout en bout.

**Poids :** environ 5,6 Mo pour une sphère de 196 608 triangles, dont 1,2 Mo de
couleurs par sommet. La peinture étant hors périmètre, on pourrait les retirer —
mais elles préservent les couleurs d'un modèle importé colorié. Laissées en
place pour l'instant.

## Le tiroir — fait et vérifié

`src/modelagix/Tiroir.js`, branché sur la façade
(`isDrawerOpen`, `openDrawer`, `closeDrawer`, `toggleDrawer`).

Une languette de 24 × 120 px au bord droit escamote les deux barres d'origine.
La touche `Tab` fait la même chose — elle était libre, les raccourcis de
SculptGL n'utilisent que les chiffres, des lettres et la touche Suppr.

**Ce qu'il ne faut surtout pas refaire autrement :** on passe par le
`setVisibility` des barres de yagui, **pas** par du CSS. yagui recalcule
lui-même la zone de dessin quand une barre disparaît (son code teste l'état
caché pour ramener la largeur à zéro) et prévient le moteur via son callback de
redimensionnement. Escamoter les barres à la main laisserait la zone de dessin
à sa largeur réduite, avec un vide à droite.

Mesuré : zone de dessin à 504 × 763 tiroir ouvert, 814 × 843 — la fenêtre
entière — tiroir fermé.

### Vérifié dans le navigateur

Clic réel sur la languette, touche `Tab`, et surtout **9 contrôles de la façade
tiroir fermé** : `setTool`, `setRadius`, `setIntensity`, `setSymmetry`,
`setWireframe` agissent sur le moteur exactement comme tiroir ouvert, et le
menu yagui caché reste synchrone avec l'outil courant. Aucune erreur en console.

C'est la validation de la stratégie de la section 8 du cahier des charges :
cacher yagui ne casse rien, et la façade reste le seul point de contact.

### Deux points à connaître

**Le tiroir est ouvert au démarrage**, volontairement : tant que la barre de
gauche n'existe pas, le fermer par défaut laisserait l'application sans aucune
commande. À basculer sur « fermé » dès que la barre de gauche sera en place —
c'est une seule ligne, `this._ouvert` dans le constructeur de `Tiroir`.

**La languette faisait 16 px dans sa première version.** Trop étroit : je l'ai
ratée moi-même à la souris pendant les essais. Élargie à 24 px. Ne pas la
réduire : au stylet, sur tablette, la cible doit rester atteignable.

## La barre d'outils de gauche — faite et vérifiée

`src/modelagix/BarreOutils.js` et `src/modelagix/Icones.js`.

Onze outils, dans l'ordre de la palette visée. La barre **ne parle qu'à la
façade** : elle ignore tout du moteur. On peut la redessiner, ou la remplacer,
sans rien casser ailleurs.

Elle se resynchronise après chaque frappe et chaque clic, parce qu'elle n'est
pas la seule source de vérité : les raccourcis chiffrés du moteur et le maintien
de `Maj` (qui bascule sur Lissage) changent l'outil sans passer par elle.

### Les icônes sont provisoires

`Icones.js` contient un sprite unique, une icône par `<symbol>`, appelée par
`<use href="#outil-…">`. Tracés géométriques écrits à la main : **rien n'est
repris d'une application existante**, aucune question de droit d'auteur ne se
pose ni maintenant ni au remplacement.

Pour remplacer une icône, ne toucher qu'à la chaîne correspondante dans
`TRACES`. `BarreOutils.js` n'a pas à être modifié.

**Nuance assumée sur la section 10 du cahier des charges :** le texte demande
`fill="currentColor"`. Ces pictogrammes sont dessinés au trait, donc c'est
`stroke` qui porte la couleur. L'intention — couleur héritée, états gérés
entièrement en CSS — est respectée. Les deux propriétés sont posées une seule
fois sur `.modelagix-icone`, pas répétées sur chaque tracé.

### Vérifié dans le navigateur

Les 11 outils commandent le bon indice du moteur, un seul bouton surligné à la
fois, la barre suit les raccourcis clavier, et le tiroir ne régresse pas.

---

## Piège de méthode : une fausse piste, et pourquoi

Un test avait l'air de montrer qu'après un clic sur un bouton de la barre, les
raccourcis clavier cessaient de répondre. J'ai « corrigé » en empêchant les
boutons de prendre le focus.

**Le diagnostic était faux.** L'outil d'automatisation du navigateur envoie ses
événements clavier **sans renseigner `event.which` ni `event.keyCode`** (ils
valent 0), or `GuiSculpting.onKeyDown` lit `event.which`. C'était l'outil de
test qui était en cause, pas l'application.

Vérifié ensuite : le focus sur un bouton **ne bloque pas** les raccourcis, et la
barre d'espace n'actionne pas un bouton focalisé — SculptGL appelle
`preventDefault()` sur toutes les touches, ce qui neutralise déjà l'activation.
Le correctif ne réparait donc rien : il a été retiré.

**À retenir :** pour tester un raccourci clavier de ce projet, envoyer un
événement avec `which` et `keyCode` renseignés. Un test qui échoue n'accuse pas
forcément le code — vérifier l'instrument avant de modifier l'application.

## La barre de paramètres, en haut — faite et vérifiée

`src/modelagix/BarreParametres.js` et `src/modelagix/OptionsOutils.js`.

Curseurs Taille et Force, puis les interrupteurs de l'outil courant en
pastilles. La rangée se reconstruit à chaque changement d'outil : Argile
n'existe que pour Dessiner, Tangentiel que pour Lisser, et Tirer n'a aucune
option.

### Le piège des deux vérités, et comment on l'évite

La case à cocher de yagui garde son état **dans son propre élément HTML**
(`domCheckbox.checked`), pas dans l'outil. Écrire `tool._clay = true`
directement laisserait la case sur son ancienne valeur ; au clic suivant, elle
repartirait de cet état périmé.

On passe donc par `widget.setValue(valeur)` : le callback du widget écrit dans
l'outil, et la case reste juste. **Ne jamais écrire une option d'outil
directement.**

### Comment on retrouve la bonne case

yagui ne garde aucune trace de la propriété qu'une case pilote. On pourrait la
reconnaître à son étiquette — mais l'utilisateur peut changer la langue de
l'application en cours de route, et l'étiquette changerait avec.

On l'identifie donc **par ce qu'elle écrit** : appel du callback avec une valeur
témoin, observation de la propriété qui bouge, restauration immédiate. Ces
callbacks ne font qu'écrire une propriété (vérifié dans `GuiSculptingTools`),
donc l'opération est sans effet de bord. Indépendant de la langue et de l'ordre
d'affichage. La découverte n'a lieu qu'une fois, au démarrage.

### Deux choix à connaître

**`lockPosition` n'est pas affiché.** Il règle la position des textures alpha
(les tampons), fonction que notre interface n'expose pas. Un interrupteur sans
effet visible serait du bruit.

**« Soft » n'existe pas dans SculptGL.** Le plus proche est la dureté du bord
(`_hardness`), présente uniquement sur Masque et Peinture. Rien n'a été inventé.

### Vérifié dans le navigateur

11 contrôles : les deux curseurs commandent le moteur, une pastille bascule
l'outil **et** la case yagui en restant cohérente, les pastilles changent bien
d'un outil à l'autre, et les curseurs suivent un changement venu d'ailleurs.

## La barre de gauche en trois groupes — faite et vérifiée

Structure décidée avec Jean-Jacques, sur le modèle de l'ergonomie visée :

1. **Outils de sculpture** — les 11 outils
2. **Affichage et maillage** — filaire, symétrie, maillage plus grossier / plus fin
3. **Fichiers** — ouvrir, enregistrer (.sgl), exporter

Disposition **en trois colonnes** plutôt qu'en colonne unique : dix-huit boutons
empilés dépasseraient la hauteur d'un écran de portable, et le regard ne
trouverait plus les groupes.

### Finesse du maillage : deux comportements en un bouton

`subdivideUp()` monte d'un cran s'il existe un niveau plus fin ; sinon il en
**crée** un (`GuiTopology.subdivide()`, opération coûteuse). `subdivideDown()`
fait l'inverse, avec la subdivision inverse en dernier recours.

On pilote `_ctrlResolution` plutôt que `selectResolution` : le curseur d'origine
pousse l'état d'annulation et rafraîchit l'affichage, ce que la méthode seule ne
fait pas.

L'infobulle affiche **niveau N sur M**. Sans cette indication, rien ne distingue
« déjà au plus fin » de « le bouton ne marche pas ».

### Le tampon (alpha) dans la barre du haut

`_idAlpha` est une chaîne, pas un nombre : `Picking.ALPHAS` est indexé par nom.
On pilote la liste déroulante d'origine (`GuiTools[i]._ctrlAlpha`), dont le
callback écrit dans l'outil.

**Piège corrigé :** les tampons se chargent **en différé**, après la
construction de la barre. La liste restait figée sur son contenu du premier
instant — un seul tampon sur trois. `BarreParametres` enveloppe désormais
`Gui.addAlphaOptions` pour se resynchroniser quand le moteur signale leur
arrivée. Cela couvre aussi les tampons importés par l'utilisateur.

**À savoir :** les 11 outils de notre palette acceptent tous un tampon. Le bloc
« Tampon » ne se masque donc jamais en pratique ; la condition existe par
prudence, au cas où la palette changerait.

### Vérifié dans le navigateur

11 contrôles : liste des tampons complète, choix d'un tampon répercuté sur
l'outil, filaire et symétrie, ajout et retrait d'un niveau de maillage,
infobulle de niveau, menu des quatre formats d'export et sa fermeture.

## Orientation des vues — faite et vérifiée

`src/modelagix/Vues.js`, quatrième groupe **en haut** de la barre de gauche.

Neuf vues, plus la bascule de projection et le recadrage. Les six vues
orthogonales existaient déjà dans le moteur (`resetViewFront`, `resetViewTop`…) :
on les appelle, on ne les réécrit pas.

### Les trois axonométries sont calculées, et mesurées

Elles n'existaient pas. Une axonométrie se définit par le raccourcissement de
chaque axe à l'écran : si `d` est la direction de vue, l'axe *i* est vu à
l'échelle `sqrt(1 - d[i]²)`.

| Vue | Angles | Raccourcissements mesurés | Définition |
| --- | --- | --- | --- |
| Isométrique | azimut 45°, élévation 35,264° | 1 · 1 · 1 | 3 axes égaux |
| Dimétrique | azimut 45°, élévation 16,87° | 0,769 · 1 · 0,769 | 2 axes égaux |
| Trimétrique | azimut 30°, élévation 20° | 0,939 · 1 · 0,618 | aucun égal |

**Mesuré sur la projection réelle du moteur** (`camera.project`), pas déduit des
angles : `Facade.measureAxes()` existe pour refaire ce contrôle à tout moment.
La mesure n'a de sens qu'en projection orthographique.

L'ordre de composition du quaternion (azimut puis élévation) a été retenu parce
qu'il **passe cette mesure** — l'ordre inverse fait basculer l'horizon.

### Projection : deux icônes, pas un surlignage

Le bouton change de dessin selon le mode courant — tronc de pyramide en
perspective, prisme droit en orthographique. On lit l'état sans avoir à
interpréter un surlignage.

On pilote la liste déroulante d'origine plutôt que `setProjectionType` : son
callback recadre le zoom orthographique, ce que la méthode seule ne fait pas.

### Vérifié dans le navigateur

10 contrôles : les six quaternions de vue atteints après un clic réel,
l'isométrie confirmée par la mesure, la bascule de projection et son icône, le
recadrage.

### Faiblesse assumée de la série provisoire

**Les trois icônes axonométriques se ressemblent trop à 24 px.** C'est le même
cube sous des angles voisins. À retravailler au passage définitif — peut-être
en marquant le rapport des axes plutôt que l'angle de vue.

### Encombrement

La barre fait **511 px de haut pour 29 boutons**. Elle tient sur un portable 13
pouces (environ 700 px utiles), mais il n'y a plus beaucoup de marge : toute
nouvelle rangée devra être pesée.

## Les icônes d'outils — série définitive

Principe validé par Jean-Jacques : **la matière vue en coupe, et le sens de la
déformation**. Ce n'est pas un choix d'humeur, c'est l'invariant du domaine :
tous ces outils sont « un pinceau », montrer l'instrument ne distinguerait rien.
Seul l'effet différencie Gonfler de Dessiner.

Trois éléments, toujours les mêmes :

1. **un invariant** — la ligne de surface, de x=3 à x=21, vers y=17 ;
2. **une variable** — la déformation appliquée à cette ligne ;
3. **un marqueur** — une flèche courte, seulement là où deux effets voisins se
   confondraient.

### Les oppositions systématiques

Elles lèvent les trois ambiguïtés repérées à l'analyse comparative :

| Couple | Ce qui les sépare |
| --- | --- |
| Dessiner / Gonfler | bosse locale + flèche unique ≠ arc entier, avant en pointillé |
| Creuser / Dessiner | creux + flèche vers le bas ≠ bosse + flèche vers le haut |
| Pincer / Redimensionner | flèches rentrantes ≠ flèches sortantes |
| Saisir / Tirer | bosse symétrique + flèche ≠ montée longue, chute brève |

### Ce que trois passages ont appris

**Tout se joue à 24 px, pas sur le dessin agrandi.** Les trois reprises ont
consisté à **enlever**, jamais à ajouter :

- **Gonfler** — trois flèches devenaient des taches. Remplacées par l'écart
  entre l'état d'avant (pointillé) et d'après (plein).
- **Aplatir** — deux flèches et un plan : illisible. Les sommets dessinés
  **plats** disent le rasage à eux seuls.
- **Lisser** — six oscillations se confondaient en grésillement. Trois suffisent.
- **Masquer** — la hachure faisait un pâté. Un cache plein se lit d'un coup.
- **Tirer** — les lignes de vitesse se collaient à la bosse ; la version
  suivante s'était arrondie et redevenait Saisir. C'est finalement la **forme**
  qui porte la différence.

### Deux limites assumées

**Tourner échappe à la grammaire.** La torsion est une rotation *dans le plan*
de la surface : une coupe ne peut pas la montrer. L'icône est donc une ligne de
surface plus une flèche circulaire conventionnelle. C'est une exception, pas un
oubli.

**Les icônes système ne suivent pas cette grammaire** — vues, maillage,
fichiers, annulation ne représentent aucune déformation de matière. Elles
restent des pictogrammes conventionnels. La barre assume donc **deux régimes
visuels**, ce qui aide plutôt : on distingue au premier regard ce qui agit sur
la matière de ce qui agit sur l'affichage.

### Les trois icônes axonométriques restent faibles

Signalé plus haut, toujours vrai : même cube sous des angles voisins,
indistinguable à 24 px. À reprendre en marquant **le rapport des axes** plutôt
que l'angle de vue.

## Le cube d'orientation — pièges accumulés

`src/modelagix/CubeVues.js`. Quatre erreurs successives, toutes venues du même
réflexe : **raisonner sur les conventions au lieu de les mesurer.**

1. **Rotation directe ou conjuguée ?** Les deux essais échouaient, chacun sur un
   axe différent. Abandonné : le repère du cube est maintenant dérivé de la
   projection réelle du moteur (`camera.project` sur les trois axes du monde).
2. **Visibilité des faces.** `computePosition` n'a pas la même convention de
   signe en X que le reste. On lit désormais le **sens d'enroulement** du
   polygone projeté — l'aire signée de Gauss — qui ne dépend d'aucune convention.
3. **Gauche et droite inversées.** Mesuré : la vue que le moteur nomme
   « droite » place la caméra en X négatif. **Il nomme ses vues du point de vue
   du MODÈLE.** MODELAGIX suit celle du spectateur, partout — d'où le signe
   négatif dans `Vues.regarderDepuis` et les azimuts négatifs des axonométries.
4. **Déformation en rectangle.** Le repère issu de la projection perspective
   raccourcit les trois axes différemment. Il est désormais orthonormalisé :
   un repère indique une direction, il ne mesure pas.

**Troncature :** un cube de demi-arête R vu de coin s'étend jusqu'à R·√3. Le
rayon doit être calculé pour ce cas, pas pour la vue de face.

**Axes portés par les arêtes**, partant du sommet (−1,−1,−1), masqués quand les
deux faces qui les bordent sont de dos : le cube n'est pas transparent.

---

## Pièges de synchronisation — trois fois la même leçon

**`mouseup` précède `click`.** Deux fois, des éléments se replaçaient avant que
l'action ait eu lieu. D'où `Tiroir.surChangement()` : on prévient explicitement,
après coup.

**Une animation retarde la mesure.** À la fermeture, la barre occupe encore sa
place pendant 250 ms. Sans un second `_rafraichir()` à la fin de l'animation,
les languettes restaient décalées.

**Un élément fixe peut en recouvrir un autre.** Le cube interceptait les
curseurs de la barre de paramètres : on pouvait cliquer mais pas glisser. En cas
de doute, `document.elementFromPoint()` sur le centre d'un contrôle dit la
vérité en une ligne.

---

## Réglages d'ouverture, décidés avec Jean-Jacques

- **Matériau Perle** — le plus neutre pour lire un volume.
- **Détail dynamique actif** — chaque coup de pinceau affine ce qu'il touche,
  comportement attendu d'une pâte à modeler.
- **Symétrie active.**

Ils sont appliqués en différé d'un temps de rendu : le maillage de départ
n'existe pas encore quand la façade se construit.

---

## À faire ensuite

- [x] Régler l'enregistrement du travail sur GitHub (`gh auth login`).
- [x] Lire `src/` pour repérer les vrais noms des méthodes du moteur.
- [x] Écrire la façade et la vérifier outil par outil.
- [x] Essayer à la main `openFile()` et `exportSTL()` — validés par Jean-Jacques.
- [x] Ouvrir un GLB exporté dans Blender ou une visionneuse glTF — validé.
- [ ] Masquer yagui en CSS (sans le supprimer) et le rendre escamotable par une
      languette au bord droit, plus un raccourci clavier.
- [ ] Construire la nouvelle barre d'outils, **en validant outil par outil**
      dans le navigateur.
- [ ] Dessiner les icônes SVG (sprite unique, grille 24 × 24, trait 2 px,
      `fill="currentColor"`).
- [ ] Ajouter la mention de filiation dans le README et la fenêtre « À propos ».
- [ ] Mise en ligne sur Firebase Hosting.

---

## SculptXR — analyse comparative

`github.com/mestela/sculptxr`, autre fork de SculptGL, orienté WebXR (casques).
Analysé le 27 juillet 2026 sur demande de Jean-Jacques.

### Ce qu'il est

**Licence MIT, copyright Stéphane Ginier** — la même que la nôtre. Reprendre du
code y est donc licite, à condition de conserver les mentions.

Divergence considérable : **219 fichiers, 103 600 lignes** contre environ 120
fichiers chez SculptGL. Ils ont ajouté Three.js, `manifold-3d` (WebAssembly),
Vite, WebAwesome. Leur README annonce que le développement est **entièrement
fait par IA** (« entirely done using Antigravity ») — ce n'est pas
disqualifiant, mais cela invite à vérifier plutôt qu'à faire confiance.

**Ils ont retiré yagui**, le chantier que nous avons justement contourné avec
le tiroir. Leur `HANDOVER_yagui_removal.md` documente la méthode : trois
systèmes d'interface coexistants, migration progressive vers du HTML. Leur
expérience conforte notre choix — le retrait de yagui est un chantier à part
entière, pas un détail.

### Ce qui est réellement récupérable

Constat inattendu : **la plupart de leurs outils reposent encore sur
l'architecture d'origine** (`SculptBase`, `math3d/Geometry`, `misc/Utils`).
Seuls 7 outils sur 37 importent Three.js.

Compatibilité mesurée avec NOTRE moteur, en confrontant chaque appel de méthode
à notre API :

| Outil | Lignes | Appels moteur inconnus chez nous |
| --- | --- | --- |
| Relax (lissage doux) | 14 | 0 — mais **inutile**, voir ci-dessous |
| Weld (souder des sommets) | 200 | 0 |
| SnapWeldCenter | 222 | 0 |
| FillHole (boucher un trou) | 622 | 0 |
| Slide (glisser une arête) | 648 | 1 (`getModelSpaceMatrix`) |
| Inset | 616 | 2, et dépend de Three.js |

### Ce qu'ils font vraiment — vérifié en lisant leur code

**Relax n'apporte rien.** Ses 14 lignes se résument à `class Relax extends
Smooth` avec `_tangent = true`. C'est notre outil Lisser avec sa case
**Tangentiel** déjà cochée. Nous exposons donc déjà la fonction ; le porter
reviendrait à ajouter un bouton pour un réglage existant.

**Weld** soude deux sommets : on clique le premier, puis le second, et ils
fusionnent. Édition de topologie au sommet près.

**SnapWeldCenter** effondre une face entière sur son centre : les sommets de la
face n'en font plus qu'un. Sert à alléger localement un maillage trop dense.

Ces deux-là relèvent de la **retopologie**, pas du modelage. Utiles pour
réparer un maillage à la main, sans rapport avec le geste d'un élève sur de la
pâte à modeler. À garder en réserve, pas en priorité.

**FillHole reste le seul apport décisif** : un maillage importé troué s'imprime
mal, et rien chez nous ne sait le réparer.

Leurs autres apports — voxels, animation, blendshapes, rigging, WebXR —
supposent leur pile complète et sortent du périmètre.

### À ne pas reprendre

Leur chaîne de construction (Vite, Node récent) résoudrait notre dépendance à
Node 18, mais migrer webpack 5.21 vers Vite est un chantier en soi, sans effet
visible pour l'utilisateur. À garder en réserve, pas en priorité.

---

## Outil Transformer

`Enums.Tools.TRANSFORM`, présent dans le moteur depuis toujours et écarté au
départ : il déplace, tourne et redimensionne l'objet ENTIER par une poignée, au
lieu de déformer sa surface — il ne relevait donc pas de la palette de
sculpture au sens du cahier des charges.

Ajouté à la demande de Jean-Jacques. Raccourci `E`, déjà défini par le moteur.
Il n'expose aucun réglage de taille ou de force, ce qui est normal.
