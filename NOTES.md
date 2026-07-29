# NOTES.md — MODELAGIX

Mémoire du projet entre les sessions. Voir `Ressources/CLAUDE.md` pour le
cahier des charges.

---

## Deux noms, et ce qu'ils désignent

**L'application s'appelle SculptIX** depuis le 28 juillet 2026, décision de
Jean-Jacques. C'est ce qui s'affiche : le bandeau en haut à gauche et le titre de
l'onglet du navigateur.

**MODELAGIX reste le nom interne** — le dépôt, le dossier, l'espace de noms
`src/modelagix/`, les préfixes de classes CSS `.modelagix-…`. Rien n'a été
renommé de ce côté, et ce n'est pas un oubli : renommer un espace de noms touche
chaque fichier de la façade pour zéro gain visible. À reprendre le jour où le
README et la fenêtre « À propos » seront écrits, pas avant.

Réserve signalée à Jean-Jacques, qui a maintenu son choix : **SculptIX est très
proche de SculptXR**, l'autre dérivé de SculptGL. Même racine, deux lettres
finales voisines, même famille de projets — risque de confusion pour qui cherche
l'un ou l'autre. Aucun rapport avec les interdictions du cahier des charges.

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

### Aspect repris du projet parallèle (28 juillet 2026)

Jean-Jacques développe en parallèle une application paramétrique, **ShapeShix**,
dont l'interface s'inspire de celle-ci. Trois idées font le chemin inverse et
reviennent ici :

- **Contour affiné.** Le moteur donnait au tiroir de droite un
  `border-left: 3px double rgba(255,255,255,0.3)` — une arête franche, plus
  lourde que tout le reste de l'interface. Remplacé par un filet d'un pixel à
  8 % de blanc. `!important` nécessaire : c'est la seule propriété que la feuille
  du moteur redéclare.
- **Ombre portée vers la gauche**, donc vers la scène :
  `-18px 0 36px rgba(0,0,0,0.34)`. C'est elle qui donne la profondeur, à la
  place du trait. Attention : la bordure de 3 px servait aussi de repère visuel
  de séparation ; sans l'ombre, le filet seul ne suffirait pas.
- **La languette porte l'icône des réglages** (`outil-reglages`, trois curseurs)
  au lieu d'un chevron : le chevron ne disait que « ça s'ouvre », l'icône dit ce
  qu'on y trouve. L'état ouvert se lit au bleu des éléments actifs, comme
  partout ailleurs.

Deux détails à ne pas défaire :

- `Icones.injecter()` est appelé **depuis Tiroir**. Les tiroirs se construisent
  avant la barre d'outils, qui installe d'ordinaire le sprite : sans cet appel,
  la languette renverrait à un symbole inexistant. L'appel est idempotent.
- l'icône est posée **une seule fois**, pas à chaque rafraîchissement — sinon on
  reconstruirait le SVG à chaque ouverture pour rien.

La poignée de redimensionnement du tiroir est un élément à part (`domResize`),
pas la bordure : l'affiner ne rend donc rien plus difficile à attraper.

### La fusion des deux tiroirs — faite et vérifiée

28 juillet 2026. Les menus de la barre du haut deviennent **une quatrième
section d'accordéon**, « Fichiers & réglages », en bas du tiroir de droite après
« Sculpture & peinture ». Il n'y a donc plus qu'une languette.

**Ils ne gardent rien de leur identité de menus déroulants.** Chaque ancien menu
devient un intertitre (`div.group-title`) et ses entrées descendent à la suite —
la forme exacte des trois sections que le tiroir contenait déjà. Plus de survol,
plus de panneau flottant.

