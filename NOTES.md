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
`undo`/`redo`.

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

---

## À faire ensuite

- [x] Régler l'enregistrement du travail sur GitHub (`gh auth login`).
- [x] Lire `src/` pour repérer les vrais noms des méthodes du moteur.
- [x] Écrire la façade et la vérifier outil par outil.
- [ ] Essayer à la main `openFile()` et `exportSTL()`.
- [ ] Masquer yagui en CSS (sans le supprimer) et le rendre escamotable par une
      languette au bord droit, plus un raccourci clavier.
- [ ] Construire la nouvelle barre d'outils, **en validant outil par outil**
      dans le navigateur.
- [ ] Dessiner les icônes SVG (sprite unique, grille 24 × 24, trait 2 px,
      `fill="currentColor"`).
- [ ] Ajouter la mention de filiation dans le README et la fenêtre « À propos ».
- [ ] Mise en ligne sur Firebase Hosting.
