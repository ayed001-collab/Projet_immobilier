# Backend Actualités & vidéos — image « zéro setup » (seul prérequis : Docker).
# Contexte de build = dossier formation-capgemini/ :
#   docker build -f server/Dockerfile -t formation-veille .
#   docker run -p 8000:8000 -e FORMATION_ADMIN_PASSWORD="votre-mdp" \
#     -v "$PWD/server/storage:/app/server/storage" \
#     -v "$PWD/assets/videos:/app/assets/videos" formation-veille
FROM python:3.11-slim

WORKDIR /app

# Dépendances d'abord (cache Docker).
COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

# Front + backend (le serveur sert aussi les fichiers statiques).
COPY . .

EXPOSE 8000
# $PORT est injecté par la plupart des hébergeurs (Render, Railway…) ; 8000 en local.
CMD ["sh", "-c", "uvicorn server.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
