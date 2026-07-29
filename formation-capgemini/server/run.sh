#!/usr/bin/env bash
# =============================================================================
# Lancement du backend (récupération des métadonnées d'articles + persistance).
# Prérequis : Python 3.9+.  Crée un environnement virtuel, installe les
# dépendances et démarre le serveur (qui sert aussi le front).
#
# Variables d'environnement utiles :
#   PORT                      port d'écoute (défaut : 8000)
#   FORMATION_ADMIN_PASSWORD  mot de passe admin (sinon généré et affiché)
#   FORMATION_SECRET          secret de signature des jetons
# =============================================================================
set -euo pipefail

# Se placer dans formation-capgemini/ (parent de ce script).
cd "$(dirname "$0")/.."

PORT="${PORT:-8000}"

python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate

python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r server/requirements.txt

echo "----------------------------------------------------------------"
echo "  Backend prêt → http://localhost:${PORT}"
echo "  (Ctrl+C pour arrêter)"
echo "----------------------------------------------------------------"

exec uvicorn server.app:app --host 0.0.0.0 --port "${PORT}" "$@"
