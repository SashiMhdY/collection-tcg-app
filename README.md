# Cartes TCG

Application web de la collection de cartes à collectionner (Pokémon, Super Dragon Ball Heroes, Naruto Kayou, Yu-Gi-Oh!, Dragon Ball Carddass) : galerie, filtres, valeur de la collection et historique des prix. Construite sur le modèle de [Yummy](https://github.com/SashiMhdY/yummy-app).

Elle s’utilise dans un navigateur et s’installe sur iPhone comme une app (Safari, Partager, « Sur l’écran d’accueil »).

## Fonctionnement

- Ce dépôt (public) ne contient que le code de l’application, servi par GitHub Pages. Il ne contient aucune donnée de la collection.
- Les données vivent dans un dépôt **privé** séparé, au format JSON :
  - `data/cartes.json` : une entrée par carte et par version ;
  - `data/prix.json` : l’historique des cotations de chaque carte (la valeur d’une carte est sa dernière cotation) ;
  - `photos/` : photos des cartes, lues avec la clé et gardées en cache sur l’appareil.
- L’app lit ces fichiers avec l’API GitHub, grâce à une clé d’accès (« fine-grained personal access token ») limitée au dépôt privé, droit « Contents : Read and write ». La clé est saisie une fois par appareil et reste dans le navigateur.
- Cartes et prix sont ajoutés et mis à jour par Claude (skill `collection-tcg`). La seule écriture de l’app est la photo d’une carte, envoyée tout de suite ou gardée en attente si le réseau manque.
- Un service worker garde l’app consultable hors ligne.

## Arborescence

```
index.html, manifest.webmanifest, sw.js
css/app.css
js/app.js            routes et écran principal
js/store.js          état, cache local, synchronisation
js/github.js         accès à l’API GitHub (repris de Yummy)
js/collection.js     valeurs, totaux, variations, historique mensuel
js/graphique.js      courbe SVG avec bulle au toucher
js/photos.js         lecture, cache et envoi des photos
js/md.js             rendu Markdown des notes (repris de Yummy)
js/views/            écrans : collection, galerie, carte, réglages
js/vendor/           Preact + htm (sans étape de compilation)
fonts/, icons/
```

Pas de compilation : les fichiers sont servis tels quels. À chaque nouvelle version, changer le numéro dans `sw.js` (CACHE) et `js/views/reglages.js` (VERSION).

## Crédits

- Police : Archivo, par Omnibus-Type (SIL Open Font License, voir `fonts/LICENSE-OFL.txt`).
- [Preact](https://preactjs.com) (MIT) et [htm](https://github.com/developit/htm) (Apache-2.0).
