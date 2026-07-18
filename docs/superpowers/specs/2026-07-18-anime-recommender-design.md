# AnimeAdvice — Design v1

## 1. Objectif

Application web permettant de :
- Recevoir des recommandations d'animes basées sur un ou plusieurs animes donnés, sur son historique de visionnage, ou sur ses coups de cœur.
- Gérer une liste personnelle d'animes (à voir / vu, note, commentaire, date de visionnage).
- Éviter que l'appli ne re-suggère des animes déjà vus ou explicitement exclus.
- Parcourir le catalogue complet AniList avec filtres et tri.

## 2. Architecture

Application front-end pure : **React + Vite**, déployée en site statique sur **GitHub Pages**. Pas de backend.

- **API AniList** (GraphQL, `https://graphql.anilist.co`) appelée directement depuis le navigateur pour : recherche/autocomplete, détails d'un anime (genres, tags, studios, synopsis, cover, score), recommandations communautaires liées à un anime, et navigation du catalogue complet (pagination via `Page`).
- **localStorage** stocke la liste personnelle de l'utilisateur (voir schéma en section 3), persistante par navigateur.
- **Export/Import JSON** de la liste personnelle, pour sauvegarde ou migration manuelle entre navigateurs/appareils.

### Migration future (hors scope v1)

La couche d'accès aux données locales sera isolée dans un module dédié (ex: `storage.js` exposant `getList()`, `saveAnime()`, `removeAnime()`, etc.). Une future v2 avec comptes utilisateurs + base de données pourra remplacer l'implémentation interne de ce module par des appels à un backend, sans impacter les composants React ni l'algorithme de recommandation.

## 3. Modèle de données (localStorage)

Clé `animeAdvice.list`, tableau d'objets :

```json
{
  "animeId": 21,
  "title": "One Piece",
  "coverImage": "https://...",
  "genres": ["Action", "Adventure"],
  "studios": ["Toei Animation"],
  "seasonYear": 1999,
  "status": "vu",
  "note": "coup_de_coeur",
  "excluded": false,
  "watchedAt": "2026-07-18",
  "comment": "",
  "addedAt": "2026-07-18T12:00:00Z"
}
```

