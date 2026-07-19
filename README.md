# AniSensei

Application web qui recommande des animes à partir de titres donnés, de l'historique de visionnage ou des coups de cœur, avec gestion d'une liste personnelle (localStorage).

## Développement

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

## Build

```bash
npm run build
npm run preview
```

## Déploiement (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` construit et déploie automatiquement le site à chaque push sur `main`/`master`.

Étapes manuelles à faire une seule fois sur GitHub :
1. Pousser ce dépôt sur GitHub sous le nom `AniSensei` (le chemin de base configuré dans `vite.config.js` est `/AniSensei/`).
2. Dans les paramètres du dépôt, section **Pages**, choisir **Source: GitHub Actions**.
3. Le site sera ensuite disponible à `https://drzeroes.github.io/AniSensei/`.