Ce qu'il fallait connaître pour que la section soit reconnue par le moteur :
c'est le couple **`<ul opened="true|false">` + `<label>` en tête** qui déclenche
sa mise en forme, chevron ▼ / ► compris. On ne corrige qu'une chose, la hauteur
maximale (`max-height: 700px` d'origine), prévue pour des sections courtes.

Trois pièges, dans l'ordre où ils se sont présentés :

1. **Ne pas masquer la barre du haut par `setVisibility(false)`.** Il masque le
   conteneur, donc aussi les menus qu'on vient d'y prendre. On la laisse
   « visible » à ses yeux et on cache le conteneur vidé par `display: none` : sa
   hauteur mesurée tombe à zéro, plus rien ne décale la vue.
2. **Une première version déplaçait le `ul` tel quel.** Toute la mise en forme
   étant scopée `.gui-topbar`, les neuf sous-menus s'ouvraient à la fois et se
   chevauchaient. C'est ce qui a conduit à les convertir au lieu de les déplacer.
3. **L'ordre de construction compte.** `APropos.installer()` retrouve son menu
   par `TR('about')` dans `.gui-topbar` : il DOIT s'exécuter avant `new Tiroir`.
   C'est le cas dans la façade — vérifié : la fenêtre s'ouvre toujours et aucun
   onglet externe ne s'ouvre au passage.

« À propos & aide » est le seul menu sans sous-menu : son titre EST le bouton. On
déplace donc le `li` entier, avec son écouteur, plutôt que d'en faire un
intertitre vide.

Vérifié : quatre sections dont la nôtre, huit intertitres, plus aucun sous-menu
déroulant, le repli fonctionne dans les deux sens.

### La languette décrochait du tiroir pendant le glissement

Signalé par Jean-Jacques, « surtout à la fermeture ». Deux causes distinctes,
et la seconde explique le « surtout » :

**À la fermeture.** `_positionner()` réglait la languette sur la largeur
**mesurée** de la barre. Or yagui ne masque la sienne qu'à la FIN du glissement
— il faut bien qu'elle reste visible pendant qu'elle glisse. La mesure renvoyait
donc encore 232 px pendant toute l'animation : la languette restait plantée à
droite, puis sautait d'un coup. Corrigé en se réglant sur l'état VOULU
(`this._etat.droite ? largeur : 0`) et non sur la mesure.

**À l'ouverture.** Le panneau attend deux images avant de partir — sans ce délai
le navigateur applique les deux transformations d'un bloc et rien ne s'anime. La
languette, elle, partait tout de suite : deux images d'avance, soit un décalage
visible en début de course. Elle est maintenant **retenue** en position fermée,
transition coupée, et relâchée dans la même image que le panneau.

Deux garde-fous à ne pas retirer :

- le drapeau `_languetteRetenue` neutralise le `_positionner()` du
  `_rafraichir()` qui suit immédiatement — sinon la languette sauterait à sa
  position finale pendant que sa transition est coupée, et n'aurait plus rien à
  animer ;
- un `setTimeout` double le `requestAnimationFrame`. Si les images ne sont pas
  rendues (onglet en arrière-plan, volet d'inspection), la languette resterait
  retenue avec sa transition coupée. `relacher` est idempotent, le premier des
  deux qui arrive fait le travail.

**Vérifié** : retenue à 0 puis relâchée à 232 à l'ouverture ; à la fermeture, la
languette vise 0 immédiatement alors que la barre mesure encore 232.

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

### La hiérarchie des traits — trois niveaux

Jusqu'à la quatrième passe, une icône disait trois choses **du même trait** : la
matière, la référence et le sens du geste avaient le même poids, et l'œil ne
savait pas par où entrer. Trois niveaux, définis une fois pour toutes en tête de
`Icones.js` (constantes `ACTION` et `SENS`, aides `action()` et `fleche()`) :

| Niveau | Ce que c'est | Attributs |
| --- | --- | --- |
| 1 — **l'effet** | la matière et la forme qu'elle prend | aucun ; le CSS pose 2 px, pleine intensité |
| 2 — **l'action** | l'état d'avant, le plan visé, l'empreinte du pinceau | `stroke-width 1.5`, `stroke-opacity 0.6`, pointillé |
| 3 — **le sens** | la flèche ajoutée pour lever une ambiguïté | `stroke-width 1`, `stroke-opacity 0.45` |

**Règle de partage :** si le trait est de la matière → niveau 1 ; si c'est une
référence ou un état révolu → niveau 2 ; si c'est une indication posée
par-dessus → niveau 3.

Deux exceptions à connaître, sinon on « corrigera » à tort :

- **Tourner** — l'arc EST la matière en train de pivoter, pas un commentaire.
  Il reste au niveau 1 bien qu'il ressemble à une flèche ; l'affaiblir viderait
  l'icône de son sujet.
- **Masquer** — le cache est plus épais que le niveau 1 (4,5 px) : ce n'est pas
  un trait mais une masse.

Les familles « vues » et « fichiers » ne relèvent pas de cette grammaire : elles
ne montrent aucune matière déformée et gardent leurs conventions propres (le
pointillé y veut dire « derrière », la barre épaisse « le côté d'où l'on
regarde »).

### Aplatir — quatrième version, et pourquoi

Les trois premières dessinaient la surface **déjà plate** avec un plan de
référence en pointillé. Deux défauts, dont le second est le vrai :

1. rien ne montrait ce qui avait été enlevé ;
2. **le pointillé disait deux choses différentes selon l'icône** — « état
   d'avant » dans Gonfler, « plan de référence » dans Aplatir. Le même code
   visuel pour deux idées : l'œil ne pouvait pas trancher.

Le pointillé a donc partout le même sens, l'état d'avant. Aplatir montre le
relief enlevé (niveau 2) et, en plein, le plateau qui l'a remplacé (niveau 1).

**Aucune flèche, et c'est raisonné.** La position relative des deux états donne
déjà le sens : dans Gonfler le plein est **au-dessus** du pointillé — ça a
monté ; dans Aplatir il est **en dessous** — ça a été rasé. Une flèche centrée a
été essayée : sa pointe venait toucher le sommet du pointillé, exactement le
défaut d'espacement signalé par Jean-Jacques sur les icônes agrandies.

Détail à ne pas défaire : le pointillé du chapeau est en `1.8 1.4` et non en
`2.5 2`. Sur des segments de 6 unités, un pointillé ordinaire ne pose que deux
marques, qu'on lit comme deux accents et non comme une ligne interrompue —
vérifié en comparant quatre valeurs côte à côte à 150 px.

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
- **Aplatir** — quatre versions ; voir la section qui lui est consacrée
  ci-dessus.
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

## Le sol — fait et vérifié

`src/modelagix/Sol.js`. Repris de **ShapeShix** (`src/vue/Sol.js`), où le principe
a été mis au point. Là-bas c'est un matériau three.js ; ici il n'y a pas de
moteur de rendu, donc le programme WebGL est écrit et piloté à la main. Le
nuanceur est le même, à la transposition d'axes près (le moteur travaille en Y
vertical, le sol est donc le plan XZ).

Plus de segments : un plan, et un nuanceur qui décide pour chaque pixel s'il
tombe sur une ligne. La largeur du trait vient de `fwidth()`, donc elle vaut
toujours un pixel à l'écran : une ligne lointaine ne se resserre pas, elle
s'estompe — c'est ce qui supprime le moiré. L'extinction est une formule, pas une
découpe : aucun bord à voir. Le plan suit la caméra, donc le sol est infini en
pratique.

On ne remplace pas l'objet grille du moteur, seulement sa méthode `render` : il
reste ainsi dans `computeBoundingBoxScene` et le recadrage se comporte comme
avant.

### Quatre pièges, tous silencieux

Aucun n'a produit la moindre erreur WebGL. C'est ce qui les rend coûteux.

1. **Le plan lointain.** Le moteur resserre son tronc de vision autour de la
   scène — il était à 210 unités. Un plan de 3 400 unités de côté avait ses
   quatre coins au-delà : la carte éliminait le triangle entier avant de le
   tramer. Le sol avait purement disparu. D'où le **découpage en 16 × 16 cases**
   (`construireQuad`) : seules les cases réellement au-delà sont écartées, les
   autres sont découpées proprement. Le plan peut alors être plus grand que le
   tronc, et l'extinction s'achève bien avant sa limite (`portee = far × 0,72`).
2. **L'ordre de la passe opaque.** Le fond de la vue est peint **après** les
   maillages, dans la même passe, et recouvre tout ce qui n'a pas laissé de
   profondeur. Le sol, dessiné sans écrire la profondeur, était intégralement
   repeint. Il l'écrit donc — sans risque, les pixels hors ligne étant éliminés
   par `discard`, et un fragment éliminé n'écrit rien.
3. **Le mélange contre le noir.** Puisque le fond arrive après, un fragment
   translucide se mélangeait au noir du tampon vidé et non au gris du fond : les
   lignes sortaient presque noires. Le nuanceur fait donc le mélange lui-même
   contre `uFond` et sort une couleur pleine. Conséquence assumée : avec une
   IMAGE de fond, les lignes resteront calées sur le gris uni.
4. **La lumière linéaire.** Le moteur n'encode qu'à la fin (« merge + decode »).
   Les gris moyens ressortaient presque blancs. Les couleurs sont converties une
   fois pour toutes (`versLineaire`, exposant 2,2) plutôt qu'assombries à tâtons.

### Le fond de la vue, et pourquoi il commande tout

Le moteur livrait un gris neutre à 50 (`Background.init`). Le sol est désormais
calé sur **`0x1a1e24`**, la valeur de ShapeShix — un bleu très sombre, posé par
`Sol.poserLeFondDeLaVue` en remplaçant la texture d'un pixel du moteur.

Ce n'est pas un détail d'humeur : **ce qui se voit d'une ligne n'est pas sa
valeur mais son rapport au fond.** Sur un fond deux fois plus sombre, les mêmes
lignes sautent aux yeux. Les opacités du nuanceur (0,009 / 0,010 / 0,022)
n'auraient aucun sens sur l'ancien gris — ne pas les reprendre sans le fond.

La page elle-même porte la même teinte (`html, body` dans Tiroir.js), sinon un
rectangle plus clair clignote pendant que le tiroir glisse.

### Régler les niveaux : en rapports, et sur l'image

Quatre réglages ont été perdus à raisonner en valeurs absolues. La chaîne de
couleur du moteur relève fortement les valeurs sombres — un trait calculé pour
sortir à 52 sur un fond à 50 sortait à 104. Et la moyenne d'une zone dépend
surtout du NOMBRE de pixels allumés, donc elle ne bouge pas quand on divise
l'encre par deux.

Ce qui marche : lire les pixels rendus et raisonner en **rapport au fond**.

```js
m._drawFullScene = true; m.applyRender();
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.readPixels(x0, y0, largeur, hauteur, gl.RGBA, gl.UNSIGNED_BYTE, px);
```

Lire une zone **strictement au sol** — à droite de l'objet, en bas, hors panneau.
Contrôle : `sol._opacite = 0` doit ne laisser que le fond. Niveaux en vigueur,
sur un fond à 30 : **trait fin ×1,4**, **décade ×1,7**, **axe ×2,4**.

### La profondeur forcée ne vaut QU'EN orthographique

Régression introduite en corrigeant l'orthographique, signalée par Jean-Jacques :
le sol passait par-dessus les objets, qui paraissaient transparents.

Cause : la constante de profondeur, écrite pour tous les modes. En perspective,
la matrice du moteur est corrigée pour un plan lointain à l'infini
(`_proj[10] = -1`), ce qui **tasse toutes les profondeurs juste sous 1** : à
quatre-vingts unités, l'objet est à 0,99987. Une constante à 0,999 le plaçait
donc DEVANT lui. Le symptôme changeait avec le zoom parce que la profondeur de
l'objet dépend de la distance.

Le forçage est désormais conditionné par un uniforme, `uForcerLeFond`, mis à 1
en orthographique seulement. En perspective la profondeur calculée est la bonne
et se suffit à elle-même.

### L'angle de vue par défaut, exprimé en objectif

`Facade.setFocale(mm)` convertit une focale en angle vertical sur le format
24 × 36 : `2 · arctan(12 / focale)`. 50 mm donne 27°, 40 mm donne 33°, 35 mm
donne 37°.

Le moteur livrait **45°, soit un 29 mm** — un grand angle qui exagère les
fuyantes et fait paraître un volume plus creusé qu'il n'est. Trompeur quand
c'est justement la forme qu'on juge. Réglé à **40 mm** au démarrage, à la demande
de Jean-Jacques. Le curseur d'origine reste maître : on passe par lui
(`_ctrlCamera._ctrlFov`), jamais par `camera.setFov` directement.

### Le sol en projection orthographique

Signalé par Jean-Jacques : plus aucune grille dès qu'on quitte la perspective.
Deux causes distinctes, dont une seule était un défaut.

**Le défaut : le point de référence était l'ŒIL.** En orthographique, ce moteur
repousse l'œil très loin et resserre sa tranche de vision autour de la scène —
relevé : œil à z = 1000, près 874, loin 1127. Le plan se retrouvait donc centré à
mille unités de là, et chacun de ses points à plus de mille unités de l'œil, donc
au-delà de la portée : tout était éliminé par le fondu.

Corrigé en prenant le **centre visé** (`camera._center`) comme origine du plan ET
du fondu. Il est le même dans les deux projections. L'extinction devient un halo
autour de ce qu'on regarde, ce qui est de toute façon ce qu'on veut d'un sol.

La profondeur est en outre **forcée tout au fond** (`gl_Position.z = w × 0,999`),
sans quoi la tranche de 253 unités de l'orthographique découpait presque tout le
plan. Le sol est ainsi toujours derrière tout — son rôle — et rien ne le découpe.
Ce qu'on perd : il ne peut plus s'entrecouper avec un objet qui le traverserait.
Un plancher n'a pas à le faire.

**Ce qui n'est PAS un défaut : la vue de face orthographique ne montre rien.**
Mesuré : tous les points du sol y ont la même ordonnée à l'écran (−0,373). Un
plan horizontal regardé exactement de niveau, en projection parallèle, se réduit
à une ligne — il n'y a pas de divergence pour l'étaler. En perspective on le voit
malgré tout parce que les lignes s'écartent. Dès que la vue s'incline — dessus,
isométrique, ou n'importe quelle rotation — la grille est là. Vérifié : 0 % de
pixels tracés de face, 3,6 % en vue plongeante.

### L'étendue ne dépend pas du plan lointain

Longtemps calée sur `camera._far`, elle bornait le sol à deux cents unités et
l'extinction paraissait brutale. C'était inutile : dans
`Camera.updateProjection`, après `mat4.perspective`, le moteur réécrit deux
termes —

```js
this._proj[10] = -1.0;
this._proj[14] = -2 * this._near;
```

— c'est le tour classique du **plan lointain à l'infini**. `_far` ne sert qu'à
construire une matrice aussitôt corrigée : rien n'est écarté au loin. La portée
vaut donc **sept fois la scène**, comme dans ShapeShix, et la courbe d'extinction
est la sienne (`smoothstep(0,30·portée, portée)` élevée au cube).

### Ce qu'on lit — calé sur la référence ShapeShix

Comparaison faite sur deux captures posées côte à côte, ce qui a corrigé trois
erreurs de lecture d'un coup :

**La maille : une douzaine de cases sur la scène, pas une trentaine.** On avait
resserré la trame en croyant « affiner ». C'était l'inverse : dans la référence,
la trame fine est presque invisible et ce qu'on VOIT est la décade. Des cases
trois fois plus petites ne rendaient pas la grille plus fine, elles la rendaient
plus dense — et cette densité formait au loin un hachurage permanent.

**La décade est en GRIS, pas teintée.** Une version lui donnait la couleur de son
axe ; comparée à la référence, cette teinte brouillait justement les deux vraies
lignes zéro, qui doivent être les seules colorées. Les axes retrouvent donc leur
couleur pleine, franchement lisibles.

**Trois rapports au fond, et rien d'autre à régler :**

| | rapport au fond |
| --- | --- |
| trame fine | ×1,2 — on la devine, on ne la lit pas |
| décade | ×4 — franchement contrastée, c'est elle qu'on voit |
| axes | ×20 — couleur pleine |

**L'extinction : portée courte et départ précoce.** Trois fois et demie la scène
(et non sept), fondu démarré au sixième de la portée (et non aux deux
cinquièmes), toujours élevé au cube. C'est cette combinaison — et non la seule
courbe — qui fait disparaître la grille bien avant l'horizon et laisse le
lointain vide.

---

## La matière « Analyse » — carte de profondeur

`src/modelagix/MatiereAnalyse.js`. Deux rendus en niveaux de gris où la teinte
dit la DISTANCE et non la lumière : un décrochement de deux millimètres sur une
surface claire, que l'ombrage habituel noie, y saute aux yeux.

- **Profondeur — proche sombre** : noir = ce qui vient vers nous, blanc = le
  fond de l'objet. Fond de vue blanc. Convention des cartes de hauteur.
- **Profondeur — proche clair** : l'inverse, fond noir. Convention des cartes de
  profondeur en photographie et en vision par ordinateur.

Aucune ne s'impose — elles se contredisent d'un métier à l'autre — d'où les deux.

**On n'a modifié aucun fichier du moteur.** `ShaderLib` est un tableau indexé par
`Enums.Shader` : on y AJOUTE deux entrées (13 et 14) et deux constantes. La liste
déroulante des rendus reçoit les options par sa méthode `addOptions`, comme les
tampons calculés passent par `addAlphaOptions`. `onShaderChanged` se contente
ensuite d'appeler `mesh.setShaderType(val)` : le moteur suit sans rien savoir.

Trois points à ne pas défaire :

- **`vNormal` est calculé alors que la profondeur n'en a pas besoin.** La
  fonction de couleur commune du moteur (`fragColorFunction`) le lit pour son
  atténuation et ses courbures. Sans lui : « vNormal : undeclared identifier »,
  dont rien n'indique qu'il vient d'un morceau de code hérité.
- **La plage de gris est calée sur ce qui est RÉELLEMENT VU.** Première version :
  les huit coins de la boîte englobante. Juste au sens de la définition — le
  blanc était bien « l'autre extrémité derrière l'objet » — mais inutilisable :
  d'un objet plein on ne voit que la moitié avant, donc les gris visibles
  n'occupaient que la première moitié de l'échelle et tout se ressemblait.
  Mesuré sur la sphère de départ : la boîte s'étend de 56 à 104 en profondeur,
  mais la surface visible de 56 à 80 seulement.

  On parcourt donc les sommets **tournés vers la caméra** — normale dont la
  composante z est positive dans le repère caméra — et on retient leurs distances
  extrêmes. Un sommet sur N seulement : trois mille échantillons suffisent à
  encadrer une plage, coût mesuré **0,13 ms par image**. Vérifié : centre 0 et
  bord 255 en « proche sombre », l'inverse en « proche clair ».
- **Le fond de vue et le sol sont mémorisés puis rendus.** Le sol s'efface
  pendant l'analyse — ses lignes grises et ses deux axes colorés fausseraient une
  image censée ne contenir que des distances — mais l'utilisateur retrouve
  exactement l'état qu'il avait laissé, y compris s'il l'avait éteint lui-même.

**Une limite connue.** Sur fond blanc, nos panneaux translucides deviennent
difficiles à lire.

**Un effet normal, à ne pas prendre pour un défaut :** le contour de l'objet se
fond dans le fond. Le bord est le point visible le plus lointain, donc le maximum
de l'échelle — et le fond, « infiniment loin », porte la même valeur. C'est le
comportement attendu d'une carte de profondeur.

---

## Les tampons apportés par l'utilisateur — faits et vérifiés

`src/modelagix/TamponsImportes.js`. Une image quelconque devient un tampon : on
n'en garde que la luminance, un octet par pixel, ce qu'attend `Picking.addAlpha`.

**Pourquoi ne pas se contenter de l'import du moteur.** Il existe (`alphaopen`),
mais l'image est perdue au rechargement. Un élève qui prépare ses empreintes en
début de séance les retrouverait vides à la reprise. On les conserve donc dans le
stockage local du navigateur : pas de compte, pas de serveur, rien qui sorte de
la machine.

Quatre décisions à connaître :

- **Réduction à 128 × 128 AVANT stockage.** La limite du stockage local est
  étroite (quelques mégaoctets) ; à cette taille un tampon pèse une dizaine de
  kilooctets. C'est l'image réduite qui est conservée, pas l'originale — le
  résultat est identique une fois ramené à 128 pixels.
- **Luminance perçue, pas moyenne des canaux.** Un rouge vif et un bleu vif
  n'ont pas le même poids pour l'œil, ni pour un relief.
- **La transparence compte comme du noir**, et le fond est noirci avant le
  dessin : une image à fond transparent doit donner un tampon sans effet là où
  elle est transparente, pas un tampon à pleine force.
- **Le champ de fichier est créé puis jeté à chaque import.** Un `input` conservé
  garde son ancienne valeur : réimporter deux fois la même image ne
  déclencherait aucun événement `change`.

### Plusieurs images, un dossier, plusieurs dossiers

Deux entrées, les PREMIÈRES de la grille des tampons — on cherche un tampon là,
c'est donc là qu'on doit pouvoir en apporter. La grille accepte pour cela des
entrées porteuses d'une `action` au lieu d'une clé.

- **« Importer des images… »** : `multiple`, autant de fichiers qu'on veut.
- **« Importer un dossier… »** : `webkitdirectory`. Ce n'est pas une norme, mais
  c'est le seul moyen d'ouvrir un dossier et les trois navigateurs de bureau le
  comprennent. Il descend dans les SOUS-DOSSIERS : choisir un dossier parent qui
  en contient plusieurs importe donc tous les thèmes d'un coup.

**Le thème vient du dossier, pas d'une saisie.** Le navigateur donne le chemin
relatif de chaque fichier (`webkitRelativePath`) ; on retient le dossier
IMMÉDIAT, et non le premier — c'est ce qui donne un thème par sous-dossier au
lieu d'un seul pour tout l'import. L'utilisateur a déjà rangé ses images, on se
contente de lire son rangement. La grille se regroupe ensuite d'elle-même : les
tampons livrés d'abord, sans titre, puis un bloc par thème.

**Les images sont traitées UNE À LA FOIS.** Le décodage est asynchrone ; les
lancer toutes ensemble ferait tenir en mémoire autant d'images décodées que de
fichiers — un dossier de deux cents photographies en pleine résolution suffirait
à faire tomber l'onglet.

**Quand la mémoire est pleine**, on s'arrête d'écrire et on DIT combien ont été
conservés. Les tampons déjà ajoutés restent utilisables pour la séance en cours :
c'est la seule chose qu'on puisse promettre, et il vaut mieux la dire que de
laisser croire que tout est gardé.

Vérifié : trois images réparties en deux dossiers thématiques, importées d'un
coup, regroupées sous « Geometrique » et « Organique », toujours rangées ainsi
après rechargement complet.

**Limite assumée :** `forgetAlpha` retire le tampon de la mémoire, mais le moteur
n'a pas de quoi retirer un alpha de sa collection en cours de session. Le tampon
reste donc utilisable jusqu'au prochain rechargement.

Vérifié : import d'un damier, 15 → 16 tampons, vignette produite, présent et
sélectionnable après rechargement complet de la page.

---

## Combiner des volumes — fait et vérifié

`src/modelagix/Booleens.js`. Addition, soustraction, intersection, et la
suppression d'un volume. Quatre icônes dans le groupe « affichage et maillage » :
elles y sont parce qu'elles refont le MAILLAGE, et ne relèvent pas de la sculpture.

**On passe par le volume, pas par les triangles.** Chaque objet devient un champ
de distance signée — négatif dedans, positif dehors — et les champs se combinent
par des minimums et des maximums :

    addition      min(a, b)
    intersection  max(a, b)
    soustraction  max(a, −b)

Le prix : le résultat est remaillé de bout en bout, la densité choisie ailleurs
est perdue. C'est le compromis habituel de cette famille d'opérations.

**Ce qui a été ajouté au moteur, et rien d'autre.** `Remesh.js` publie désormais
ses étapes internes (`preparerMaillages`, `creerVoxels`, `voxeliser`,
`remplirDepuisLExterieur`, `creerMaillage`, `recalerSurLaBoite`) — de simples
affectations en fin de fichier, aucune ligne existante modifiée. `Remesh.remesh`
ne pouvait pas servir : il voxelise TOUS les maillages dans un champ unique, ce
qui donne toujours l'addition.

### Trois pièges, tous silencieux

1. **Le tampon de travail est PARTAGÉ** (`Utils.getMemory`). Deux champs ne
   peuvent pas coexister : on recopie chaque champ juste après l'avoir calculé.
2. **Il faut recopier les TROIS tableaux**, pas seulement les distances. N'avoir
   copié que le champ de distance laissait couleurs et matières écrasées par le
   volume suivant : la moitié du résultat sortait noire, et rien n'indiquait que
   la cause était ailleurs que dans la géométrie.
3. **L'aspect doit suivre le volume qui l'emporte.** Chaque champ ne porte
   couleur et matière QUE là où sa propre surface est passée ; ailleurs il vaut
   −1, qui se rend en noir. On reprend donc l'aspect de celui dont la distance a
   gagné, case par case.

Quatrième piège, celui-là visible : **ne pas envelopper le résultat dans un
`Multimesh`.** Le moteur ne le fait pas après son propre remaillage ; en ajouter
un laissait la moitié du résultat noire.

### Le raccord en fondu

Deux opérations de plus : **Fusionner en fondu** et **Creuser en fondu**.

L'addition ordinaire prend le minimum des deux distances ; là où les volumes se
rencontrent, la surface fait un angle vif. C'est juste, et c'est laid — deux
formes qui se pénètrent ne se raccordent pas ainsi dans la matière, où la pâte
forme un congé. Le **minimum adouci** arrondit cette rencontre :

    h = max(k − |a − b|, 0) / k
    min(a, b) − k · h² / 4

Ce qui rend cette formule sûre : loin de la jonction, `|a − b|` dépasse `k`, `h`
vaut zéro et l'on retrouve exactement le minimum. **Le fondu ne déforme QUE le
voisinage de la rencontre**, jamais le reste de la forme.

Le creux en est le pendant : `max(a, −b)` adouci de la même façon, ce qui donne
une empreinte aux bords arrondis au lieu d'une arête coupante. `maxAdouci` est
écrit comme `−minAdouci(−a, −b)` : une seule formule à vérifier.

**La largeur du raccord est une PROPORTION**, pas une longueur — 6 % de la
diagonale des volumes combinés (`Booleens.FONDU`). Une valeur absolue n'aurait
pas de sens : le même nombre ferait un congé imperceptible sur une grande pièce
et fondrait entièrement une petite. C'est le seul nombre à toucher si le fondu
paraît trop mou ou trop sec.

### Ce qui est vérifié, et une limite

Sphère + cube décalé de 45 : addition 59 670 faces, soustraction 31 926 faces,
toutes deux en 0,6 s environ. Intersection avec un chevauchement de 45 :
**aucune surface produite** — la lentille commune était plus mince que le pas de
voxelisation. Avec un chevauchement de 30 : 19 626 faces, correct.

Ce n'est pas un défaut mais une limite de la méthode. Le code renvoie `false` et
l'interface le dit, plutôt que de laisser croire à un bouton cassé.

---

## Le cube — étiquettes en décalque et pastilles d'axes

Repris de **ShapeShix**, dont le code est lisible dans
`Documents/DOSSIER CLAUDE/Applications IX Business/SHEPSHIX/shapeshix`
(`src/vue/CubeOrientation.js`). Jean-Jacques a donné l'autorisation d'aller le
lire le 28 juillet 2026 — c'est lui qui l'écrit avec moi dans une autre session.

Là-bas le cube est un vrai objet three.js : les noms de faces sont des
**textures**, donc ils subissent naturellement le raccourci de la perspective, et
les lettres d'axes sont des **sprites** — des pastilles qui restent droites quoi
qu'il arrive. Impossible de reprendre le mécanisme tel quel (notre cube est en
SVG, et importer three.js pour un repère décoratif serait hors de proportion).
On reprend donc le RÉSULTAT :

