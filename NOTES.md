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

## À faire ensuite

- [ ] Régler l'enregistrement du travail sur GitHub (authentification `git push`).
- [ ] Lire `src/` pour repérer les vrais noms des méthodes du moteur
      (choisir un outil, régler taille et force, symétrie, filaire, matcap,
      ouvrir un fichier, annuler, rétablir, exporter).
- [ ] Écrire la façade : un fichier unique regroupant ces méthodes, seul point
      de contact entre la nouvelle interface et le moteur.
- [ ] Masquer yagui en CSS (sans le supprimer).
- [ ] Construire la nouvelle barre d'outils, **en validant outil par outil**
      dans le navigateur.
- [ ] Dessiner les icônes SVG (sprite unique, grille 24 × 24, trait 2 px,
      `fill="currentColor"`).
- [ ] Ajouter la mention de filiation dans le README et la fenêtre « À propos ».
- [ ] Mise en ligne sur Firebase Hosting.
