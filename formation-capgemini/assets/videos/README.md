# Vidéos de formation

Déposez ici les fichiers vidéo (`.mp4`, `.webm`) des thèmes du parcours
« Les fondamentaux de l'assurance ».

Workflow (application statique, sans backend) :
1. Depuis l'**espace admin** (`#/admin`), associez à un thème soit un lien
   hébergé (YouTube / Vimeo / `.mp4`), soit un fichier local (jouable le temps
   de la session).
2. Pour une diffusion permanente et partagée : déposez le fichier dans ce
   dossier, puis reportez la configuration dans `data/curriculum.json`
   (bouton « Exporter la configuration » de l'espace admin), sous la clé
   `video` du thème concerné :

   ```json
   "video": { "type": "fichier", "src": "assets/videos/mon-fichier.mp4", "titre": "…", "duree": "8 min" }
   ```