**Les étiquettes sont devenues des décalques.** L'ancienne version se contentait
de faire TOURNER le texte le long de l'arête basse : sur une face vue de trois
quarts, le nom restait plat et flottait au-dessus au lieu d'y adhérer. Comme il
gardait sa taille, il fallait le masquer dès que la face se refermait — les faces
latérales perdaient donc leur nom au moment où l'on en avait besoin.

On applique maintenant la **base projetée de la face** : `u` le long de l'arête
basse, `v` le long du montant, le tout dans une `matrix(...)`. Le texte subit
exactement le même raccourci que la face. Les trois faces visibles portent leur
nom en permanence ; le seuil de masquage est tombé de 35 % à 8 % d'aire, ce qui
n'écarte plus que les faces vues par la tranche.

Deux pièges payés :

- **le second vecteur doit être inversé** (`-v`) : `v` monte le long de la face,
  l'axe des y d'un SVG descend. Sans ce signe, tous les noms sont retournés ;
- **la base est ramenée à l'échelle 1** (divisée par `RAYON`) et la police reste
  en pixels. La version « police en unités de face » a été essayée et abandonnée :
  une feuille de style du moteur impose une taille aux éléments `text`, et **une
  règle CSS l'emporte sur un attribut de présentation**. La police sortait à
  13 px multipliés par 30 — une seule lettre plus grande que le cube entier.

