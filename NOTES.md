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