- `genres`, `studios`, `seasonYear` : copie locale (dénormalisée) des métadonnées AniList au moment de l'ajout, nécessaire pour trier "Ma liste" par genre/studio/année sans re-appeler l'API (garde l'écran utilisable hors ligne, cf. section 6).
- `status`: `"a_voir"` | `"vu"` — exclusif.
- `note`: `"coup_de_coeur"` | `"aime"` | `"pas_aime"` | `null` — optionnel, pertinent seulement si `status: "vu"`.
- `excluded`: `boolean` — `true` = "ne plus recommander". Indépendant de `status` (un anime peut être exclu sans avoir été vu).
- `watchedAt`: date optionnelle, éditable manuellement.
- `comment`: texte libre optionnel.
- `addedAt`: horodatage automatique à la création de l'entrée.
- Indexation par `animeId` (identifiant AniList) pour éviter les doublons et permettre de re-récupérer les métadonnées à jour.

## 4. Modes de recommandation

Trois déclencheurs possibles :

1. **Manuel** — l'utilisateur saisit 1 ou plusieurs noms d'anime (recherche AniList).
2. **Selon mes vus** — utilise automatiquement toutes les entrées `status: "vu"` comme base.
3. **Selon mes coups de cœur** — utilise uniquement les entrées `note: "coup_de_coeur"` (signal plus ciblé).

### Pipeline commun

1. Pour chaque anime de base, récupérer les recommandations communautaires AniList associées.
2. Compléter/reclasser ce pool par similarité de genres, tags et studios avec les animes de base (et, en bonus, avec les coups de cœur existants de l'utilisateur).
3. Construire un pool d'environ 20 candidats pertinents.
4. Exclure tout candidat déjà présent dans la liste personnelle avec `status: "vu"` ou `excluded: true`.
5. Tirer aléatoirement 5 résultats parmi le pool, pondérés par pertinence (les mieux classés ont plus de chances d'apparaître).
6. Un bouton **"Voir d'autres"** retire 5 nouveaux résultats depuis le même pool sans tout recalculer. Si le pool est épuisé, un nouveau pool est recalculé.

### Suggestion "Découverte" (bonus)

En plus des 5 suggestions principales, chaque recommandation (peu importe le déclencheur) inclut automatiquement une 6ème carte "Découverte" : un anime peu connu mais cohérent avec les genres dominants des animes de base.

- "Peu connu" = filtré hors des ~500 animes les plus populaires du genre concerné (pagination AniList au-delà des toutes premières pages triées par popularité).
- Reste pertinent : le candidat est piochée parmi ce sous-ensemble puis pondéré par la même similarité de genres/tags/studios que le pool principal (pas un pur tirage aléatoire) — évite par exemple de proposer un anime pour enfants si les animes de base sont plutôt seinen/action.
- Exclut également tout anime déjà présent dans la liste personnelle.
- Si aucun candidat pertinent n'est trouvé (ex: base sans genre exploitable), la carte "Découverte" n'apparaît simplement pas.

### Cas limite

Si la base est vide (ex: "Selon mes vus" cliqué sans aucun anime marqué vu), afficher un message invitant à ajouter des animes d'abord plutôt que de lancer une recherche vide.

## 5. Écrans

### Accueil / Recommandation
Zone de recherche (autocomplete AniList) pour saisir 1+ animes, ou boutons "Selon mes vus" / "Selon mes coups de cœur". Affiche 5 cartes résultats (cover, titre, genres, synopsis court, lien vers la fiche) avec actions rapides : ajouter à ma liste (à voir/vu), marquer déjà vu, ne plus recommander. Bouton "Voir d'autres". Une 6ème carte distincte "Découverte" (voir section 4) apparaît en bonus avec les mêmes actions rapides.

### Catalogue
Parcourt tout le catalogue AniList, avec chargement dynamique (infinite scroll / "charger plus") pour limiter la consommation de données. Filtres : genre, année, studio, format. Tri : score, popularité, année, titre. Chaque carte affiche un badge si l'anime est déjà présent dans la liste personnelle (avec son statut/note).

### Ma liste
Uniquement les animes ajoutés par l'utilisateur. Triable par note, année, genre, studio, statut. Édition inline : note, commentaire, date de visionnage, statut, exclusion.

### Fiche anime
Accessible en cliquant sur un anime depuis n'importe quel écran (accueil, catalogue, ma liste). Affiche :
- Infos AniList complètes : synopsis, genres, tags, studios, format, nombre d'épisodes, score, staff.
- Champs personnels éditables : statut, note, commentaire, date de visionnage, exclusion.
- Section "Animes similaires" basée sur les recommandations AniList liées à cet anime.

### Export / Import (depuis "Ma liste")
- **Export** : télécharge la liste personnelle au format `.json`.
- **Import** : sélection d'un fichier `.json`, fusion avec la liste actuelle. En cas de doublon (même `animeId` avec des données différentes), affiche une boîte de dialogue récapitulative listant tous les conflits, permettant de choisir pour chacun "garder existant" ou "garder importé". Import annulé sans perte de données si le fichier est invalide.

## 6. Gestion des erreurs

- **API AniList indisponible / erreur réseau** : message d'erreur avec bouton "Réessayer" ; l'appli reste utilisable pour consulter/éditer "Ma liste" (données locales) même hors ligne.
- **Rate limit AniList** (~90 req/min) : debounce sur la recherche, cache en mémoire des réponses déjà récupérées durant la session.
- **Recherche/catalogue sans résultat** : message "Aucun anime trouvé".
- **Recommandation impossible** (base vide) : message explicite invitant à ajouter des animes d'abord.
- **Import JSON invalide/corrompu** : validation du format avant fusion ; message d'erreur si illisible, aucune donnée existante perdue.
- **localStorage corrompu/plein** : lecture protégée (try/catch), repli sur liste vide + avertissement plutôt que crash.

## 7. Plan de test

- **Tests unitaires (Vitest)** : construction du pool de recommandations, scoring genres/tags/studios, tirage aléatoire pondéré, fonctions de stockage (lecture/écriture/fusion/import), détection de doublons, résolution de conflits d'import.
- **Tests de composants (React Testing Library)** : recherche + ajout à la liste, marquage vu/exclu, tri/filtre du catalogue, dialogue de résolution de conflits à l'import.
- **Appels AniList mockés** dans les tests (pas d'appels réseau réels).
- Pas de E2E (Playwright) prévu pour la v1.

## 8. Hors scope (v1)

- Comptes utilisateurs et authentification.
- Backend / base de données (voir section "Migration future").
- Application mobile native.
- **Système d'amis** (voir un profil ami, comparer les listes, recommandations basées sur les goûts d'un ami) — envisagé pour la v2, une fois comptes + base de données en place. Nécessitera un modèle de données relationnel (utilisateurs, relations d'amitié) côté backend.