**Les lettres d'axes sont des pastilles.** Une lettre de la couleur de son axe se
confondait avec le trait qui la portait. Un disque plein, lettre en creux sombre,
se détache de n'importe quelle face et reste droit quand tout tourne.

### Piège de mesure, coûteux cette fois

Le volet d'inspection a rapporté `window.innerWidth = 0` pendant plusieurs
minutes après l'ouverture de l'aperçu. Le canevas sortait donc à 0 × 0,
`camera.project` ne rendait que des `NaN`, et le cube ne dessinait **aucune
face** — ce que j'ai d'abord pris pour une régression de mon propre code. À
vérifier AVANT de conclure quoi que ce soit sur le cube :

```js
window.innerWidth + 'x' + window.innerHeight   // doit être non nul
main.getCanvasWidth()                          // idem
```

S'ils sont à zéro, redimensionner la fenêtre **puis recharger** — l'application
lit la taille au démarrage. Et comme la boucle de redessin du cube passe par
`requestAnimationFrame`, gelé lui aussi, il faut appeler `_dessiner()` à la main
après chaque changement de vue.

---

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
- **Résolution d'affichage 2** — le réglage vit dans le tiroir du haut, menu
  « Extra UI », sur un curseur **sans étiquette**. On le reconnaît donc à ses
  bornes, uniques dans toute l'interface : `min = 0.5`, `max = 2`. Écrire
  `_pixelRatio` seul ne suffirait pas — c'est encore le piège des deux vérités.

Ils sont appliqués en différé d'un temps de rendu : le maillage de départ
n'existe pas encore quand la façade se construit.

---

## Les tampons calculés — faits et vérifiés

Le moteur n'en livre que deux. `src/modelagix/TamponsAlpha.js` en ajoute douze
(Cercle doux et net, Carré doux et net, Hexagone, Triangle, Étoile, Rayures,
Damier, Grain, Écailles, Craquelures), en 128 × 128.

**Tous sont calculés par une formule**, aucun n'est une image reprise ailleurs :
pas de question de droits, et le dépôt ne grossit pas. Le moteur ne retient
d'un tampon que sa luminance, un octet par pixel — on lui passe donc directement
le `Uint8Array`, via `Picking.addAlpha(u8, 128, 128, nom)`.

Deux gestes sont nécessaires, et le second s'oublie facilement :
`Picking.addAlpha` fait exister le tampon, mais `gui.addAlphaOptions({nom: nom})`
seul le fait **apparaître dans la liste** du tiroir. Sans lui, les tampons
existent sans être proposés.

Le « Grain » n'utilise pas `Math.random()` mais deux sinusoïdes à haute
fréquence : le tampon doit être identique d'une session à l'autre.

---

## Deux détails d'affichage qui trompent l'œil

**Le fond blanc pendant l'animation des tiroirs.** La page est blanche par
défaut et le moteur efface son canevas en transparent : pendant que le tiroir
glisse, la zone libérée montrait le blanc de la page, pas le gris de la vue.
Corrigé par `html, body { background: #303030 }` dans le CSS injecté par
`Tiroir.js`. Rien à voir avec le canevas lui-même — chercher de ce côté ferait
perdre du temps.

**Le compteur Sommets / Faces** est à nous (`.modelagix-compteur`, en `fixed`),
pas celui de yagui : celui d'origine disparaît avec le tiroir. Le nôtre reste et
se décale simplement de la largeur du tiroir droit quand il s'ouvre.
`Facade.getMeshInfo()` fait la somme sur **tous** les maillages, pas seulement
celui qui est sélectionné.

**Celui d'origine est masqué** depuis le 28 juillet 2026 : tiroir ouvert, les
deux donnaient la même information deux fois, à deux tailles et à deux endroits.
Il n'a ni classe ni identifiant — c'est le seul `<span>` enfant direct de
`.gui-topbar` (`<span><ul>Vertex : …</ul><ul>Faces : …</ul></span>`), et c'est
par là qu'on le désigne. Le nôtre a repris sa taille, **13 px**, relevée dans la
page et non devinée.

---

## Le nom en haut à gauche — fait et vérifié

`src/modelagix/NomApplication.js`, posé par la façade **avant** les tiroirs.
Bandeau fixe, gras, `z-index: 30` — au-dessus des menus du tiroir ouvert (20) et
de nos propres éléments (10). `pointer-events: none`, sans quoi il rendrait
inertes les menus qu'il recouvre.

**Il ne se contente pas de se placer : il publie la place qu'il prend.** Le nom
mesure sa propre largeur une fois dans la page — la police dépend du système, et
un nom plus long viendrait un jour buter contre la languette — et l'écrit dans la
variable CSS `--modelagix-nom-reserve`. `Tiroir.js` s'en sert deux fois :

- `left` de la languette du haut ;
- décalage du premier menu de yagui, en `calc(var(…) + 116px)`.

Un seul chiffre, calculé à un seul endroit : les trois ne peuvent pas diverger.
Valeur de repli 22 px, l'ancienne position, si le nom n'a pas été posé.

Vérifié tiroir ouvert : nom en 22…95, languette en 111…159, premier menu à 165.
Aucun recouvrement. La languette du haut est passée de 120 à **48 px** — les
deux languettes n'ont pas le même rôle : celle de droite est seule sur son bord,
celle du haut partage l'angle avec le nom.

**La marque est en deux teintes** depuis le 28 juillet 2026, sur un principe
apporté par Jean-Jacques : `Sculpt` dans le blanc de l'interface, `IX` dans le
bleu. Ce bleu (`#6ea8fe`) n'est pas inventé pour l'occasion — c'est déjà celui
des outils sélectionnés et des contours de focus ; une marque qui reprend la
couleur d'accent du produit se lit comme en faisant partie.

Trois précautions :

- `NOM` reste la chaîne entière. C'est elle que lisent la fenêtre « À propos » et
  le `aria-label` du bouton — sans quoi une synthèse vocale annoncerait deux
  fragments au lieu du nom.
- `NomApplication.baliser()` rend le balisage des deux teintes, et **c'est la
  seule source**. La fenêtre « À propos » l'appelle pour son titre : une marque
  qui s'écrirait de deux façons selon l'endroit passerait pour un oubli.
- la mention de filiation garde le nom en toutes lettres, sans couleur : c'est
  une phrase, pas un logo.

Le survol n'éclaircit que ce qui hérite, donc le bleu ne bouge pas — voulu.

**`font: inherit` sur `.modelagix-nom-fin` n'est pas une précaution de confort :
sans lui, le `<span>` sort en Open Sans 400 à 13 px** au lieu du system-ui 700 à
19 px du bouton. La feuille du moteur contient une règle qui vise les `span`, et
**un style hérité perd toujours contre une règle qui vise l'élément**, si générale
soit-elle. « IX » paraissait donc plus petit et plus maigre que « Sculpt » —
signalé par Jean-Jacques, corrigé le 28 juillet 2026. Ne pas retirer cette ligne
en la croyant redondante.

Le nom prend **exactement la hauteur d'une rangée de menus** et y centre son
texte : il se retrouve donc sur la même ligne d'yeux que « Fichiers », « Scène »…
quand le tiroir est ouvert. La rangée est mesurée, pas figée à 40 px — la mesure
a lieu pendant que la barre est encore visible, la fermeture initiale des
tiroirs venant après. Vérifié : centre du nom et centre de la rangée à 20 px
tous les deux, écart nul.

**Piège de mesure, déjà connu mais qui a resservi.** Dans le volet
d'inspection, l'animation d'ouverture reste figée à mi-course : la barre du haut
affichait `translateY(-19,48px)` et ses menus paraissaient coupés. Ce n'est pas
un défaut de l'application. Pour mesurer, forcer l'état final :
`tb.style.transition = 'none'; tb.style.transform = 'none';`

---

## « À propos & aide » — faite et vérifiée

`src/modelagix/APropos.js`. Le menu du tiroir du haut n'ouvrait aucune fenêtre :
il envoyait sur le site de Stéphane Ginier dans un nouvel onglet
(`Gui.addAboutButton`). L'auteur du moteur était crédité, mais rien ne disait ce
qu'est l'application ni comment s'en servir.

**Comment on reprend ce menu sans toucher au moteur.** Son écouteur est posé en
ligne à la construction, sans qu'on en garde de référence :
`removeEventListener` est impossible. On REMPLACE l'élément par une copie de
lui-même — `cloneNode` ne recopie pas les écouteurs — puis on pose le nôtre. Le
menu est retrouvé par `TR('about')`, donc la reconnaissance suit la langue.

Contenu : le nom, la formulation publique du cahier des charges, les gestes à la
souris, les raccourcis clavier, la mention de filiation avec le lien vers le site
de l'auteur. Trois sorties : la croix, le fond autour, `Échap`.

**Les numéros d'outils reviennent ici, et seulement ici.** Ils avaient été
retirés des infobulles parce que « Aplatir (5) » ne renseignait sur rien. Dans un
tableau qui donne la légende, ils redeviennent utiles. Rangés par touche
croissante, pas dans l'ordre de la barre : on arrive avec une touche en tête.

Tout le contenu est **relevé dans le code du moteur**, pas supposé :
`SculptGL.onMouseDown` pour la souris, `getOptionsURL.readShortcuts` pour la
table des touches, `GuiStates.onKeyDown` pour Ctrl+Z / Ctrl+Y. Deux choses
écartées faute de vérification suffisante : `Espace` (recadrage) et les touches
F / T / L de vues — le moteur nomme les vues du point de vue du MODÈLE, piège
déjà payé sur le cube d'orientation.

Vérifié dans le navigateur : ouverture depuis le menu, aucun onglet externe
ouvert au passage, fermeture par la croix, par le fond, par `Échap`, clic
à l'intérieur sans effet, et réouverture ensuite. 7 contrôles sur 7.

**Contradiction du cahier des charges, tranchée par Jean-Jacques le 28 juillet
2026.** La section 3 exigeait la mention de filiation « dans ces termes » — texte
qui nomme un logiciel — tout en interdisant que ce nom figure dans ce qui est
visible du public. Décision : **le nom du logiciel disparaît, celui de l'éditeur
reste.** La clause garde son sens (Maxon édite aussi ZBrush, c'est l'éditeur
qu'il s'agit d'écarter) et la règle de vocabulaire est tenue à la lettre. Texte
en vigueur :

> SculptIX est fondé sur SculptGL de Stéphane Ginier, sous licence MIT.
> Ce projet n'est ni affilié ni lié à Maxon.

Ne pas « rétablir » le texte de la section 3 en croyant corriger un oubli.

**Le nom ouvre la fenêtre.** Le menu du tiroir reste, mais il est hors de vue
tant que le tiroir est fermé — c'est-à-dire presque toujours. `NomApplication`
est donc un vrai `<button>` : clavier, focus et annonce aux lecteurs d'écran
viennent gratuitement. Il ne connaît pas la fenêtre qu'il ouvre (`auClic()` est
branché depuis la façade), sinon les deux fichiers s'importeraient l'un l'autre.

