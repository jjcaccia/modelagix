#!/bin/bash
#
#  MODELAGIX — démarrage de l'environnement de travail
#
#  Deux façons de s'en servir :
#    • double-cliquer sur ce fichier dans le Finder
#    • ou, dans le Terminal :  ~/Documents/MODELAGIX/modelagix/demarrer.command
#
#  Ce script fait tout ce qu'il faut, dans l'ordre :
#    1. active Node 18 et l'option de compatibilité exigée par webpack
#    2. installe les dépendances si elles manquent
#    3. construit l'application
#    4. lance le serveur local et ouvre le navigateur
#    5. reconstruit automatiquement à chaque fichier enregistré
#
#  Pour tout arrêter : Ctrl + C
#

NODE18="/opt/homebrew/opt/node@18/bin"
PROJET="$(cd "$(dirname "$0")" && pwd)"
PORT=8080

cd "$PROJET" || exit 1

# ---------------------------------------------------------------------
#  1. Node 18 est-il bien là ?
# ---------------------------------------------------------------------
if [ ! -x "$NODE18/node" ]; then
  echo ""
  echo "❌  Node 18 est introuvable."
  echo "    Attendu ici : $NODE18"
  echo "    Pour l'installer :  brew install node@18"
  echo ""
  read -r -p "Appuyez sur Entrée pour fermer."
  exit 1
fi

export PATH="$NODE18:$PATH"
export NODE_OPTIONS=--openssl-legacy-provider
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# ---------------------------------------------------------------------
#  2. Dépendances
# ---------------------------------------------------------------------
if [ ! -d node_modules ]; then
  echo ""
  echo "📦  Dépendances absentes — installation en cours (quelques minutes)…"
  echo ""
  if ! ELECTRON_SKIP_BINARY_DOWNLOAD=1 yarn install; then
    echo ""
    echo "❌  L'installation a échoué. Rien n'a été lancé."
    echo ""
    read -r -p "Appuyez sur Entrée pour fermer."
    exit 1
  fi
fi

# ---------------------------------------------------------------------
#  3. Un serveur tourne-t-il déjà sur ce port ?
# ---------------------------------------------------------------------
# On ne cherche qu'un serveur réellement à l'écoute (-sTCP:LISTEN).
# Sans ce filtre, de simples connexions fermées d'un ancien onglet
# suffiraient à faire croire, à tort, que le port est pris.
#
# Si c'est déjà MODELAGIX, on le réutilise plutôt que de refuser : refuser
# obligeait à aller tuer un serveur à la main, pour rien.
REUTILISE=0
if lsof -ti tcp:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  if curl -sf -o /dev/null "http://localhost:$PORT/sculptgl.js"; then
    REUTILISE=1
    echo ""
    echo "ℹ️   Un serveur MODELAGIX tourne déjà sur le port $PORT — on le réutilise."
  else
    echo ""
    echo "⚠️   Le port $PORT est occupé par autre chose que MODELAGIX."
    echo "     Pour voir par quoi :  lsof -i tcp:$PORT -sTCP:LISTEN"
    echo "     Pour le fermer :      lsof -ti tcp:$PORT -sTCP:LISTEN | xargs kill"
    echo ""
    read -r -p "Appuyez sur Entrée pour fermer."
    exit 1
  fi
fi

# ---------------------------------------------------------------------
#  4. Première construction
# ---------------------------------------------------------------------
echo ""
echo "🔨  Construction de l'application…"
echo ""
if ! node_modules/.bin/webpack; then
  echo ""
  echo "❌  La construction a échoué — rien n'a été lancé."
  echo "    Le message d'erreur est juste au-dessus."
  echo ""
  read -r -p "Appuyez sur Entrée pour fermer."
  exit 1
fi

# ---------------------------------------------------------------------
#  5. Serveur local
# ---------------------------------------------------------------------
SERVEUR=""
if [ "$REUTILISE" -eq 0 ]; then
  node_modules/.bin/http-server app -p $PORT -c-1 -s &
  SERVEUR=$!
fi

nettoyage() {
  # On n'arrête que le serveur qu'on a démarré nous-même.
  if [ -n "$SERVEUR" ]; then
    kill "$SERVEUR" 2>/dev/null
    echo ""
    echo "🛑  Serveur arrêté. Bonne journée."
  else
    echo ""
    echo "🛑  Reconstruction arrêtée. Le serveur qui tournait déjà reste en place."
  fi
  echo ""
}
trap nettoyage EXIT

sleep 1
echo ""
echo "─────────────────────────────────────────────────────────"
echo "✅  MODELAGIX tourne sur  http://localhost:$PORT"
echo ""
echo "    Le navigateur s'ouvre tout seul."
echo "    Après une modification, rechargez la page (Cmd + R)."
echo ""
echo "    Pour tout arrêter : Ctrl + C"
echo "─────────────────────────────────────────────────────────"
echo ""

open "http://localhost:$PORT"

# ---------------------------------------------------------------------
#  6. Reconstruction automatique — reste au premier plan
# ---------------------------------------------------------------------
node_modules/.bin/webpack -w