**La languette du haut ne descend plus.** Elle reste collée au bord, à côté du
nom ; seul le chevron change (`⌄` fermé, `⌃` ouvert). Ouvrir et fermer se font
donc au même endroit, ce qui vaut mieux qu'une cible qui se dérobe. Il a fallu la
passer en `z-index: 30` : sans cela elle serait recouverte par les menus (20) dès
l'ouverture. `_positionner()` ne s'occupe plus que de celle de droite.

---

## Déplacer la vue — fait et vérifié

`src/modelagix/DeplacementVue.js`. Le moteur savait déjà faire glisser la caméra,
mais **au bouton du milieu seulement** — inexistant sur le trackpad d'un
portable comme sur une tablette. En classe, la fonction n'existait donc pas.
C'est désormais un mode : bouton « Déplacer la vue », juste après « Recadrer ».

**Pourquoi on intercepte au lieu d'écrire l'action du moteur.** `onMouseDown`
choisit l'action d'après le bouton et les touches. Lui réécrire `_action` après
coup ne suffirait pas : il aurait déjà appelé `sculptManager.start()`, donc
empilé un état d'annulation, masqué le curseur et engagé une sculpture. On capte
donc le `mousedown` **en phase de capture** et on l'arrête net ; le moteur ne
voit rien et nous faisons la translation nous-mêmes. Même parti que pour nos
curseurs. Vérifié dans les deux sens : mode inactif → le moteur voit le clic ;
mode actif → il ne le voit pas, la caméra glisse, le nombre de faces est intact.

**L'échelle vient du moteur**, pas d'un réglage inventé :
`camera.translate(dx × getSpeedFactor(), dy × getSpeedFactor())` avec les deltas
en pixels multipliés par la résolution d'affichage — le calcul exact de
`SculptGL.onDeviceMove`. Un déplacement doit avoir la même ampleur qu'il vienne
d'ici ou du bouton du milieu.

**Le curseur d'origine est mis de côté et rendu tel quel** en quittant le mode.
Le vider effacerait un réglage posé par le moteur (la pipette, la brosse) jusqu'au
prochain mouvement de souris.

**Ce que le mode suspend, et comment on le montre.** Le clic gauche faisant
glisser la vue, aucun outil de sculpture ne peut agir. Deux zones s'atténuent à
0,34 : le groupe des outils de sculpture (`.modelagix-groupe-sculpture`) et le
contenu de la barre de paramètres. Les vues, l'affichage, les fichiers et le
panneau « Matière » restent à pleine intensité — ils marchent toujours.

Deux détails à ne pas défaire :

- **on atténue les enfants, pas les panneaux.** Le fond flouté est porté par un
  `::before` : baisser l'opacité du panneau ferait pâlir le fond lui-même. Ce
  n'est pas le panneau qui est suspendu, ce sont les outils.
- **atténués, mais pas inertes.** Cliquer un outil de sculpture quitte le mode
  ET sélectionne l'outil, d'un seul geste. Des boutons grisés et morts
  obligeraient à retrouver la main d'abord, pour rien.

`Facade.panView(dx, dy)` déplace d'un cran sans souris. Rien ne l'appelle :
elle existe pour que quatre boutons fléchés ne demandent que leur propre dessin,
si le mode au glissé ne suffit pas à l'usage.

**L'icône : trois dessins comparés à 110, 46 et 24 px.** Des coins de cadrage
autour d'une croix fléchée se rejoignaient en losange plein dès 46 px. Une croix
fléchée seule était nette, mais racontait la même chose que « Transformer » —
deux gestes opposés (l'objet bouge / le regard bouge) sous le même signe. Retenue :
**la main**, seul pictogramme du jeu à en être une, et forme que prend justement
le curseur dès que le mode est actif.

**Puis quatre repères cardinaux sont venus autour d'elle**, à la demande de
Jean-Jacques, au **niveau 3** : ils ne racontent plus le geste — la main s'en
charge — ils disent seulement dans quelles directions il porte. Ainsi posés, ils
ne se confondent plus avec les flèches de « Transformer », qui encadrent un
rectangle plein.

**Ce sont des pointes seules, sans hampe, et c'est structurel.** Une flèche
complète mange 4 unités de chaque bord, une pointe 1,6. Les 5 unités rendues à la
main lui ont fait gagner près de 40 % de taille (échelle passée de 0,62 à 0,85).
Ne pas « compléter » ces chevrons en croyant réparer un oubli : la main
rapetisserait d'autant, et c'est justement ce que Jean-Jacques avait signalé.

**Ce que cela a coûté, et qu'il ne faut pas défaire.** Pour leur laisser la
place, la main devait rétrécir — or **la version au trait ne supporte pas la
réduction**. Ses doigts sont écartés de 3 unités et le trait en fait 2 : au-delà
de 30 % de réduction, l'intervalle se referme et les doigts se soudent en un
moignon. Constaté à l'écran, pas déduit. Compenser l'épaisseur du trait ne change
rien — c'est l'écart qui rétrécit avec le dessin, pas le trait.

La main a donc été **redessinée en silhouette pleine** : aucun intervalle
intérieur à boucher, donc lisible à n'importe quelle taille. C'est la seule du
jeu dans ce cas, avec le cache de « Masquer », qui est lui aussi une masse et non
une ligne. Vérifié à 120, 46 et 24 px avant d'être retenue.

---

## Trois questions de Jean-Jacques — réponses relevées dans le code

Enquête du 28 juillet 2026. Rien ici n'est supposé : chaque affirmation renvoie
au fichier où elle se vérifie.

### 1. Tessellation adaptative avec décimation simultanée : elle existe déjà

`SculptBase.js`, dans la boucle de chaque coup de pinceau :

```js
if (subFactor) iFaces = mesh.subdivide(iFaces, center, radius2, d2Max, …);
if (decFactor) iFaces = mesh.decimate(iFaces, center, radius2, d2Min, …);
```

Les deux passes s'enchaînent **dans le même geste**, toutes deux bornées au rayon
du pinceau (`radius2`). C'est bien de la tessellation adaptative locale avec
décimation simultanée. Le code est dans `src/mesh/dynamic/Subdivision.js` et
`Decimation.js`.

**Mais la décimation est à zéro par défaut** — `MeshDynamic.DECIMATION_FACTOR = 0`,
vérifié dans le navigateur. Le réglage existe dans le tiroir de droite
(« Décimation », à côté de « Subdivision » à 75). Tant qu'il est à 0, le maillage
ne fait que s'enrichir : il ne se simplifie jamais là où le relief disparaît.
C'est pour cela qu'un long modelage fait gonfler le nombre de faces sans retour.

Il n'y a donc rien à écrire : il y a un réglage à exposer, et une valeur de
départ à décider.

**Fait le 28 juillet 2026, avec l'accord de Jean-Jacques.** `Facade.setDecimation`
/ `getDecimation` pilotent le curseur d'origine (`_ctrlTopology._ctrlDynDec`),
jamais `MeshDynamic.DECIMATION_FACTOR` — sinon le curseur du tiroir garderait son
ancienne valeur et la réécrirait au premier réglage. Valeur de départ **50**,
posée dans `_reglagesInitiaux`.

Pourquoi 50 et non 100 : le seuil de simplification vaut `d2Max / 4,2025 × dec`.
À 100, une arête est effondrée dès qu'elle descend sous la moitié du seuil
d'affinage — un large pinceau passé sur un détail fin l'efface du maillage même
sans le déformer. À 50, le seuil tombe à un tiers : la matière se simplifie
quand même, mais le travail fin survit au passage d'une grosse brosse.

**Valeur définitive : 20**, arrêtée par Jean-Jacques après essai à la main
(28 juillet 2026). À 50 la simplification mordait encore sur le travail fin.

**Vérification, et sa limite.** Rejoué le calcul exact de
`SculptBase.dynamicTopology` puis appelé `mesh.decimate` : 196 608 faces
ramenées à 144 avec un facteur à 100 sur l'objet entier. La décimation est donc
bien vivante et pilotée par le facteur. En revanche **le trait complet n'a pas pu
être joué depuis le volet d'inspection** : `mousemove` passe par
`Utils.throttle(…, 16.66)`, et `setTimeout` y est étranglé — les événements de
souris synthétiques n'arrivent pas jusqu'au moteur. La bonne valeur se juge à
l'usage, pas au banc.

### 2. Bibliothèque de formes : quatre formes, et le mécanisme pour en ajouter

`Scene.js` expose `addSphere`, `addCube`, `addCylinder`, `addTorus`. La sphère
n'est pas une sphère : c'est un cube subdivisé (`subdivideClamp`) jusqu'à passer
50 000 faces. `Primitives.js` sait aussi faire un plan, une grille et une flèche,
mais ces trois-là servent au décor et aux poignées, pas au modelage.

Ajouter une forme = écrire une fonction qui rend sommets et faces, puis un
`addX()` sur le même modèle. Pas de dépendance nouvelle, pas de fichier externe,
donc **pas de question de droits** — comme pour les tampons.

### 3. Fusion et soustraction : la moitié du chemin est faite

Deux fonctions existent, et **elles ne font pas la même chose** — les confondre
ferait perdre du temps :

- **« Fusionner sélection »** (menu Scène) → `Remesh.mergeArrays`. C'est une
  simple concaténation : les sommets et les faces sont mis bout à bout dans un
  seul objet. Deux sphères qui se chevauchent restent deux coques
  interpénétrées. Ce n'est **pas** une fusion de volumes.
- **« Remaillage volumétrique »** (tiroir de droite) → `Remesh.remesh`. Là, les
  maillages sont **voxelisés dans un même champ de distance**, puis une surface
  est extraite (Surface Nets ou Marching Cubes). Deux sphères qui se chevauchent
  en ressortent comme une seule peau continue. **C'est l'union booléenne**, et
  c'est le geste de fusion cherché.

  Son prix : le remaillage est uniforme sur tout l'objet. Le détail fin obtenu au
  pinceau est réparti autrement, et la densité choisie ailleurs est perdue.

- **La soustraction n'existe pas.** Mais la machinerie qui la rendrait possible
  est là : `voxelize()` construit un champ de distance signé, `floodFill()`
  décide du dedans et du dehors, `MarchingCubes` / `SurfaceNets` extraient la
  surface. Aujourd'hui tous les maillages sont voxelisés dans **un seul** champ,
  ce qui donne l'union. Soustraire demande de voxeliser séparément puis de
  combiner (`d = max(dA, −dB)`) avant l'extraction. Travail réel, mais borné, et
  sans bibliothèque extérieure.

---

## La rangée du haut — faite et vérifiée

Quatre demandes de Jean-Jacques, traitées ensemble parce qu'elles décrivent une
seule réorganisation :

1. un titre au-dessus de chaque groupe d'icônes de la colonne de gauche ;
2. le groupe « Vues et cadrage » remonté dans le bandeau du haut, après les
   sélecteurs de matière et de tampon ;
3. le cube d'orientation juste après lui ;
4. les groupes d'outils remontés d'autant, et la sphère de départ décalée vers
   le bas pour ne plus passer derrière ces panneaux.

### Un conteneur en flux plutôt que trois positions calculées

Le panneau de réglages, le sélecteur de matières et le cube se plaçaient chacun
à la main, en `position: fixed`, avec un recalcul à chaque changement de fenêtre
ou de tiroir. Ils sont désormais les enfants d'un même `div.modelagix-rangee-haut`
en `display: flex` : leur ordre à l'écran est leur ordre dans le document, et la
seule chose que le code ajuste encore est le bord droit de la rangée, qui recule
quand le tiroir s'ouvre.

`BarreParametres.rangeeHaut()` donne accès au conteneur ; `BarreOutils.groupeVues()`
et `CubeVues.cadre()` donnent accès aux deux blocs à déménager. La façade fait le
rapprochement en trois lignes.

### `flex-wrap: wrap` était un piège

Avec le retour à la ligne autorisé, l'ouverture du tiroir faisait retomber le
cube **au milieu de la vue**, par-dessus l'objet. Une rangée ne doit pas se
couper en deux : `flex-wrap: nowrap`, et c'est le panneau de réglages qui absorbe
la différence (`flex: 0 1 auto`, `min-width: 400px`). Le groupe des vues est
passé de six icônes de front à deux rangs de trois — 280 px repris à 150.

### Le compteur descend dans l'angle bas-droit

Il occupait l'angle haut-droit, où passe maintenant la rangée : le cube et lui se
disputaient les mêmes pixels. L'angle bas-droit était vide.

### Deux pièges de démarrage, tous deux silencieux

**Le non-nombre.** Décaler la vue vers le bas se fait avec `panView`, dont le pas
est divisé par la hauteur de la zone de dessin. Au premier instant cette hauteur
vaut zéro : « zéro fois l'infini » donne un non-nombre, qui contamine la position
de la caméra. Écran noir, aucune erreur signalée. On vérifie donc la hauteur
avant de déplacer, et on réessaie à l'image suivante.

**L'animation annulée.** Le moteur amène la caméra sur l'objet par un mouvement
animé de 200 ms (`setAndFocusOnPivot` → `moveToDelay` → `translateDelay`). Or
**tout** déplacement de caméra passe par la même file, sous la même clé
`'translate'` : un nouveau mouvement ANNULE celui en cours. Panoramiquer trop tôt
figeait donc la caméra à sa position de départ — à l'intérieur de la sphère, d'où
un écran laiteux, là encore sans erreur ni indice. On attend 260 ms.

À retenir : **au démarrage, ne jamais toucher à la caméra avant que le moteur ait
fini de la placer.** Deux pannes de suite, toutes deux muettes, toutes deux dues
au même excès de hâte.

---

## La disposition adaptative — faite et vérifiée

Quatre demandes de Jean-Jacques, qui décrivent une seule mécanique :

1. le groupe des vues et le cube plaqués contre le bord droit, suivant le
   tiroir ;
2. sur un écran plus étroit, « Matière » et « Tampon » passent SOUS le panneau
   de taille et de force ;
3. plus étroit encore, le groupe des vues descend en bas de la colonne de
   gauche, sous « Scène & fichiers », et le cube sous lui ;
4. le nom de l'application centré sur la colonne d'outils et sur les panneaux
   du haut — ce qui décale la colonne vers le bas.

`Disposition.js` regroupe tout cela. **Un seul endroit décide où va chaque
panneau.** Avant, chacun se plaçait lui-même : la colonne se réglait sur le
cube, le cube sur la barre du haut, le nom sur rien. Trois calculs qui se
couraient après.

### Deux piles plutôt que quatre panneaux

La rangée du haut contient désormais deux `div.modelagix-pile` :

- **pile des réglages** : taille et force, puis matières et tampons ;
- **pile du point de vue** : vues et cadrage, puis le cube.

`margin-left: auto` sur la seconde mange tout l'espace libre : elle se retrouve
plaquée à droite, et le bord droit de la rangée recule déjà quand le tiroir
s'ouvre. Vues et cube suivent le tiroir **sans un seul calcul**.

En mode étroit, c'est la PILE ENTIÈRE qui descend dans la colonne, pas ses deux
panneaux séparément : l'ordre et l'écart suivent d'eux-mêmes.

### Les seuils se mesurent sur les largeurs MINIMALES

Premier réflexe, faux : comparer la place disponible à la somme des largeurs
confortables (1058 px). Le panneau de réglages sait se resserrer jusqu'à 400 px ;
tant qu'il le peut, il n'y a aucune raison de tout réorganiser. Avec le bon
seuil (958 px), ouvrir le tiroir sur un écran de 1440 ne change plus rien.

    SEUIL_LARGE = 400 + 214 + 150 + 164 + 3 × 10 = 958
    SEUIL_MOYEN = 400 + 150 + 164 + 2 × 10       = 734

La place disponible se calcule sur la largeur VOULUE du tiroir, pas sur la
largeur mesurée — d'où `Tiroir.largeurDroiteVoulue()`. Même piège que pour la
languette : yagui ne masque sa barre qu'à la fin du glissement de fermeture, et
la mesure renvoie encore 232 px pendant toute l'animation.

### L'enchaînement des trois placements

Le nom est centré en abscisse sur la colonne, en ordonnée sur le panneau de
réglages. La colonne commence sous le nom. L'ordre est donc imposé.

Centré sur le PANNEAU de réglages, et non sur la rangée entière : la rangée
grandit quand les matières passent dessous, et le nom se mettrait à glisser vers
le bas à chaque changement de largeur de fenêtre. Le panneau, lui, garde la même
hauteur — c'est la ligne d'yeux du haut de l'écran.

Le nom prenait jusqu'ici la hauteur d'une rangée de menus du tiroir du haut, pour
s'aligner sur elle. Ce tiroir étant fondu dans celui de droite, il n'y a plus
rien à quoi s'aligner, et cette hauteur empruntée — quatre-vingts pixels pour un
texte de dix-neuf — faussait le centrage. Hauteur naturelle rétablie.

### La colonne peut défiler

En mode étroit elle reçoit deux blocs de plus. `overflow-y: auto` et une hauteur
maximale posée par la disposition, qui seule connaît son haut.

---

## La colonne resserrée et le groupe « Scène » — faits et vérifiés

### Titres raccourcis

« Outils de sculpture » → **Outils**, « Affichage et maillage » → **Maillage**,
« Scène et fichiers » → **Fichiers**. Un titre n'a pas à répéter ce que la
colonne dit déjà.

### Un groupe « Scène » entre « Maillage » et « Fichiers »

Neuf icônes, réparties jusque-là entre deux groupes où l'on ne pensait pas à les
chercher : nouvelle forme, introduire un fichier 3D, les cinq opérations
booléennes, supprimer un volume, afficher le sol. Toutes portent sur LA SCÈNE —
ce qui s'y trouve et comment les volumes s'y combinent — et non sur un maillage
ni sur un fichier.

« Ouvrir un fichier 3D » devient **« Introduire un fichier 3D »** : le fichier
vient s'ajouter à la scène, il ne remplace pas le travail en cours.

### Resserrement vertical

- écart entre groupes : 4 px → 0 (les titres suffisent à séparer) ;
- marge intérieure des groupes : 15 px partout → `6px 15px 8px`. Dissymétrique :
  large sur les côtés, où elle porte le fondu du bord ; courte en haut et en bas,
  où elle ne faisait qu'allonger la colonne ;
- marge sous les titres : 4 px → 1.

La colonne mesure 607 px au lieu d'environ 700, groupe « Scène » compris.

---

## Le repère de « Transformer » — fait et vérifié

**Troisième fichier du moteur touché** (après `ShaderBase.js` et `Remesh.js`) :
`src/editing/Gizmo.js`.

### Plus grand, mieux défini

- `GIZMO_SIZE` : 80 → 115. À 80, les cubes d'échelle faisaient moins de dix
  pixels de côté — impraticable à la souris, impossible au doigt.
- Les flèches étaient tracées sur **quatre pans** (`radSegments = 4`, la valeur
  par défaut de `Primitives.createArrow`), les cercles sur six. À la taille
  d'affichage voulue on voyait les arêtes. Portés à 16 pans pour les flèches, et
  12 × 128 pour les tores. Les volumes de SÉLECTION restent grossiers : ils ne
  se voient pas.

### Le cube central, homothétique

L'échelle uniforme existait déjà dans le moteur (`SCALE_W`), mais elle se
prenait sur un **cercle extérieur** que rien ne distinguait des trois cercles de
rotation sinon sa couleur. Elle est désormais un **cube au centre** : il dit la
même chose que les trois cubes d'axe — « ceci change la taille » — en ajoutant
qu'il agit sur les trois à la fois.

Il est un peu plus gros que les cubes d'axe pour deux raisons : il se prend au
milieu du repère, là où passent aussi les flèches de déplacement, et c'est lui
qui doit gagner la sélection à cet endroit (la sélection retient le plus PROCHE
de l'œil, et la face d'un cube de demi-arête 0,21 est atteinte avant le fût
d'une flèche de rayon 0,1).

L'orientation face caméra que le moteur appliquait au cercle a été retirée : un
cube qui pivoterait avec l'œil se lirait comme une pièce en mouvement.

### Le piège de la division par zéro

Le facteur d'échelle se lisait dans la PROPORTION entre la distance courante au
centre du repère et celle qu'on avait en saisissant la poignée :

    scaleMult = (distanceCourante − distanceALaSaisie) / distanceALaSaisie

Pour un cube d'axe, posé loin du centre, cette distance vaut quelques dizaines
de pixels. Pour un cube CENTRAL, elle vaut zéro. Deux pièges successifs :

1. tel quel, division par zéro — la pièce disparaît au premier pixel ;
2. avec un simple plancher sur le dénominateur, le numérateur vaut alors −plancher
   à l'instant de la saisie : `scaleMult = −1`, écrasement immédiat à 1 %.

La bonne mesure n'est pas une proportion mais un **déplacement** : on retient le
point de saisie (`_editStartMouse`, posé dans `_startScaleEdit`) et on lit
`(dx − dy) / course`, la course de référence valant le quart du petit côté de la
fenêtre — donc la même sensibilité quelle que soit la définition de l'écran.

Vérifié : glissement de 120 px vers la droite → ×1,267 ; 120 px vers la gauche →
×0,733 ; retour au point de saisie → ×1,000 exactement. Les cubes d'axe
continuent de n'agir que sur leur axe.

### Le tiroir prévient trop tôt

`largeurBarreDroite()` renvoie zéro à l'OUVERTURE : on est prévenu du changement
avant que yagui n'affiche sa barre. La disposition calculait donc sa place
disponible comme si le tiroir était fermé, et ne basculait pas en mode étroit.
`largeurDroiteVoulue()` retient maintenant la dernière largeur non nulle — elle
ne change jamais — et la disposition la relève une fois à la construction, tant
que la barre est encore visible.

---

## Les trois axonométries — contour complet et deux poids

Le contour était **incomplet** : il lui manquait un sommet de l'hexagone, et il
passait par le centre au lieu d'en faire le tour. On lisait un cube ouvert, ou
un éventail. La cause : le tracé enchaînait le sommet PROCHE avec cinq des six
sommets du contour, comme si le sommet proche appartenait à la silhouette — ce
qui n'est vrai qu'en isométrique parfait, et encore, par coïncidence.

Deux poids désormais, et c'est tout le sujet de ces icônes :

- **le contour**, en trait de 1 px. C'est presque le même hexagone pour les
  trois : il ne distingue rien, il n'a donc pas à peser ;
- **les trois arêtes issues du sommet proche** — la verticale et les deux
  fuyantes — au trait plein de 2 px. Ce sont ELLES qui portent l'information,
  puisque leur inclinaison EST la différence entre les trois projections.

Les tracés restent CALCULÉS, en projetant un cube selon l'azimut et l'élévation
de chaque vue (`Vues.js`), puis en prenant l'enveloppe convexe des huit sommets
projetés et en la mettant à l'échelle dans `[2,4 ; 21,6]`.

**Attention à l'orientation de la trimétrique.** Isométrique et dimétrique ont
un azimut de −45° : leur silhouette est symétrique, un miroir ne se verrait pas.
La trimétrique est à −30°, et son icône a le sommet proche à DROITE du centre —
c'est-à-dire l'image miroir de ce que donne le calcul direct. C'est l'orientation
validée par Jean-Jacques ; ne pas la « corriger » sans lui en parler.

---

## « Nouvelle 3D » — la fenêtre des primitives

### Une question posée une fois, pas quatre

La fenêtre demande d'abord **En plus / En remplacement**, puis propose les quatre
formes. Poser la question une seule fois évite huit entrées là où quatre
suffisent. La réponse est rangée dans un objet PARTAGÉ avec les entrées, qui la
lisent au moment du clic — la capturer à la construction leur donnerait la valeur
qu'elle avait à l'ouverture.

« En plus » est le défaut : c'est le geste qui ne détruit rien. Un défaut
destructeur se paie tôt ou tard par un travail perdu.

### Remplacer : deux précautions

1. **Ne pas appeler `clearScene()` du moteur.** Il remet aussi la caméra à sa
   position d'origine : on perdait son point de vue en changeant de forme.
2. **Une seule étape d'historique.** Enregistrer le retrait puis l'ajout en
   faisait deux, et une première annulation laissait la scène VIDE — ce qui
   ressemble à s'y méprendre à une catastrophe. On retire donc les anciens
   volumes sans rien enregistrer, on laisse le moteur enregistrer son ajout,
   puis on complète cette étape (`_addedMeshes` / `_removedMeshes` /
   `_selectMeshes`) avec ce qui a disparu. `StateAddRemove` sait porter les deux
   moitiés : c'est sa raison d'être.

Vérifié : ajout 1 → 2 volumes, remplacement → 1, caméra inchangée, une seule
annulation ramène à 2, un rétablissement redonne 1.

### Vignettes

Sphère, cube, cylindre, tore, chacun vu de trois quarts. Le tore a demandé deux
essais : **deux ellipses concentriques et symétriques se lisent comme un œil**,
pas comme un anneau. Deux corrections, jugées côte à côte à 90 et à 30 px —
aplatir l'anneau (rapport 1 pour 2, comme un objet posé à plat) et décaler le
trou vers le haut, si bien que le tube paraît plus épais devant que derrière.
C'est ce que montre vraiment un tore en perspective.

### L'icône du bouton

Elle montrait un disque et trois étincelles : « quelque chose de neuf », mais
rien qui dise QUOI. Un cube en axonométrie et un signe plus disent les deux mots
du bouton. Pas de flèche — rien ne se déplace ici, et une flèche aurait fait lire
« importer ».

Deux poids, comme dans la famille des axonométries mais pour une autre raison :
ici le cube n'est pas le sujet, il est le SUPPORT. Ce que le bouton fait, c'est
ajouter — d'où le signe plus au trait plein, posé par-dessus un cube au trait
fin. Le cube peut alors occuper presque toute la case sans écraser le signe, au
lieu d'être tassé dans un coin pour lui laisser la place.

---

## Trois détails de la colonne de gauche

- **Titres alignés à gauche.** Centrés, ils flottaient au-dessus d'une grille
  dont la première colonne est calée à gauche.
- **Le nom remonte de douze pixels** au-dessus de sa position centrée sur le
  panneau de réglages ; la colonne, elle, ne bouge pas — c'est l'écart entre les
  deux qu'il fallait ouvrir. Elle se règle donc sur la position CENTRÉE, sinon
  elle suivrait le nom et l'écart resterait le même.
- **Annuler et Rétablir forment un couple** : sur trois colonnes ils tombaient
  de part et d'autre d'un retour à la ligne. Une case vide (`{ type: 'espace' }`)
  les renvoie ensemble au début du rang suivant. Insérer une icône avant elles
  les sépare de nouveau.

## Deux valeurs qui divergeaient, et un clic qui n'arrivait pas

**La marge du bord droit** était écrite dans deux fichiers. Portée à 28 px dans
`Disposition.js` seulement, le cube restait à 14 : c'est `BarreParametres` qui
pose le bord de la rangée. Elle est désormais publiée (`Disposition.MARGE`) et
lue des deux côtés.

**Les menus ne se fermaient pas** sur un clic dans la zone de dessin : le moteur
arrête la propagation du `mousedown`, et l'écouteur de fermeture était posé à la
remontée. Il est passé à la CAPTURE. Un menu ouvert par mégarde y restait, et le
clic destiné à s'en débarrasser sculptait au passage.

---

## Santé des volumes — fait et vérifié

### Ce qu'on regarde, et pourquoi c'est presque gratuit

Le moteur tient déjà, pour chaque arête, le NOMBRE DE FACES qui s'y appuient
(`mesh.getEdges()`, un octet par arête). Ce seul nombre dit presque tout :

    2  → normal
    1  → bord libre : la surface s'arrête là, il y a un trou
    3+ → arête portant plus de deux faces ; aucun objet réel ne fait cela

Compter coûte UN parcours. Le nombre de BOUCLES, lui, ne se déduit pas du nombre
d'arêtes de bord — un maillage peut avoir un seul grand trou de deux cents
arêtes ou deux cents petits — et il faut les suivre. C'est le seul calcul
coûteux, et il n'a lieu que si des bords libres ont été trouvés.

### Le maillage dynamique n'a pas de tableau d'arêtes

`MeshDynamic.getEdges()` renvoie **null** ; seul `MeshStatic` tient ce tableau.
La sphère de départ étant dynamique par défaut, le premier essai a planté sur
`Cannot read properties of null`.

Sans conséquence pratique, et voici pourquoi : un maillage dynamique ne peut pas
être troué. La topologie dynamique part d'une primitive fermée et la subdivise ;
les trous arrivent par IMPORTATION, et un fichier importé est statique. L'examen
renvoie donc « sain » pour un maillage dynamique — ce qui est vrai — et fait le
vrai travail sur les maillages statiques.

*(Vérifié aussi : sur la sphère dynamique, le test des anneaux —
`ringVert.length === ringFace.length` pour tout sommet — confirme zéro sommet de
bord. La voie existe si un jour il faut examiner du dynamique.)*

### Le témoin

En bas à droite, au-dessus du décompte. **Il n'apparaît que s'il y a quelque
chose à dire** : un témoin toujours allumé cesse d'être lu au bout de dix
minutes. Ambre et non rouge — ce n'est pas une faute de l'utilisateur et rien
n'est perdu.

Un clic ouvre le détail, qui EXPLIQUE avant de proposer le remède. Un bouton
« Réparer » seul apprendrait à cliquer sans comprendre, ce qui est l'inverse de
ce qu'on cherche ici.

L'examen se relance à chaque changement d'état annoncé par la façade, mais pas
plus d'une fois par seconde ET seulement si le nombre de sommets ou de faces a
bougé. Sans ce garde-fou, sculpter en détail dynamique relancerait l'examen des
centaines de fois par minute.

### La réparation

`HoleFilling.createClosedMesh` rebouche toutes les boucles d'un coup. **Piège :**
il construit un `MeshStatic` SANS contexte WebGL — il servait d'étape
intermédiaire au remaillage, qui rebâtissait ensuite le maillage définitif. Tel
quel, ce maillage ne s'affiche pas. On reprend donc sa géométrie dans un maillage
neuf construit avec le contexte, le même détour que pour les booléens.

Une seule étape d'historique pour l'ensemble : l'utilisateur a fait UN geste.

Les arêtes surchargées ne se réparent PAS automatiquement : il faudrait décider
quelle moitié garder, et c'est un choix de forme. On les signale, et on le dit.

### Vérifications

Sphère statique percée de douze faces : l'examen annonce 1 trou et 12 bords
libres ; la réparation ramène 196 596 faces à 196 608 et la scène à « saine » ;
le témoin disparaît ; une annulation rend le trou, un rétablissement le rebouche.
Le bouton « Vérifier et réparer » du groupe SCÈNE répond aussi quand tout va
bien — un bouton muet laisse croire qu'il n'a pas marché.

---

## La rotation décélère — remise en service d'un mécanisme existant

Jean-Jacques voulait l'inertie de ShapeShix, où la caméra s'arrête en douceur.
ShapeShix l'obtient par `OrbitControls` de Three.js (`enableDamping`,
`dampingFactor = 0.09`).

**Rien à écrire ici : tout était déjà là.** `Camera.rotate()` appelle
`rotateDelay()` à chaque mouvement de souris, et `delay()` sait décélérer
(`easeOutQuart`). Le mécanisme était simplement DÉSACTIVÉ par
`var DELAY_ROTATE = -1`, qui fait sortir `delay()` immédiatement. Stéphane
Ginier l'avait câblé puis éteint.

Comment cela marche : chaque mouvement annule le compte à rebours précédent et
en arme un nouveau. Tant qu'on bouge, il ne se déclenche jamais. Dès qu'on
s'arrête, le dernier armé prolonge la rotation de **trois fois le dernier
déplacement**, réparti sur la durée en décélérant.

L'effet est donc proportionnel à la vitesse du geste : un mouvement lent qui
s'arrête doucement ne prolonge presque rien, un mouvement vif glisse un peu.
Mesuré : après un dernier `rotate()` de 0,083 rad, la caméra poursuit de
0,25 rad — exactement le triple — puis s'arrête. `DELAY_ROTATE = 200` est le
seul nombre à toucher.

---

## L'examen des volumes, deuxième version

### Le défaut de la première : un maillage fermé n'est pas un maillage sain

Jean-Jacques a malmené une forme jusqu'à la rendre manifestement inimprimable —
pénétrations mutuelles, parois en lame de rasoir, éclats détachés — **sans
déclencher la moindre alerte**. La cause est instructive : la topologie
dynamique referme la surface au fur et à mesure du modelage. Le maillage reste
donc parfaitement FERMÉ, sans un seul bord libre, tout en devenant impossible à
imprimer.

Ne surveiller que les trous et les arêtes surchargées revenait à ne surveiller
que ce qui arrive aux fichiers importés.

### Deux mesures ajoutées, toutes deux d'un seul parcours

**Morceaux séparés** — union-find sur les sommets, en parcourant les faces. On
n'utilise que la liste des faces, donc cela marche aussi bien sur un maillage
statique que dynamique ; les anneaux de voisinage, eux, ne sont pas stockés de
la même façon dans les deux cas. Les sommets orphelins ne comptent pas.

**Triangles en aiguille** — qualité `4√3 × aire / Σ(côtés²)` : 1 pour un
équilatéral, 0 pour un triangle écrasé. En dessous de 0,02, c'est une aiguille
ou une lamelle. **La mesure est sans dimension**, donc aucun seuil à régler
selon la taille de l'objet ou l'unité.

Coût mesuré : 10 ms sur 196 000 faces, 19 ms sur 393 000. Le garde-fou du témoin
(une fois par seconde au plus, et seulement si la géométrie a bougé) suffit
largement.

### Deux remèdes, de portée très différente

**Reboucher** — chirurgical, sans perte, pour les trous.

**Refondre** — le remaillage par voxels du moteur, piloté via
`GuiTopology.remesh()` plutôt que recopié : il gère déjà la conversion des
maillages dynamiques, la fusion de la sélection et l'étape d'historique.

**Vérifié, et la première formulation était fausse.** J'avais écrit que refondre
« corrige tout d'un coup ». Essai sur une union booléenne de deux volumes
éloignés : après refonte, 0 trou, 0 aiguille, 0 arête surchargée… et toujours
**2 morceaux**. Évidemment : on ne soude pas ce qui ne se touche pas. Le panneau
le dit maintenant AVANT d'agir, pour qu'on ne perde pas son détail pour rien.

### Un faux positif de mon banc d'essai, à ne pas prendre pour un défaut

Un maillage fabriqué à la main dans la console — deux copies concaténées dans
les mêmes tableaux — donne 12 faces après refonte. Ce n'est pas la refonte qui
échoue : l'octree et la boîte englobante du maillage bricolé sont restés ceux du
maillage d'origine. Sur des maillages construits normalement, la refonte donne
217 368 faces en 1 s sur la sphère, 23 040 en 0,1 s sur l'union booléenne.

### Ce qui reste à détecter

Les auto-intersections et les parois trop minces. Les deux demandent des lancers
de rayon à travers l'octree : examen à la demande, pas en continu. C'est le
prochain morceau de ce chantier.

---

## L'examen approfondi — parois minces et auto-intersections

Les quatre premiers défauts se lisent dans un parcours des tableaux ; ces
deux-ci ne se voient pas dans la LISTE des faces mais dans leur DISPOSITION
dans l'espace. Il faut interroger l'octree — d'où un examen à la demande,
déclenché par le bouton « Vérifier et réparer » du groupe SCÈNE.

### Parois minces

On part d'un sommet, on s'enfonce légèrement sous la surface, et l'on lance un
rayon le long de la normale inversée. La première surface rencontrée est la
paroi d'en face : la distance parcourue EST l'épaisseur de matière.

Le retrait sous la surface n'est pas un détail — sans lui, le rayon ressort
aussitôt par la face qui porte le sommet lui-même, et toute épaisseur mesure
zéro.

Seuil : **0,6 % de la diagonale** de l'objet. Sur une pièce de 10 cm cela fait
0,6 mm, à peu près la limite d'une buse de 0,4 mm. C'est le nombre à revoir si
l'atelier change de machine.

**Vérification exacte, et pas seulement plausible :** sur une sphère, l'épaisseur
mesurée vaut 0,5774 de la diagonale. Or la diagonale de la boîte d'une sphère de
diamètre D vaut D√3, donc D/(D√3) = 1/√3 = 0,5774. La mesure est juste au
quatrième chiffre.

Positif : une sphère écrasée d'un facteur 250 donne 357 sondages minces sur 364,
épaisseur minimale 0,15 %.

### Auto-intersections

On prend un triangle, on demande à l'octree les faces dans sa sphère englobante,
et l'on teste celles qui ne partagent aucun sommet avec lui. Deux triangles se
traversent lorsqu'une arête de l'un perce l'autre : six segments, testés avec la
fonction du moteur (`Geometry.intersectionRayTriangle`), déjà éprouvée.

Positif : calotte de sphère enfoncée à travers le fond → 11 faces traversées sur
501 sondées. Négatif : zéro sur la sphère intacte, zéro sur un résultat booléen,
zéro après refonte. Pas de faux positif observé.

### Échantillonnage : ce que cela autorise à dire

700 sondages d'épaisseur, 500 de pénétration, ce qui donne une réponse en **47 ms**
sur 196 000 faces — bien moins cher que prévu. Mais **un échantillon prouve la
présence d'un défaut, jamais son absence.** Les textes affichés disent donc
« au moins », et le panneau porte en bas la mention de sa propre méthode.

### Le tampon partagé, deuxième fois

`intersectRay` et `intersectSphere` écrivent tous deux dans le tampon commun
(`Utils.getMemory`). Deux appels successifs se marchent dessus : on copie le
résultat avant tout autre appel. Même piège que pour les booléens.

---

## Un nom de classe déjà pris — régression que j'ai introduite

`TemoinSante.js` appelait ses éléments `.modelagix-temoin`. Or `BarreParametres`
appelle ainsi, depuis bien plus longtemps, **le disque qui montre l'empreinte du
pinceau**. Mes règles — `position: fixed`, `display: none` — se sont donc
appliquées à lui, et il a disparu de la barre des paramètres.

Rien ne l'a signalé : aucune erreur, aucun avertissement, juste un élément en
moins dans un panneau qui en contient six. Je ne l'ai vu que trois jours plus
tard, en enquêtant sur une mesure aberrante.

Renommé en `.modelagix-sante`. **Avant d'inventer un nom de classe, chercher
s'il existe déjà** — une feuille de style ne prévient jamais des collisions,
et le CSS n'a pas de portée.

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
| Slide (glisser la surface) | 648 | 1 (`getModelSpaceMatrix`) — mais **en panne chez eux** |
| Inset | 616 | 2, et dépend de Three.js |

### Ce qu'ils font vraiment — vérifié en lisant leur code

**Relax n'apporte rien.** Ses 14 lignes se résument à `class Relax extends
Smooth` avec `_tangent = true`. C'est notre outil Lisser avec sa case
**Tangentiel** déjà cochée. Nous exposons donc déjà la fonction ; le porter
reviendrait à ajouter un bouton pour un réglage existant.

**Weld** soude deux sommets : on clique le premier, puis le second, et le
premier fond dans le second. Toutes les faces qui citaient le premier citent
désormais le second ; celles qui se retrouvent avec deux coins identiques —
des triangles d'aire nulle — sont supprimées, et les quadrilatères concernés
redeviennent des triangles. Une paire à la fois.

**SnapWeldCenter — description corrigée le 29 juillet 2026.** Il était présenté
ici comme « effondre une face sur son centre pour alléger un maillage trop
dense ». Relecture du code : c'est faux sur le mécanisme comme sur l'usage.

Il ne travaille QUE sur le plan de symétrie. On clique près d'une arête posée
sur l'axe (il refuse au-delà de 0,05 d'écart en X, et refuse aussi si l'arête
n'est pas partagée par exactement deux faces). Il prend les deux sommets opposés
à cette arête dans les deux triangles voisins, les fond en un seul, et pose ce
sommet exactement sur l'axe, à mi-hauteur. Il sert donc à **nettoyer la couture
de symétrie** — les petits losanges qui apparaissent là où les deux moitiés se
rejoignent — et non à alléger quoi que ce soit.

Ces deux-là relèvent de la **retopologie**, pas du modelage. Utiles pour
réparer un maillage à la main, sans rapport avec le geste d'un élève sur de la
pâte à modeler. À garder en réserve, pas en priorité.

**FillHole — correction du 29 juillet 2026.** Il était présenté ici comme « le
seul apport décisif », au motif que « rien chez nous ne sait réparer un maillage
troué ». **C'était faux, et vérifiable dans notre propre dossier `src/`** :

`src/editing/HoleFilling.js` fait déjà le travail, et mieux :
`HoleFilling.createClosedMesh(maillage)` détecte TOUTES les boucles de bord et
les rebouche d'un coup, par front d'avancée. Le fichier est là depuis SculptGL ;
seul `Remesh.js` s'en sert, juste avant de voxéliser, ce qui explique qu'il soit
passé inaperçu — il n'apparaît nulle part dans l'interface.

Le FillHole de SculptXR, lui, est MANUEL : on clique une face bordant un trou,
il suit la boucle et bouche celui-là seulement. Six cent vingt-deux lignes pour
faire à la main, un trou après l'autre, ce que nous savons faire d'un bouton sur
la totalité.

Reste à trancher, avec Jean-Jacques, lequel des deux gestes convient : boucher
tout d'un coup, ou désigner. Mais l'un des deux ne coûte rien.

**Leçon de méthode.** L'analyse a comparé leur code au NÔTRE tel que je me le
représentais, pas tel qu'il est. Avant de porter quoi que ce soit d'un autre
projet, chercher d'abord la fonction chez soi.

**Slide — description corrigée le 29 juillet 2026.** Ce n'est pas un outil de
topologie mais un PINCEAU : il fait glisser la surface le long d'elle-même,
tangentiellement, au lieu de la pousser vers l'extérieur ou l'intérieur. On
déplace un relief sans changer le volume — geste qui aurait du sens en
céramique.

Mais leur propre bilan (`docs/slide_brush_geometric_snapping_postmortem.md`,
mars 2026) est sans appel : sommets qui s'agrafent en lignes droites, sommets
qui sautent à l'origine du monde quand le filtrage rejette toutes les faces
voisines, blocage de 0,1 s à chaque début de geste. Ils écrivent l'avoir « rangé
et retiré de l'interface ». Il figure pourtant encore dans leurs listes d'outils,
donc je ne sais pas dans quel état il est aujourd'hui.

**Ne pas le recopier.** L'idée mérite en revanche d'être reprise à notre compte :
nous avons déjà la contrainte tangentielle dans Lisser, et le déplacement de
surface dans Saisir. C'est de là qu'il faudrait partir, pas de leur code.

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
