# AnimeAdvice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static React web app that recommends anime based on titles the user gives it (or their own watch history / favorites), while letting them manage a personal list and browse the full AniList catalogue.

**Architecture:** React + Vite single-page app, deployed as a static site to GitHub Pages, with `HashRouter` client-side routing. All anime data comes from the public AniList GraphQL API called directly from the browser. The personal list lives in `localStorage`, with export/import to JSON.

**Tech Stack:** React 18, Vite 5, react-router-dom 6, Vitest + React Testing Library for tests, no backend.

## Global Constraints

- No backend, no accounts, no API keys — all data comes from `https://graphql.anilist.co` (public, unauthenticated) and `localStorage`.
- `localStorage` key: `animeAdvice.list`. Entry schema (see spec section 3, amended):
  `{ animeId, title, coverImage, genres, studios, seasonYear, status, note, excluded, watchedAt, comment, addedAt }`.
  - `status`: `"a_voir" | "vu"`.
  - `note`: `"coup_de_coeur" | "aime" | "pas_aime" | null`.
- AniList calls are mocked in every automated test — no real network calls in the test suite.
- Vite `base` is `/animeAdvice/` (matches the GitHub repo name) for correct GitHub Pages asset paths.
- Node.js 20+ and npm are required locally.
- Every new module ships with a Vitest test file in the same task.

---

## Task 1: Project scaffold (Vite + React + Vitest)

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/main.jsx`
- Create: `src/setupTests.js`
- Create: `src/App.jsx`
- Test: `src/App.test.jsx`

**Interfaces:**
- Produces: `App` default export (React component) — later tasks modify this file to wire in routes.

- [ ] **Step 1: Create the project scaffold files**

`package.json`:
```json
{
  "name": "animeadvice",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "vite": "^5.4.6",
    "vitest": "^2.1.1"
  }
}
```

`vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/animeAdvice/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
  },
});
```

`index.html`:
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AnimeAdvice</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`.gitignore`:
```
node_modules
dist
.DS_Store
```

`src/main.jsx`:
```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`src/setupTests.js`:
```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

- [ ] **Step 3: Write the failing smoke test**

`src/App.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  it('renders the AnimeAdvice title', () => {
    render(<App />);
    expect(screen.getByText('AnimeAdvice')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- App.test.jsx`
Expected: FAIL (`src/App.jsx` does not exist yet).

- [ ] **Step 5: Implement the App shell**

`src/App.jsx`:
```jsx
import { HashRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    <HashRouter>
      <header>
        <h1>AnimeAdvice</h1>
        <nav>
          <Link to="/">Accueil</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<p>Bienvenue sur AnimeAdvice.</p>} />
        </Routes>
      </main>
    </HashRouter>
  );
}

export default App;
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- App.test.jsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json vite.config.js index.html .gitignore src/main.jsx src/setupTests.js src/App.jsx src/App.test.jsx package-lock.json
git commit -m "Scaffold Vite + React + Vitest project"
```

---

## Task 2: AniList GraphQL client

**Files:**
- Create: `src/api/anilistClient.js`
- Test: `src/api/anilistClient.test.js`

**Interfaces:**
- Produces: `anilistQuery(query: string, variables?: object): Promise<object>` — resolves to the GraphQL response's `data` field; throws `Error` on HTTP failure or GraphQL `errors`.

- [ ] **Step 1: Write the failing tests**

`src/api/anilistClient.test.js`:
```js
import { afterEach, describe, expect, it, vi } from 'vitest';
import { anilistQuery } from './anilistClient.js';

describe('anilistQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the data field on a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { Media: { id: 1 } } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const data = await anilistQuery('query { Media { id } }');

    expect(data).toEqual({ Media: { id: 1 } });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graphql.anilist.co',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws when the HTTP response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    );

    await expect(anilistQuery('query {}')).rejects.toThrow('statut 500');
  });

  it('throws when the response contains GraphQL errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ errors: [{ message: 'Invalid token' }] }),
      })
    );

    await expect(anilistQuery('query {}')).rejects.toThrow('Invalid token');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- anilistClient.test.js`
Expected: FAIL (`src/api/anilistClient.js` does not exist).

- [ ] **Step 3: Implement the client**

`src/api/anilistClient.js`:
```js
const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

export async function anilistQuery(query, variables = {}) {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`AniList a répondu avec le statut ${response.status}`);
  }

  const payload = await response.json();

  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors.map((error) => error.message).join(', '));
  }

  return payload.data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- anilistClient.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/anilistClient.js src/api/anilistClient.test.js
git commit -m "Add AniList GraphQL client"
```

---

## Task 3: AniList queries module

**Files:**
- Create: `src/api/queries.js`
- Test: `src/api/queries.test.js`

**Interfaces:**
- Consumes: `anilistQuery(query, variables)` from `src/api/anilistClient.js` (Task 2).
- Produces (all return `MediaSummary = { id, title, coverImage, genres, averageScore, seasonYear, format, studios }` unless noted):
  - `searchAnime(term: string): Promise<Array<MediaSummary>>` — cached per term.
  - `getAnimeDetails(id: number): Promise<MediaSummary & { description, tags, episodes, staff }>` — cached per id.
  - `getAnimeRecommendations(id: number): Promise<Array<{ rating: number, media: MediaSummary }>>`
  - `browseCatalogue({ page, perPage, genre, year, format, studio, sort }): Promise<{ media: Array<MediaSummary>, hasNextPage: boolean }>`
  - `clearQueryCache(): void` — test helper, clears the in-memory search/details cache.

- [ ] **Step 1: Write the failing tests**

`src/api/queries.test.js`:
```js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anilistQuery } from './anilistClient.js';
import {
  searchAnime,
  getAnimeDetails,
  getAnimeRecommendations,
  browseCatalogue,
  clearQueryCache,
} from './queries.js';

vi.mock('./anilistClient.js', () => ({
  anilistQuery: vi.fn(),
}));

const sampleMedia = {
  id: 21,
  title: { romaji: 'One Piece', english: 'One Piece' },
  coverImage: { large: 'https://img/one-piece.jpg' },
  genres: ['Action', 'Adventure'],
  averageScore: 88,
  seasonYear: 1999,
  format: 'TV',
  studios: { nodes: [{ name: 'Toei Animation' }] },
};

beforeEach(() => {
  anilistQuery.mockReset();
  clearQueryCache();
});

describe('searchAnime', () => {
  it('maps AniList media into MediaSummary objects', async () => {
    anilistQuery.mockResolvedValue({ Page: { media: [sampleMedia] } });

    const results = await searchAnime('One Piece');

    expect(anilistQuery).toHaveBeenCalledWith(expect.any(String), { search: 'One Piece' });
    expect(results).toEqual([
      {
        id: 21,
        title: 'One Piece',
        coverImage: 'https://img/one-piece.jpg',
        genres: ['Action', 'Adventure'],
        averageScore: 88,
        seasonYear: 1999,
        format: 'TV',
        studios: ['Toei Animation'],
      },
    ]);
  });

  it('caches results for the same search term', async () => {
    anilistQuery.mockResolvedValue({ Page: { media: [sampleMedia] } });

    await searchAnime('One Piece');
    await searchAnime('One Piece');

    expect(anilistQuery).toHaveBeenCalledTimes(1);
  });
});

describe('getAnimeDetails', () => {
  it('maps AniList media into a MediaDetail object', async () => {
    anilistQuery.mockResolvedValue({
      Media: {
        ...sampleMedia,
        description: 'A pirate adventure.',
        tags: [{ name: 'Pirates' }],
        episodes: 1000,
        staff: { edges: [{ role: 'Director', node: { name: { full: 'Eiichiro Oda' } } }] },
      },
    });

    const result = await getAnimeDetails(21);

    expect(result.description).toBe('A pirate adventure.');
    expect(result.tags).toEqual(['Pirates']);
    expect(result.episodes).toBe(1000);
    expect(result.staff).toEqual([{ role: 'Director', name: 'Eiichiro Oda' }]);
  });

  it('caches results for the same id', async () => {
    anilistQuery.mockResolvedValue({
      Media: { ...sampleMedia, description: '', tags: [], episodes: null, staff: { edges: [] } },
    });

    await getAnimeDetails(21);
    await getAnimeDetails(21);

    expect(anilistQuery).toHaveBeenCalledTimes(1);
  });
});

describe('getAnimeRecommendations', () => {
  it('maps recommendation nodes into rating/media pairs', async () => {
    anilistQuery.mockResolvedValue({
      Media: { recommendations: { nodes: [{ rating: 42, mediaRecommendation: sampleMedia }] } },
    });

    const result = await getAnimeRecommendations(21);

    expect(result).toEqual([{ rating: 42, media: expect.objectContaining({ id: 21 }) }]);
  });

  it('skips nodes with no mediaRecommendation', async () => {
    anilistQuery.mockResolvedValue({
      Media: { recommendations: { nodes: [{ rating: 10, mediaRecommendation: null }] } },
    });

    const result = await getAnimeRecommendations(21);

    expect(result).toEqual([]);
  });
});

describe('browseCatalogue', () => {
  it('returns mapped media and pagination info', async () => {
    anilistQuery.mockResolvedValue({
      Page: { pageInfo: { hasNextPage: true }, media: [sampleMedia] },
    });

    const result = await browseCatalogue({ page: 2, genre: 'Action' });

    expect(anilistQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ page: 2, genres: ['Action'] })
    );
    expect(result.hasNextPage).toBe(true);
    expect(result.media).toHaveLength(1);
  });

  it('filters by studio client-side when provided', async () => {
    anilistQuery.mockResolvedValue({
      Page: { pageInfo: { hasNextPage: false }, media: [sampleMedia] },
    });

    const result = await browseCatalogue({ studio: 'Madhouse' });

    expect(result.media).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- queries.test.js`
Expected: FAIL (`src/api/queries.js` does not exist).

- [ ] **Step 3: Implement the queries module**

`src/api/queries.js`:
```js
import { anilistQuery } from './anilistClient.js';

function mapMediaSummary(media) {
  return {
    id: media.id,
    title: media.title.english || media.title.romaji,
    coverImage: media.coverImage?.large ?? null,
    genres: media.genres ?? [],
    averageScore: media.averageScore ?? null,
    seasonYear: media.seasonYear ?? null,
    format: media.format ?? null,
    studios: (media.studios?.nodes ?? []).map((studio) => studio.name),
  };
}

const searchCache = new Map();
const detailsCache = new Map();

export function clearQueryCache() {
  searchCache.clear();
  detailsCache.clear();
}

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 10) {
      media(search: $search, type: ANIME, isAdult: false) {
        id
        title { romaji english }
        coverImage { large }
        genres
        averageScore
        seasonYear
        format
        studios { nodes { name } }
      }
    }
  }
`;

export async function searchAnime(term) {
  if (searchCache.has(term)) return searchCache.get(term);
  const data = await anilistQuery(SEARCH_QUERY, { search: term });
  const results = data.Page.media.map(mapMediaSummary);
  searchCache.set(term, results);
  return results;
}

const DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english }
      description(asHtml: false)
      coverImage { large }
      genres
      tags { name }
      studios { nodes { name } }
      averageScore
      seasonYear
      format
      episodes
      staff(perPage: 5) {
        edges { role node { name { full } } }
      }
    }
  }
`;

export async function getAnimeDetails(id) {
  if (detailsCache.has(id)) return detailsCache.get(id);
  const data = await anilistQuery(DETAILS_QUERY, { id });
  const media = data.Media;
  const result = {
    ...mapMediaSummary(media),
    description: media.description ?? '',
    tags: (media.tags ?? []).map((tag) => tag.name),
    episodes: media.episodes ?? null,
    staff: (media.staff?.edges ?? []).map((edge) => ({
      role: edge.role,
      name: edge.node.name.full,
    })),
  };
  detailsCache.set(id, result);
  return result;
}

const RECOMMENDATIONS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      recommendations(sort: RATING_DESC, perPage: 10) {
        nodes {
          rating
          mediaRecommendation {
            id
            title { romaji english }
            coverImage { large }
            genres
            averageScore
            seasonYear
            format
            studios { nodes { name } }
          }
        }
      }
    }
  }
`;

export async function getAnimeRecommendations(id) {
  const data = await anilistQuery(RECOMMENDATIONS_QUERY, { id });
  return (data.Media.recommendations.nodes ?? [])
    .filter((node) => node.mediaRecommendation)
    .map((node) => ({
      rating: node.rating ?? 0,
      media: mapMediaSummary(node.mediaRecommendation),
    }));
}

const CATALOGUE_QUERY = `
  query ($page: Int, $perPage: Int, $genres: [String], $year: Int, $format: MediaFormat, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(
        type: ANIME
        isAdult: false
        genre_in: $genres
        seasonYear: $year
        format: $format
        sort: $sort
      ) {
        id
        title { romaji english }
        coverImage { large }
        genres
        averageScore
        seasonYear
        format
        studios { nodes { name } }
      }
    }
  }
`;

export async function browseCatalogue({
  page = 1,
  perPage = 20,
  genre = null,
  year = null,
  format = null,
  studio = null,
  sort = ['POPULARITY_DESC'],
} = {}) {
  const data = await anilistQuery(CATALOGUE_QUERY, {
    page,
    perPage,
    genres: genre ? [genre] : null,
    year,
    format,
    sort,
  });
  let media = data.Page.media.map(mapMediaSummary);
  if (studio) {
    media = media.filter((item) => item.studios.includes(studio));
  }
  return {
    media,
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- queries.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/queries.js src/api/queries.test.js
git commit -m "Add AniList search, details, recommendations and catalogue queries"
```

---

## Task 4: localStorage list storage

**Files:**
- Create: `src/storage/listStorage.js`
- Test: `src/storage/listStorage.test.js`

**Interfaces:**
- Produces:
  - `STORAGE_KEY = 'animeAdvice.list'`
  - `getList(): Array<ListEntry>` — returns `[]` on missing or corrupted data.
  - `saveList(list: Array<ListEntry>): void`
  - `upsertAnime(entry: { animeId: number, [key]: any }): Array<ListEntry>` — creates a new entry with defaults if `animeId` is new, else merges fields into the existing entry. Returns the full updated list.
  - `removeAnime(animeId: number): Array<ListEntry>`
  - `ListEntry = { animeId, title, coverImage, genres, studios, seasonYear, status, note, excluded, watchedAt, comment, addedAt }`

- [ ] **Step 1: Write the failing tests**

`src/storage/listStorage.test.js`:
```js
import { beforeEach, describe, expect, it } from 'vitest';
import { getList, upsertAnime, removeAnime, STORAGE_KEY } from './listStorage.js';

describe('listStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty array when nothing is stored', () => {
    expect(getList()).toEqual([]);
  });

  it('returns an empty array when stored data is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(getList()).toEqual([]);
  });

  it('creates a new entry with defaults on first upsert', () => {
    const list = upsertAnime({ animeId: 21, title: 'One Piece', genres: ['Action'] });

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      animeId: 21,
      title: 'One Piece',
      genres: ['Action'],
      studios: [],
      seasonYear: null,
      status: 'a_voir',
      note: null,
      excluded: false,
      watchedAt: null,
      comment: '',
    });
    expect(list[0].addedAt).toBeTruthy();
  });

  it('merges fields into an existing entry on subsequent upsert', () => {
    upsertAnime({ animeId: 21, title: 'One Piece' });
    const list = upsertAnime({ animeId: 21, status: 'vu', note: 'coup_de_coeur' });

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ status: 'vu', note: 'coup_de_coeur', title: 'One Piece' });
  });

  it('removes an entry by animeId', () => {
    upsertAnime({ animeId: 21, title: 'One Piece' });
    const list = removeAnime(21);

    expect(list).toEqual([]);
  });

  it('persists across calls via localStorage', () => {
    upsertAnime({ animeId: 21, title: 'One Piece' });
    expect(getList()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- listStorage.test.js`
Expected: FAIL (`src/storage/listStorage.js` does not exist).

- [ ] **Step 3: Implement the storage module**

`src/storage/listStorage.js`:
```js
export const STORAGE_KEY = 'animeAdvice.list';

export function getList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Liste locale illisible, réinitialisation.', error);
    return [];
  }
}

export function saveList(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn('Impossible de sauvegarder la liste locale.', error);
  }
}

export function upsertAnime(entry) {
  const list = getList();
  const index = list.findIndex((item) => item.animeId === entry.animeId);

  if (index === -1) {
    const newEntry = {
      animeId: entry.animeId,
      title: entry.title ?? '',
      coverImage: entry.coverImage ?? null,
      genres: entry.genres ?? [],
      studios: entry.studios ?? [],
      seasonYear: entry.seasonYear ?? null,
      status: entry.status ?? 'a_voir',
      note: entry.note ?? null,
      excluded: entry.excluded ?? false,
      watchedAt: entry.watchedAt ?? null,
      comment: entry.comment ?? '',
      addedAt: new Date().toISOString(),
    };
    const updated = [...list, newEntry];
    saveList(updated);
    return updated;
  }

  const updated = [...list];
  updated[index] = { ...updated[index], ...entry };
  saveList(updated);
  return updated;
}

export function removeAnime(animeId) {
  const updated = getList().filter((item) => item.animeId !== animeId);
  saveList(updated);
  return updated;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- listStorage.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/listStorage.js src/storage/listStorage.test.js
git commit -m "Add localStorage-backed personal list storage"
```

---

## Task 5: Export/Import logic

**Files:**
- Create: `src/storage/exportImport.js`
- Test: `src/storage/exportImport.test.js`

**Interfaces:**
- Consumes: `ListEntry` shape from Task 4.
- Produces:
  - `serializeList(list: Array<ListEntry>): string`
  - `parseImportedList(jsonString: string): Array<ListEntry>` — throws `Error('Fichier invalide')` on bad JSON or malformed entries.
  - `mergeLists(currentList, importedList): { merged: Array<ListEntry>, conflicts: Array<{ animeId, existing, imported }> }`
  - `applyConflictResolutions(merged, conflicts, resolutions: { [animeId]: 'existing' | 'imported' }): Array<ListEntry>`

- [ ] **Step 1: Write the failing tests**

`src/storage/exportImport.test.js`:
```js
import { describe, expect, it } from 'vitest';
import {
  serializeList,
  parseImportedList,
  mergeLists,
  applyConflictResolutions,
} from './exportImport.js';

const entryA = {
  animeId: 1,
  title: 'A',
  status: 'vu',
  note: null,
  excluded: false,
  watchedAt: null,
  comment: '',
  addedAt: 't',
};
const entryB = {
  animeId: 2,
  title: 'B',
  status: 'a_voir',
  note: null,
  excluded: false,
  watchedAt: null,
  comment: '',
  addedAt: 't',
};

describe('serializeList / parseImportedList', () => {
  it('round-trips a list through JSON', () => {
    const json = serializeList([entryA]);
    expect(parseImportedList(json)).toEqual([entryA]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseImportedList('{not json')).toThrow('Fichier invalide');
  });

  it('throws when the JSON is not an array of valid entries', () => {
    expect(() => parseImportedList(JSON.stringify({ foo: 'bar' }))).toThrow('Fichier invalide');
  });
});

describe('mergeLists', () => {
  it('adds entries that only exist in the import', () => {
    const { merged, conflicts } = mergeLists([entryA], [entryB]);
    expect(merged).toEqual([entryA, entryB]);
    expect(conflicts).toEqual([]);
  });

  it('keeps identical entries without raising a conflict', () => {
    const { merged, conflicts } = mergeLists([entryA], [entryA]);
    expect(merged).toEqual([entryA]);
    expect(conflicts).toEqual([]);
  });

  it('reports a conflict when the same animeId differs', () => {
    const importedA = { ...entryA, status: 'a_voir' };
    const { merged, conflicts } = mergeLists([entryA], [importedA]);

    expect(conflicts).toEqual([{ animeId: 1, existing: entryA, imported: importedA }]);
    expect(merged).toEqual([entryA]);
  });
});

describe('applyConflictResolutions', () => {
  it('replaces entries where the resolution picks the imported version', () => {
    const importedA = { ...entryA, status: 'a_voir' };
    const { merged, conflicts } = mergeLists([entryA], [importedA]);

    const result = applyConflictResolutions(merged, conflicts, { 1: 'imported' });

    expect(result).toEqual([importedA]);
  });

  it('keeps the existing entry when the resolution picks existing', () => {
    const importedA = { ...entryA, status: 'a_voir' };
    const { merged, conflicts } = mergeLists([entryA], [importedA]);

    const result = applyConflictResolutions(merged, conflicts, { 1: 'existing' });

    expect(result).toEqual([entryA]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- exportImport.test.js`
Expected: FAIL (`src/storage/exportImport.js` does not exist).

- [ ] **Step 3: Implement the module**

`src/storage/exportImport.js`:
```js
function isValidEntry(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.animeId === 'number' &&
    typeof entry.title === 'string'
  );
}

export function serializeList(list) {
  return JSON.stringify(list, null, 2);
}

export function parseImportedList(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Fichier invalide');
  }

  if (!Array.isArray(parsed) || !parsed.every(isValidEntry)) {
    throw new Error('Fichier invalide');
  }

  return parsed;
}

export function mergeLists(currentList, importedList) {
  const merged = [...currentList];
  const conflicts = [];

  for (const imported of importedList) {
    const index = merged.findIndex((item) => item.animeId === imported.animeId);

    if (index === -1) {
      merged.push(imported);
      continue;
    }

    const existing = merged[index];
    if (JSON.stringify(existing) === JSON.stringify(imported)) {
      continue;
    }

    conflicts.push({ animeId: imported.animeId, existing, imported });
  }

  return { merged, conflicts };
}

export function applyConflictResolutions(merged, conflicts, resolutions) {
  return merged.map((entry) => {
    const conflict = conflicts.find((c) => c.animeId === entry.animeId);
    if (!conflict) return entry;

    const choice = resolutions[entry.animeId];
    return choice === 'imported' ? conflict.imported : conflict.existing;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- exportImport.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/exportImport.js src/storage/exportImport.test.js
git commit -m "Add list export/import with conflict detection"
```

---

## Task 6: Recommendation scoring

**Files:**
- Create: `src/recommend/scoring.js`
- Test: `src/recommend/scoring.test.js`

**Interfaces:**
- Consumes: `MediaSummary` shape from Task 3.
- Produces: `scoreCandidate(candidate: MediaSummary, baseList: Array<MediaSummary>, favoritesList: Array<MediaSummary> = []): number`
  - Weights: genre overlap ×2, studio overlap ×3 per base anime; favorites overlap at a smaller bonus (genre ×1, studio ×1.5).

- [ ] **Step 1: Write the failing tests**

`src/recommend/scoring.test.js`:
```js
import { describe, expect, it } from 'vitest';
import { scoreCandidate } from './scoring.js';

const base = { id: 1, genres: ['Action', 'Fantasy'], studios: ['Ufotable'] };
const favorite = { id: 2, genres: ['Fantasy'], studios: ['Ufotable'] };

describe('scoreCandidate', () => {
  it('scores zero when there is no overlap', () => {
    const candidate = { id: 3, genres: ['Romance'], studios: ['Kyoto Animation'] };
    expect(scoreCandidate(candidate, [base])).toBe(0);
  });

  it('adds weighted points for genre and studio overlap with the base list', () => {
    const candidate = { id: 3, genres: ['Action'], studios: ['Ufotable'] };
    expect(scoreCandidate(candidate, [base])).toBe(5); // 1*2 + 1*3
  });

  it('adds a smaller bonus for overlap with the favorites list', () => {
    const candidate = { id: 3, genres: ['Fantasy'], studios: [] };
    expect(scoreCandidate(candidate, [base], [favorite])).toBe(3); // base: 1*2, favorite: 1*1
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- scoring.test.js`
Expected: FAIL (`src/recommend/scoring.js` does not exist).

- [ ] **Step 3: Implement the scoring function**

`src/recommend/scoring.js`:
```js
const WEIGHTS = {
  genre: 2,
  studio: 3,
  favoriteGenre: 1,
  favoriteStudio: 1.5,
};

function countOverlap(a = [], b = []) {
  const setB = new Set(b);
  return a.filter((item) => setB.has(item)).length;
}

export function scoreCandidate(candidate, baseList = [], favoritesList = []) {
  let score = 0;

  for (const base of baseList) {
    score += countOverlap(candidate.genres, base.genres) * WEIGHTS.genre;
    score += countOverlap(candidate.studios, base.studios) * WEIGHTS.studio;
  }

  for (const favorite of favoritesList) {
    score += countOverlap(candidate.genres, favorite.genres) * WEIGHTS.favoriteGenre;
    score += countOverlap(candidate.studios, favorite.studios) * WEIGHTS.favoriteStudio;
  }

  return score;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- scoring.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/recommend/scoring.js src/recommend/scoring.test.js
git commit -m "Add genre/studio overlap scoring for recommendations"
```

---

## Task 7: Candidate pool builder

**Files:**
- Create: `src/recommend/buildPool.js`
- Test: `src/recommend/buildPool.test.js`

**Interfaces:**
- Consumes: `scoreCandidate` from `src/recommend/scoring.js` (Task 6).
- Produces: `buildCandidatePool({ baseList: Array<MediaSummary>, recommendationNodes: Array<{ rating: number, media: MediaSummary }>, favoritesList?: Array<MediaSummary>, excludeIds?: Array<number> }): Array<{ media: MediaSummary, score: number }>`
  - Sorted descending by score, deduplicated by `media.id`, capped at 20 entries, excludes anything in `excludeIds` or `baseList`.

- [ ] **Step 1: Write the failing tests**

`src/recommend/buildPool.test.js`:
```js
import { describe, expect, it } from 'vitest';
import { buildCandidatePool } from './buildPool.js';

const base = { id: 1, genres: ['Action'], studios: ['Ufotable'] };
const candidateA = { id: 2, genres: ['Action'], studios: ['Ufotable'] };
const candidateB = { id: 3, genres: ['Romance'], studios: [] };
const alreadySeen = { id: 4, genres: ['Action'], studios: ['Ufotable'] };

describe('buildCandidatePool', () => {
  it('scores and sorts candidates by relevance', () => {
    const pool = buildCandidatePool({
      baseList: [base],
      recommendationNodes: [
        { rating: 10, media: candidateA },
        { rating: 5, media: candidateB },
      ],
    });

    expect(pool.map((entry) => entry.media.id)).toEqual([2, 3]);
  });

  it('excludes ids already in the base list or explicitly excluded', () => {
    const pool = buildCandidatePool({
      baseList: [base],
      recommendationNodes: [
        { rating: 10, media: base },
        { rating: 10, media: alreadySeen },
      ],
      excludeIds: [4],
    });

    expect(pool).toEqual([]);
  });

  it('deduplicates candidates recommended by multiple base anime, keeping the higher score', () => {
    const pool = buildCandidatePool({
      baseList: [base],
      recommendationNodes: [
        { rating: 0, media: candidateA },
        { rating: 50, media: candidateA },
      ],
    });

    expect(pool).toHaveLength(1);
    expect(pool[0].score).toBeCloseTo(10); // genre(2)+studio(3) + rating(50)*0.1
  });

  it('caps the pool at 20 entries', () => {
    const nodes = Array.from({ length: 30 }, (_, i) => ({
      rating: i,
      media: { id: 100 + i, genres: [], studios: [] },
    }));

    const pool = buildCandidatePool({ baseList: [], recommendationNodes: nodes });

    expect(pool).toHaveLength(20);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- buildPool.test.js`
Expected: FAIL (`src/recommend/buildPool.js` does not exist).

- [ ] **Step 3: Implement the pool builder**

`src/recommend/buildPool.js`:
```js
import { scoreCandidate } from './scoring.js';

const POOL_SIZE = 20;
const RATING_WEIGHT = 0.1;

export function buildCandidatePool({ baseList, recommendationNodes, favoritesList = [], excludeIds = [] }) {
  const excluded = new Set([...excludeIds, ...baseList.map((media) => media.id)]);
  const byId = new Map();

  for (const node of recommendationNodes) {
    const { media, rating } = node;
    if (excluded.has(media.id)) continue;

    const score = scoreCandidate(media, baseList, favoritesList) + rating * RATING_WEIGHT;

    if (!byId.has(media.id) || byId.get(media.id).score < score) {
      byId.set(media.id, { media, score });
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, POOL_SIZE);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- buildPool.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/recommend/buildPool.js src/recommend/buildPool.test.js
git commit -m "Add candidate pool builder for recommendations"
```

---

## Task 8: Weighted random picker

**Files:**
- Create: `src/recommend/pickResults.js`
- Test: `src/recommend/pickResults.test.js`

**Interfaces:**
- Consumes: pool shape `Array<{ media: MediaSummary, score: number }>` from Task 7.
- Produces: `pickWeighted(pool, count: number, excludeIds?: Array<number>, rng?: () => number): { picked: Array<{media, score}>, exhausted: boolean }`
  - Weighted random sample without replacement; `exhausted: true` when fewer than `count` candidates remain after excluding `excludeIds`.

- [ ] **Step 1: Write the failing tests**

`src/recommend/pickResults.test.js`:
```js
import { describe, expect, it } from 'vitest';
import { pickWeighted } from './pickResults.js';

const pool = [
  { media: { id: 1 }, score: 10 },
  { media: { id: 2 }, score: 5 },
  { media: { id: 3 }, score: 1 },
];

describe('pickWeighted', () => {
  it('picks the requested count when enough candidates are available', () => {
    const { picked, exhausted } = pickWeighted(pool, 2, [], () => 0);
    expect(picked).toHaveLength(2);
    expect(exhausted).toBe(false);
  });

  it('excludes ids already shown', () => {
    const { picked } = pickWeighted(pool, 3, [1], () => 0);
    expect(picked.map((entry) => entry.media.id)).not.toContain(1);
  });

  it('reports exhausted when fewer candidates remain than requested', () => {
    const { picked, exhausted } = pickWeighted(pool, 5, [], () => 0);
    expect(picked).toHaveLength(3);
    expect(exhausted).toBe(true);
  });

  it('never returns duplicate entries', () => {
    const { picked } = pickWeighted(pool, 3, [], () => 0.999);
    const ids = picked.map((entry) => entry.media.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- pickResults.test.js`
Expected: FAIL (`src/recommend/pickResults.js` does not exist).

- [ ] **Step 3: Implement the picker**

`src/recommend/pickResults.js`:
```js
function weightOf(entry) {
  return entry.score + 1; // avoid zero-weight entries never being picked
}

function pickOne(available, rng) {
  const totalWeight = available.reduce((sum, entry) => sum + weightOf(entry), 0);
  let threshold = rng() * totalWeight;

  for (let i = 0; i < available.length; i += 1) {
    threshold -= weightOf(available[i]);
    if (threshold <= 0) return i;
  }

  return available.length - 1;
}

export function pickWeighted(pool, count, excludeIds = [], rng = Math.random) {
  const excluded = new Set(excludeIds);
  const available = pool.filter((entry) => !excluded.has(entry.media.id));

  const picked = [];
  const remaining = [...available];

  while (picked.length < count && remaining.length > 0) {
    const index = pickOne(remaining, rng);
    picked.push(remaining[index]);
    remaining.splice(index, 1);
  }

  return { picked, exhausted: picked.length < count };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- pickResults.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/recommend/pickResults.js src/recommend/pickResults.test.js
git commit -m "Add weighted random result picker"
```

---

## Task 9: Recommendation data orchestration

**Files:**
- Create: `src/recommend/fetchRecommendationData.js`
- Test: `src/recommend/fetchRecommendationData.test.js`

**Interfaces:**
- Consumes: `getAnimeDetails`, `getAnimeRecommendations` (`src/api/queries.js`, Task 3); `buildCandidatePool` (Task 7); `getList` (`src/storage/listStorage.js`, Task 4).
- Produces: `fetchRecommendationData(baseAnimeIds: Array<number>): Promise<{ pool: Array<{media, score}>, baseList: Array<MediaSummary> }>` — throws `Error('base_vide')` when `baseAnimeIds` is empty.

- [ ] **Step 1: Write the failing tests**

`src/recommend/fetchRecommendationData.test.js`:
```js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRecommendationData } from './fetchRecommendationData.js';
import { getAnimeDetails, getAnimeRecommendations } from '../api/queries.js';
import { getList } from '../storage/listStorage.js';

vi.mock('../api/queries.js', () => ({
  getAnimeDetails: vi.fn(),
  getAnimeRecommendations: vi.fn(),
}));

vi.mock('../storage/listStorage.js', () => ({
  getList: vi.fn(),
}));

const baseMedia = { id: 1, genres: ['Action'], studios: ['Ufotable'] };
const recommended = { id: 2, genres: ['Action'], studios: ['Ufotable'] };
const seenMedia = { id: 3, genres: [], studios: [] };

describe('fetchRecommendationData', () => {
  beforeEach(() => {
    getAnimeDetails.mockReset();
    getAnimeRecommendations.mockReset();
    getList.mockReset();
  });

  it('throws base_vide when no base anime ids are given', async () => {
    await expect(fetchRecommendationData([])).rejects.toThrow('base_vide');
  });

  it('builds a pool excluding already-seen and excluded local entries', async () => {
    getAnimeDetails.mockResolvedValue(baseMedia);
    getAnimeRecommendations.mockResolvedValue([
      { rating: 10, media: recommended },
      { rating: 10, media: seenMedia },
    ]);
    getList.mockReturnValue([{ animeId: 3, status: 'vu', note: null, excluded: false }]);

    const { pool, baseList } = await fetchRecommendationData([1]);

    expect(baseList).toEqual([baseMedia]);
    expect(pool.map((entry) => entry.media.id)).toEqual([2]);
  });

  it('fetches details for up to 10 favorites to use as a scoring bonus', async () => {
    getAnimeDetails.mockImplementation((id) =>
      Promise.resolve(id === 1 ? baseMedia : { id, genres: ['Action'], studios: [] })
    );
    getAnimeRecommendations.mockResolvedValue([{ rating: 0, media: recommended }]);
    getList.mockReturnValue([
      { animeId: 5, status: 'vu', note: 'coup_de_coeur', excluded: false },
    ]);

    await fetchRecommendationData([1]);

    expect(getAnimeDetails).toHaveBeenCalledWith(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- fetchRecommendationData.test.js`
Expected: FAIL (`src/recommend/fetchRecommendationData.js` does not exist).

- [ ] **Step 3: Implement the orchestration function**

`src/recommend/fetchRecommendationData.js`:
```js
import { getAnimeDetails, getAnimeRecommendations } from '../api/queries.js';
import { buildCandidatePool } from './buildPool.js';
import { getList } from '../storage/listStorage.js';

const MAX_FAVORITES_FOR_SCORING = 10;

export async function fetchRecommendationData(baseAnimeIds) {
  if (!baseAnimeIds || baseAnimeIds.length === 0) {
    throw new Error('base_vide');
  }

  const baseList = await Promise.all(baseAnimeIds.map((id) => getAnimeDetails(id)));
  const recommendationLists = await Promise.all(
    baseAnimeIds.map((id) => getAnimeRecommendations(id))
  );
  const recommendationNodes = recommendationLists.flat();

  const localList = getList();
  const excludeIds = localList
    .filter((entry) => entry.status === 'vu' || entry.excluded)
    .map((entry) => entry.animeId);

  const favoriteIds = localList
    .filter((entry) => entry.note === 'coup_de_coeur' && !baseAnimeIds.includes(entry.animeId))
    .map((entry) => entry.animeId)
    .slice(0, MAX_FAVORITES_FOR_SCORING);
  const favoritesList = await Promise.all(favoriteIds.map((id) => getAnimeDetails(id)));

  const pool = buildCandidatePool({ baseList, recommendationNodes, favoritesList, excludeIds });

  return { pool, baseList };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- fetchRecommendationData.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/recommend/fetchRecommendationData.js src/recommend/fetchRecommendationData.test.js
git commit -m "Orchestrate AniList fetches into a scored recommendation pool"
```

---

## Task 10: AnimeCard component

**Files:**
- Create: `src/components/AnimeCard.jsx`
- Test: `src/components/AnimeCard.test.jsx`

**Interfaces:**
- Consumes: `MediaSummary` (Task 3), `ListEntry` (Task 4, optional).
- Props: `{ anime: MediaSummary, listEntry?: ListEntry|null, onAddSeen?: (anime) => void, onExclude?: (anime) => void, onClick?: (anime) => void }`

- [ ] **Step 1: Write the failing tests**

`src/components/AnimeCard.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AnimeCard from './AnimeCard.jsx';

const anime = { id: 1, title: 'One Piece', coverImage: null, genres: ['Action', 'Adventure'] };

describe('AnimeCard', () => {
  it('renders the title and genres', () => {
    render(<AnimeCard anime={anime} />);
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.getByText('Action, Adventure')).toBeInTheDocument();
  });

  it('shows a status badge when a list entry is provided', () => {
    render(<AnimeCard anime={anime} listEntry={{ status: 'vu', note: 'coup_de_coeur', excluded: false }} />);
    expect(screen.getByText('Vu · coup_de_coeur')).toBeInTheDocument();
  });

  it('calls onClick with the anime when the cover is clicked', async () => {
    const onClick = vi.fn();
    render(<AnimeCard anime={anime} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: /One Piece/ }));
    expect(onClick).toHaveBeenCalledWith(anime);
  });

  it('calls onAddSeen when the "Déjà vu" button is clicked', async () => {
    const onAddSeen = vi.fn();
    render(<AnimeCard anime={anime} onAddSeen={onAddSeen} />);
    await userEvent.click(screen.getByRole('button', { name: 'Déjà vu' }));
    expect(onAddSeen).toHaveBeenCalledWith(anime);
  });

  it('calls onExclude when the "Ne plus recommander" button is clicked', async () => {
    const onExclude = vi.fn();
    render(<AnimeCard anime={anime} onExclude={onExclude} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ne plus recommander' }));
    expect(onExclude).toHaveBeenCalledWith(anime);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- AnimeCard.test.jsx`
Expected: FAIL (`src/components/AnimeCard.jsx` does not exist).

- [ ] **Step 3: Implement the component**

`src/components/AnimeCard.jsx`:
```jsx
function badgeLabel(listEntry) {
  if (!listEntry) return null;
  if (listEntry.excluded) return 'Exclu';
  if (listEntry.status === 'vu') return listEntry.note ? `Vu · ${listEntry.note}` : 'Vu';
  return 'À voir';
}

function AnimeCard({ anime, listEntry = null, onAddSeen, onExclude, onClick }) {
  const badge = badgeLabel(listEntry);

  return (
    <article className="anime-card">
      <button type="button" className="anime-card__cover" onClick={() => onClick?.(anime)}>
        {anime.coverImage && <img src={anime.coverImage} alt={anime.title} />}
        <h3>{anime.title}</h3>
      </button>
      {badge && <span className="anime-card__badge">{badge}</span>}
      <p>{(anime.genres ?? []).join(', ')}</p>
      <div className="anime-card__actions">
        {onAddSeen && (
          <button type="button" onClick={() => onAddSeen(anime)}>
            Déjà vu
          </button>
        )}
        {onExclude && (
          <button type="button" onClick={() => onExclude(anime)}>
            Ne plus recommander
          </button>
        )}
      </div>
    </article>
  );
}

export default AnimeCard;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- AnimeCard.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/AnimeCard.jsx src/components/AnimeCard.test.jsx
git commit -m "Add AnimeCard component"
```

---

## Task 11: SearchBar component

**Files:**
- Create: `src/components/SearchBar.jsx`
- Test: `src/components/SearchBar.test.jsx`

**Interfaces:**
- Consumes: `searchAnime` from `src/api/queries.js` (Task 3).
- Props: `{ onSelect: (anime: MediaSummary) => void }`

- [ ] **Step 1: Write the failing tests**

`src/components/SearchBar.test.jsx`:
```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchBar from './SearchBar.jsx';
import { searchAnime } from '../api/queries.js';

vi.mock('../api/queries.js', () => ({
  searchAnime: vi.fn(),
}));

describe('SearchBar', () => {
  beforeEach(() => {
    searchAnime.mockReset();
  });

  it('shows matching results after the user types', async () => {
    searchAnime.mockResolvedValue([{ id: 1, title: 'One Piece' }]);
    const user = userEvent.setup();

    render(<SearchBar onSelect={() => {}} />);
    await user.type(screen.getByLabelText('Rechercher un anime'), 'One Piece');

    await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument());
    expect(searchAnime).toHaveBeenCalledWith('One Piece');
  });

  it('calls onSelect with the chosen anime', async () => {
    searchAnime.mockResolvedValue([{ id: 1, title: 'One Piece' }]);
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSelect={onSelect} />);
    await user.type(screen.getByLabelText('Rechercher un anime'), 'One Piece');
    await waitFor(() => screen.getByText('One Piece'));
    await user.click(screen.getByRole('button', { name: 'One Piece' }));

    expect(onSelect).toHaveBeenCalledWith({ id: 1, title: 'One Piece' });
  });

  it('shows an error message when the search fails', async () => {
    searchAnime.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();

    render(<SearchBar onSelect={() => {}} />);
    await user.type(screen.getByLabelText('Rechercher un anime'), 'One Piece');

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('shows a no-results message when nothing matches', async () => {
    searchAnime.mockResolvedValue([]);
    const user = userEvent.setup();

    render(<SearchBar onSelect={() => {}} />);
    await user.type(screen.getByLabelText('Rechercher un anime'), 'Zzz');

    await waitFor(() => expect(screen.getByText('Aucun anime trouvé.')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- SearchBar.test.jsx`
Expected: FAIL (`src/components/SearchBar.jsx` does not exist).

- [ ] **Step 3: Implement the component**

`src/components/SearchBar.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { searchAnime } from '../api/queries.js';

const DEBOUNCE_MS = 300;

function SearchBar({ onSelect }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error

  useEffect(() => {
    if (term.trim().length === 0) {
      setResults([]);
      setStatus('idle');
      return undefined;
    }

    setStatus('loading');
    const timeoutId = setTimeout(async () => {
      try {
        const data = await searchAnime(term);
        setResults(data);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [term]);

  return (
    <div className="search-bar">
      <input
        type="text"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Rechercher un anime..."
        aria-label="Rechercher un anime"
      />
      {status === 'error' && <p role="alert">Recherche indisponible, réessaie plus tard.</p>}
      {status === 'idle' && term.trim().length > 0 && results.length === 0 && (
        <p>Aucun anime trouvé.</p>
      )}
      <ul>
        {results.map((anime) => (
          <li key={anime.id}>
            <button type="button" onClick={() => onSelect(anime)}>
              {anime.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SearchBar;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- SearchBar.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SearchBar.jsx src/components/SearchBar.test.jsx
git commit -m "Add debounced anime SearchBar component"
```

---

## Task 12: Home page (recommendation screen)

**Files:**
- Create: `src/pages/Home.jsx`
- Test: `src/pages/Home.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `SearchBar` (Task 11), `AnimeCard` (Task 10), `fetchRecommendationData` (Task 9), `pickWeighted` (Task 8), `getList`, `upsertAnime` (Task 4), `useNavigate` from `react-router-dom`.

- [ ] **Step 1: Write the failing tests**

`src/pages/Home.test.jsx`:
```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home.jsx';
import { fetchRecommendationData } from '../recommend/fetchRecommendationData.js';
import { getList, upsertAnime } from '../storage/listStorage.js';
import { searchAnime } from '../api/queries.js';

vi.mock('../recommend/fetchRecommendationData.js', () => ({
  fetchRecommendationData: vi.fn(),
}));
vi.mock('../storage/listStorage.js', () => ({
  getList: vi.fn(() => []),
  upsertAnime: vi.fn(),
}));
vi.mock('../api/queries.js', () => ({
  searchAnime: vi.fn(),
}));

const candidate = { id: 2, title: 'Tsukihime', genres: [], studios: [], coverImage: null };

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe('Home', () => {
  beforeEach(() => {
    fetchRecommendationData.mockReset();
    getList.mockReset().mockReturnValue([]);
    upsertAnime.mockReset();
    searchAnime.mockReset();
  });

  it('shows the empty-base message for "Selon mes vus" when nothing is marked seen', async () => {
    fetchRecommendationData.mockRejectedValue(new Error('base_vide'));
    const user = userEvent.setup();

    renderHome();
    await user.click(screen.getByRole('button', { name: 'Selon mes vus' }));

    await waitFor(() =>
      expect(screen.getByText("Ajoute d'abord des animes à ta liste pour ce mode.")).toBeInTheDocument()
    );
  });

  it('renders recommendation results after a manual search', async () => {
    searchAnime.mockResolvedValue([{ id: 1, title: 'Fate/stay night', genres: [], studios: [] }]);
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [{ id: 1, genres: [], studios: [] }],
    });
    const user = userEvent.setup();

    renderHome();
    await user.type(screen.getByLabelText('Rechercher un anime'), 'Fate');
    await waitFor(() => screen.getByText('Fate/stay night'));
    await user.click(screen.getByRole('button', { name: 'Fate/stay night' }));
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));

    await waitFor(() => expect(screen.getByText('Tsukihime')).toBeInTheDocument());
  });

  it('marks a result as seen via the quick action', async () => {
    fetchRecommendationData.mockResolvedValue({ pool: [{ media: candidate, score: 10 }], baseList: [] });
    getList.mockReturnValue([{ animeId: 1, status: 'vu' }]);
    const user = userEvent.setup();

    renderHome();
    await user.click(screen.getByRole('button', { name: 'Selon mes vus' }));
    await waitFor(() => screen.getByText('Tsukihime'));
    await user.click(screen.getByRole('button', { name: 'Déjà vu' }));

    expect(upsertAnime).toHaveBeenCalledWith(expect.objectContaining({ animeId: 2, status: 'vu' }));
  });

  it('shows a retry button and re-runs the last search when a fetch fails', async () => {
    fetchRecommendationData
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ pool: [{ media: candidate, score: 10 }], baseList: [] });
    getList.mockReturnValue([{ animeId: 1, status: 'vu' }]);
    const user = userEvent.setup();

    renderHome();
    await user.click(screen.getByRole('button', { name: 'Selon mes vus' }));
    await waitFor(() => screen.getByRole('alert'));
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    await waitFor(() => expect(screen.getByText('Tsukihime')).toBeInTheDocument());
    expect(fetchRecommendationData).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- Home.test.jsx`
Expected: FAIL (`src/pages/Home.jsx` does not exist).

- [ ] **Step 3: Implement the Home page**

`src/pages/Home.jsx`:
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import AnimeCard from '../components/AnimeCard.jsx';
import { fetchRecommendationData } from '../recommend/fetchRecommendationData.js';
import { pickWeighted } from '../recommend/pickResults.js';
import { getList, upsertAnime } from '../storage/listStorage.js';

function Home() {
  const navigate = useNavigate();
  const [baseAnimes, setBaseAnimes] = useState([]);
  const [pool, setPool] = useState([]);
  const [shownIds, setShownIds] = useState([]);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [lastBaseIds, setLastBaseIds] = useState([]);

  function addBaseAnime(anime) {
    setBaseAnimes((prev) => (prev.some((a) => a.id === anime.id) ? prev : [...prev, anime]));
  }

  async function runRecommendation(baseAnimeIds) {
    setLastBaseIds(baseAnimeIds);
    setStatus('loading');
    try {
      const { pool: newPool } = await fetchRecommendationData(baseAnimeIds);
      const { picked } = pickWeighted(newPool, 5);
      setPool(newPool);
      setShownIds(picked.map((entry) => entry.media.id));
      setResults(picked);
      setStatus('idle');
    } catch (error) {
      setStatus(error.message === 'base_vide' ? 'empty_base' : 'error');
    }
  }

  function handleManualRecommend() {
    runRecommendation(baseAnimes.map((anime) => anime.id));
  }

  function handleFromSeen() {
    const ids = getList()
      .filter((entry) => entry.status === 'vu')
      .map((entry) => entry.animeId);
    runRecommendation(ids);
  }

  function handleFromFavorites() {
    const ids = getList()
      .filter((entry) => entry.note === 'coup_de_coeur')
      .map((entry) => entry.animeId);
    runRecommendation(ids);
  }

  function handleSeeMore() {
    const { picked, exhausted } = pickWeighted(pool, 5, shownIds);
    setShownIds((prev) => [...prev, ...picked.map((entry) => entry.media.id)]);
    setResults(picked);
    setStatus(exhausted ? 'exhausted' : 'idle');
  }

  function handleAddSeen(anime) {
    upsertAnime({
      animeId: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      genres: anime.genres,
      studios: anime.studios,
      seasonYear: anime.seasonYear,
      status: 'vu',
    });
  }

  function handleExclude(anime) {
    upsertAnime({
      animeId: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      genres: anime.genres,
      studios: anime.studios,
      seasonYear: anime.seasonYear,
      excluded: true,
    });
  }

  return (
    <section>
      <h2>Recommandation</h2>
      <SearchBar onSelect={addBaseAnime} />
      <ul>
        {baseAnimes.map((anime) => (
          <li key={anime.id}>{anime.title}</li>
        ))}
      </ul>
      <button type="button" onClick={handleManualRecommend} disabled={baseAnimes.length === 0}>
        Me conseiller un anime
      </button>
      <button type="button" onClick={handleFromSeen}>
        Selon mes vus
      </button>
      <button type="button" onClick={handleFromFavorites}>
        Selon mes coups de cœur
      </button>

      {status === 'loading' && <p>Recherche de suggestions...</p>}
      {status === 'empty_base' && <p>Ajoute d'abord des animes à ta liste pour ce mode.</p>}
      {status === 'error' && (
        <p role="alert">
          Impossible de contacter AniList, réessaie plus tard.{' '}
          <button type="button" onClick={() => runRecommendation(lastBaseIds)}>
            Réessayer
          </button>
        </p>
      )}

      <div className="results-grid">
        {results.map((entry) => (
          <AnimeCard
            key={entry.media.id}
            anime={entry.media}
            onAddSeen={handleAddSeen}
            onExclude={handleExclude}
            onClick={(anime) => navigate(`/anime/${anime.id}`)}
          />
        ))}
      </div>

      {results.length > 0 && status !== 'exhausted' && (
        <button type="button" onClick={handleSeeMore}>
          Voir d'autres
        </button>
      )}
      {status === 'exhausted' && <p>Plus de suggestions dans ce lot, relance une recherche.</p>}
    </section>
  );
}

export default Home;
```

Update `src/App.jsx` to route `Home` at `/`:
```jsx
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';

function App() {
  return (
    <HashRouter>
      <header>
        <h1>AnimeAdvice</h1>
        <nav>
          <Link to="/">Accueil</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </HashRouter>
  );
}

export default App;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- Home.test.jsx App.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.jsx src/pages/Home.test.jsx src/App.jsx
git commit -m "Add Home recommendation page"
```

---

## Task 13: Catalogue page

**Files:**
- Create: `src/pages/Catalogue.jsx`
- Test: `src/pages/Catalogue.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `browseCatalogue` (Task 3), `AnimeCard` (Task 10), `getList` (Task 4).

- [ ] **Step 1: Write the failing tests**

`src/pages/Catalogue.test.jsx`:
```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Catalogue from './Catalogue.jsx';
import { browseCatalogue } from '../api/queries.js';
import { getList } from '../storage/listStorage.js';

vi.mock('../api/queries.js', () => ({
  browseCatalogue: vi.fn(),
}));
vi.mock('../storage/listStorage.js', () => ({
  getList: vi.fn(() => []),
}));

function renderCatalogue() {
  return render(
    <MemoryRouter>
      <Catalogue />
    </MemoryRouter>
  );
}

describe('Catalogue', () => {
  beforeEach(() => {
    browseCatalogue.mockReset();
    getList.mockReset().mockReturnValue([]);
  });

  it('loads and displays the first page on mount', async () => {
    browseCatalogue.mockResolvedValue({
      media: [{ id: 1, title: 'One Piece', genres: [], studios: [] }],
      hasNextPage: true,
    });

    renderCatalogue();

    await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument());
    expect(browseCatalogue).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('appends the next page when "Charger plus" is clicked', async () => {
    browseCatalogue
      .mockResolvedValueOnce({ media: [{ id: 1, title: 'One Piece', genres: [], studios: [] }], hasNextPage: true })
      .mockResolvedValueOnce({ media: [{ id: 2, title: 'Naruto', genres: [], studios: [] }], hasNextPage: false });
    const user = userEvent.setup();

    renderCatalogue();
    await waitFor(() => screen.getByText('One Piece'));
    await user.click(screen.getByRole('button', { name: 'Charger plus' }));

    await waitFor(() => expect(screen.getByText('Naruto')).toBeInTheDocument());
    expect(screen.getByText('One Piece')).toBeInTheDocument();
  });

  it('shows an empty state when no anime match the filters', async () => {
    browseCatalogue.mockResolvedValue({ media: [], hasNextPage: false });

    renderCatalogue();

    await waitFor(() => expect(screen.getByText('Aucun anime trouvé.')).toBeInTheDocument());
  });

  it('shows an error state with a retry button when the request fails', async () => {
    browseCatalogue.mockRejectedValueOnce(new Error('network'));
    browseCatalogue.mockResolvedValueOnce({
      media: [{ id: 1, title: 'One Piece', genres: [], studios: [] }],
      hasNextPage: false,
    });
    const user = userEvent.setup();

    renderCatalogue();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- Catalogue.test.jsx`
Expected: FAIL (`src/pages/Catalogue.jsx` does not exist).

- [ ] **Step 3: Implement the Catalogue page**

`src/pages/Catalogue.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard.jsx';
import { browseCatalogue } from '../api/queries.js';
import { getList } from '../storage/listStorage.js';

const SORT_OPTIONS = [
  { value: 'POPULARITY_DESC', label: 'Popularité' },
  { value: 'SCORE_DESC', label: 'Score' },
  { value: 'START_DATE_DESC', label: 'Année' },
  { value: 'TITLE_ROMAJI', label: 'Titre' },
];

function Catalogue() {
  const navigate = useNavigate();
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [sort, setSort] = useState('POPULARITY_DESC');
  const [page, setPage] = useState(1);
  const [media, setMedia] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [status, setStatus] = useState('idle');

  async function loadPage(targetPage, replace) {
    setStatus('loading');
    try {
      const result = await browseCatalogue({
        page: targetPage,
        genre: genre || null,
        year: year ? Number(year) : null,
        sort: [sort],
      });
      setMedia((prev) => (replace ? result.media : [...prev, ...result.media]));
      setHasNextPage(result.hasNextPage);
      setStatus(result.media.length === 0 && replace ? 'empty' : 'idle');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    setPage(1);
    loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, year, sort]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage, false);
  }

  const localList = getList();
  function findListEntry(animeId) {
    return localList.find((entry) => entry.animeId === animeId) ?? null;
  }

  return (
    <section>
      <h2>Catalogue</h2>
      <div className="catalogue-filters">
        <input
          type="text"
          placeholder="Genre (ex: Action)"
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
          aria-label="Filtrer par genre"
        />
        <input
          type="number"
          placeholder="Année"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          aria-label="Filtrer par année"
        />
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Trier par">
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {status === 'error' && (
        <p role="alert">
          Impossible de charger le catalogue, réessaie plus tard.{' '}
          <button type="button" onClick={() => loadPage(page, page === 1)}>
            Réessayer
          </button>
        </p>
      )}
      {status === 'empty' && <p>Aucun anime trouvé.</p>}

      <div className="results-grid">
        {media.map((anime) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            listEntry={findListEntry(anime.id)}
            onClick={(item) => navigate(`/anime/${item.id}`)}
          />
        ))}
      </div>

      {hasNextPage && (
        <button type="button" onClick={handleLoadMore} disabled={status === 'loading'}>
          Charger plus
        </button>
      )}
    </section>
  );
}

export default Catalogue;
```

Update `src/App.jsx` to add the Catalogue route:
```jsx
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Catalogue from './pages/Catalogue.jsx';

function App() {
  return (
    <HashRouter>
      <header>
        <h1>AnimeAdvice</h1>
        <nav>
          <Link to="/">Accueil</Link>
          <Link to="/catalogue">Catalogue</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogue" element={<Catalogue />} />
        </Routes>
      </main>
    </HashRouter>
  );
}

export default App;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- Catalogue.test.jsx App.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Catalogue.jsx src/pages/Catalogue.test.jsx src/App.jsx
git commit -m "Add Catalogue browsing page"
```

---

## Task 14: Ma liste page, conflict dialog, export/import

**Files:**
- Create: `src/components/ConflictDialog.jsx`
- Test: `src/components/ConflictDialog.test.jsx`
- Create: `src/pages/MyList.jsx`
- Test: `src/pages/MyList.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- `ConflictDialog` props: `{ conflicts: Array<{animeId, existing, imported}>, onResolve: (resolutions: {[animeId]: 'existing'|'imported'}) => void, onCancel: () => void }`
- `MyList` consumes: `getList`, `saveList`, `upsertAnime`, `removeAnime` (Task 4); `serializeList`, `parseImportedList`, `mergeLists`, `applyConflictResolutions` (Task 5); `ConflictDialog`.

- [ ] **Step 1: Write the failing ConflictDialog tests**

`src/components/ConflictDialog.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConflictDialog from './ConflictDialog.jsx';

const conflicts = [
  {
    animeId: 1,
    existing: { title: 'One Piece', status: 'vu' },
    imported: { title: 'One Piece', status: 'a_voir' },
  },
];

describe('ConflictDialog', () => {
  it('defaults every conflict to "keep existing"', () => {
    render(<ConflictDialog conflicts={conflicts} onResolve={() => {}} onCancel={() => {}} />);
    expect(screen.getByLabelText('Garder existant')).toBeChecked();
  });

  it('resolves with the chosen option per conflict', async () => {
    const onResolve = vi.fn();
    const user = userEvent.setup();

    render(<ConflictDialog conflicts={conflicts} onResolve={onResolve} onCancel={() => {}} />);
    await user.click(screen.getByLabelText('Garder importé'));
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onResolve).toHaveBeenCalledWith({ 1: 'imported' });
  });

  it('calls onCancel when cancelled', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<ConflictDialog conflicts={conflicts} onResolve={() => {}} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the ConflictDialog tests to verify they fail**

Run: `npm test -- ConflictDialog.test.jsx`
Expected: FAIL (`src/components/ConflictDialog.jsx` does not exist).

- [ ] **Step 3: Implement ConflictDialog**

`src/components/ConflictDialog.jsx`:
```jsx
import { useState } from 'react';

function ConflictDialog({ conflicts, onResolve, onCancel }) {
  const [choices, setChoices] = useState(
    Object.fromEntries(conflicts.map((conflict) => [conflict.animeId, 'existing']))
  );

  function setChoice(animeId, value) {
    setChoices((prev) => ({ ...prev, [animeId]: value }));
  }

  return (
    <div role="dialog" aria-label="Conflits d'import">
      <h3>Conflits détectés</h3>
      <ul>
        {conflicts.map((conflict) => (
          <li key={conflict.animeId}>
            <p>{conflict.existing.title}</p>
            <label>
              <input
                type="radio"
                name={`conflict-${conflict.animeId}`}
                checked={choices[conflict.animeId] === 'existing'}
                onChange={() => setChoice(conflict.animeId, 'existing')}
              />
              Garder existant
            </label>
            <label>
              <input
                type="radio"
                name={`conflict-${conflict.animeId}`}
                checked={choices[conflict.animeId] === 'imported'}
                onChange={() => setChoice(conflict.animeId, 'imported')}
              />
              Garder importé
            </label>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onResolve(choices)}>
        Valider
      </button>
      <button type="button" onClick={onCancel}>
        Annuler
      </button>
    </div>
  );
}

export default ConflictDialog;
```

- [ ] **Step 4: Run the ConflictDialog tests to verify they pass**

Run: `npm test -- ConflictDialog.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit ConflictDialog**

```bash
git add src/components/ConflictDialog.jsx src/components/ConflictDialog.test.jsx
git commit -m "Add import conflict resolution dialog"
```

- [ ] **Step 6: Write the failing MyList tests**

`src/pages/MyList.test.jsx`:
```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyList from './MyList.jsx';
import { getList, upsertAnime, removeAnime } from '../storage/listStorage.js';

vi.mock('../storage/listStorage.js', () => ({
  getList: vi.fn(),
  saveList: vi.fn(),
  upsertAnime: vi.fn(),
  removeAnime: vi.fn(),
}));

const entry = {
  animeId: 1,
  title: 'One Piece',
  status: 'vu',
  note: 'coup_de_coeur',
  excluded: false,
  comment: '',
  genres: ['Action'],
  studios: ['Toei Animation'],
  seasonYear: 1999,
  addedAt: 't',
};

function renderMyList() {
  return render(
    <MemoryRouter>
      <MyList />
    </MemoryRouter>
  );
}

describe('MyList', () => {
  beforeEach(() => {
    getList.mockReset().mockReturnValue([entry]);
    upsertAnime.mockReset();
    removeAnime.mockReset().mockReturnValue([]);
  });

  it('renders entries from the stored list', () => {
    renderMyList();
    expect(screen.getByText('One Piece')).toBeInTheDocument();
  });

  it('filters entries by status', async () => {
    getList.mockReturnValue([entry, { ...entry, animeId: 2, title: 'Naruto', status: 'a_voir' }]);
    const user = userEvent.setup();

    renderMyList();
    await user.selectOptions(screen.getByLabelText('Filtrer par statut'), 'vu');

    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.queryByText('Naruto')).not.toBeInTheDocument();
  });

  it('removes an entry when "Supprimer" is clicked', async () => {
    const user = userEvent.setup();
    renderMyList();

    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(removeAnime).toHaveBeenCalledWith(1);
  });

  it('updates the note via the select', async () => {
    upsertAnime.mockReturnValue([{ ...entry, note: 'aime' }]);
    const user = userEvent.setup();

    renderMyList();
    await user.selectOptions(screen.getByLabelText('Note de One Piece'), 'aime');

    expect(upsertAnime).toHaveBeenCalledWith(expect.objectContaining({ animeId: 1, note: 'aime' }));
  });

  it('shows a conflict dialog when the import has diverging entries', async () => {
    const importedEntry = { ...entry, status: 'a_voir' };
    const file = new File([JSON.stringify([importedEntry])], 'liste.json', {
      type: 'application/json',
    });
    const user = userEvent.setup();

    renderMyList();
    await user.upload(screen.getByLabelText('Importer un fichier'), file);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  it('exports the list as a downloadable JSON file', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
    const user = userEvent.setup();

    renderMyList();
    await user.click(screen.getByRole('button', { name: 'Exporter' }));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 7: Run the MyList tests to verify they fail**

Run: `npm test -- MyList.test.jsx`
Expected: FAIL (`src/pages/MyList.jsx` does not exist).

- [ ] **Step 8: Implement MyList**

`src/pages/MyList.jsx`:
```jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConflictDialog from '../components/ConflictDialog.jsx';
import { getList, saveList, upsertAnime, removeAnime } from '../storage/listStorage.js';
import {
  serializeList,
  parseImportedList,
  mergeLists,
  applyConflictResolutions,
} from '../storage/exportImport.js';

const STATUS_OPTIONS = ['a_voir', 'vu'];
const NOTE_OPTIONS = ['coup_de_coeur', 'aime', 'pas_aime'];
const SORT_FIELDS = ['note', 'seasonYear', 'genres', 'studios'];

function MyList() {
  const navigate = useNavigate();
  const [list, setList] = useState(() => getList());
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('addedAt');
  const [pendingImport, setPendingImport] = useState(null);

  const visibleList = useMemo(() => {
    let items = list;
    if (statusFilter) {
      items = items.filter((entry) => entry.status === statusFilter);
    }
    return [...items].sort((a, b) => {
      const aValue = Array.isArray(a[sortField]) ? a[sortField][0] ?? '' : a[sortField] ?? '';
      const bValue = Array.isArray(b[sortField]) ? b[sortField][0] ?? '' : b[sortField] ?? '';
      return String(aValue).localeCompare(String(bValue));
    });
  }, [list, statusFilter, sortField]);

  function updateEntry(animeId, changes) {
    const updated = upsertAnime({ animeId, ...changes });
    setList(updated);
  }

  function handleRemove(animeId) {
    setList(removeAnime(animeId));
  }

  function handleExport() {
    const blob = new Blob([serializeList(list)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'animeadvice-liste.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();

    try {
      const imported = parseImportedList(text);
      const { merged, conflicts } = mergeLists(list, imported);
      if (conflicts.length === 0) {
        saveList(merged);
        setList(merged);
      } else {
        setPendingImport({ merged, conflicts });
      }
    } catch {
      window.alert('Fichier invalide, import annulé.');
    } finally {
      event.target.value = '';
    }
  }

  function handleResolveConflicts(resolutions) {
    const final = applyConflictResolutions(pendingImport.merged, pendingImport.conflicts, resolutions);
    saveList(final);
    setList(final);
    setPendingImport(null);
  }

  return (
    <section>
      <h2>Ma liste</h2>
      <div className="my-list-controls">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select value={sortField} onChange={(event) => setSortField(event.target.value)} aria-label="Trier par">
          <option value="addedAt">Date d'ajout</option>
          {SORT_FIELDS.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
        <button type="button" onClick={handleExport}>
          Exporter
        </button>
        <label>
          Importer
          <input type="file" accept="application/json" onChange={handleImportFile} aria-label="Importer un fichier" />
        </label>
      </div>

      <ul>
        {visibleList.map((entry) => (
          <li key={entry.animeId}>
            <button type="button" onClick={() => navigate(`/anime/${entry.animeId}`)}>
              {entry.title}
            </button>
            <select
              value={entry.status}
              aria-label={`Statut de ${entry.title}`}
              onChange={(event) => updateEntry(entry.animeId, { status: event.target.value })}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={entry.note ?? ''}
              aria-label={`Note de ${entry.title}`}
              onChange={(event) => updateEntry(entry.animeId, { note: event.target.value || null })}
            >
              <option value="">Pas de note</option>
              {NOTE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={entry.comment}
              aria-label={`Commentaire pour ${entry.title}`}
              onChange={(event) => updateEntry(entry.animeId, { comment: event.target.value })}
            />
            <button type="button" onClick={() => handleRemove(entry.animeId)}>
              Supprimer
            </button>
          </li>
        ))}
      </ul>

      {pendingImport && (
        <ConflictDialog
          conflicts={pendingImport.conflicts}
          onResolve={handleResolveConflicts}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </section>
  );
}

export default MyList;
```

Update `src/App.jsx` to add the Ma liste route:
```jsx
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Catalogue from './pages/Catalogue.jsx';
import MyList from './pages/MyList.jsx';

function App() {
  return (
    <HashRouter>
      <header>
        <h1>AnimeAdvice</h1>
        <nav>
          <Link to="/">Accueil</Link>
          <Link to="/catalogue">Catalogue</Link>
          <Link to="/ma-liste">Ma liste</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/ma-liste" element={<MyList />} />
        </Routes>
      </main>
    </HashRouter>
  );
}

export default App;
```

- [ ] **Step 9: Run the MyList tests to verify they pass**

Run: `npm test -- MyList.test.jsx App.test.jsx`
Expected: PASS

- [ ] **Step 10: Commit MyList**

```bash
git add src/pages/MyList.jsx src/pages/MyList.test.jsx src/App.jsx
git commit -m "Add Ma liste page with export/import"
```

---

## Task 15: Fiche anime (detail page)

**Files:**
- Create: `src/pages/AnimeDetail.jsx`
- Test: `src/pages/AnimeDetail.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `getAnimeDetails`, `getAnimeRecommendations` (Task 3); `getList`, `upsertAnime` (Task 4); `useParams`, `useNavigate` from `react-router-dom`.

- [ ] **Step 1: Write the failing tests**

`src/pages/AnimeDetail.test.jsx`:
```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnimeDetail from './AnimeDetail.jsx';
import { getAnimeDetails, getAnimeRecommendations } from '../api/queries.js';
import { getList, upsertAnime } from '../storage/listStorage.js';

vi.mock('../api/queries.js', () => ({
  getAnimeDetails: vi.fn(),
  getAnimeRecommendations: vi.fn(),
}));
vi.mock('../storage/listStorage.js', () => ({
  getList: vi.fn(() => []),
  upsertAnime: vi.fn(),
}));

const details = {
  id: 1,
  title: 'Fate/stay night',
  description: 'Un mage combat.',
  genres: ['Action'],
  tags: ['Mahou Shoujo'],
  studios: ['Ufotable'],
  format: 'TV',
  episodes: 24,
  averageScore: 75,
  coverImage: null,
};

function renderDetail(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/anime/${id}`]}>
      <Routes>
        <Route path="/anime/:id" element={<AnimeDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AnimeDetail', () => {
  beforeEach(() => {
    getAnimeDetails.mockReset();
    getAnimeRecommendations.mockReset();
    getList.mockReset().mockReturnValue([]);
    upsertAnime.mockReset();
  });

  it('renders anime details and similar anime', async () => {
    getAnimeDetails.mockResolvedValue(details);
    getAnimeRecommendations.mockResolvedValue([{ rating: 10, media: { id: 2, title: 'Tsukihime' } }]);

    renderDetail();

    await waitFor(() => expect(screen.getByText('Fate/stay night')).toBeInTheDocument());
    expect(screen.getByText('Tsukihime')).toBeInTheDocument();
  });

  it('shows an error state with a retry button when the fetch fails', async () => {
    getAnimeDetails.mockRejectedValueOnce(new Error('network'));
    getAnimeRecommendations.mockResolvedValue([]);
    getAnimeDetails.mockResolvedValueOnce(details);
    const user = userEvent.setup();

    renderDetail();

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    await waitFor(() => expect(screen.getByText('Fate/stay night')).toBeInTheDocument());
  });

  it('saves personal fields via upsertAnime when the status changes', async () => {
    getAnimeDetails.mockResolvedValue(details);
    getAnimeRecommendations.mockResolvedValue([]);
    upsertAnime.mockReturnValue([{ animeId: 1, status: 'vu' }]);
    const user = userEvent.setup();

    renderDetail();
    await waitFor(() => screen.getByText('Fate/stay night'));
    await user.selectOptions(screen.getByLabelText('Statut'), 'vu');

    expect(upsertAnime).toHaveBeenCalledWith(expect.objectContaining({ animeId: 1, status: 'vu' }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- AnimeDetail.test.jsx`
Expected: FAIL (`src/pages/AnimeDetail.jsx` does not exist).

- [ ] **Step 3: Implement AnimeDetail**

`src/pages/AnimeDetail.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAnimeDetails, getAnimeRecommendations } from '../api/queries.js';
import { getList, upsertAnime } from '../storage/listStorage.js';

const STATUS_OPTIONS = ['a_voir', 'vu'];
const NOTE_OPTIONS = ['coup_de_coeur', 'aime', 'pas_aime'];

function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [status, setStatus] = useState('loading');
  const [entry, setEntry] = useState(null);

  function loadData() {
    setStatus('loading');
    Promise.all([getAnimeDetails(Number(id)), getAnimeRecommendations(Number(id))])
      .then(([data, recommendations]) => {
        setAnime(data);
        setSimilar(recommendations.map((node) => node.media));
        setEntry(getList().find((item) => item.animeId === Number(id)) ?? null);
        setStatus('idle');
      })
      .catch(() => setStatus('error'));
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateEntry(changes) {
    const updated = upsertAnime({
      animeId: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      genres: anime.genres,
      studios: anime.studios,
      seasonYear: anime.seasonYear,
      ...changes,
    });
    setEntry(updated.find((item) => item.animeId === anime.id));
  }

  if (status === 'loading') return <p>Chargement...</p>;
  if (status === 'error') {
    return (
      <p role="alert">
        Impossible de charger cet anime, réessaie plus tard.{' '}
        <button type="button" onClick={loadData}>
          Réessayer
        </button>
      </p>
    );
  }
  if (!anime) return null;

  return (
    <section>
      <h2>{anime.title}</h2>
      {anime.coverImage && <img src={anime.coverImage} alt={anime.title} />}
      <p>{anime.description}</p>
      <p>Genres : {anime.genres.join(', ')}</p>
      <p>Tags : {anime.tags.join(', ')}</p>
      <p>Studios : {anime.studios.join(', ')}</p>
      <p>
        Format : {anime.format} · Épisodes : {anime.episodes ?? '?'} · Score : {anime.averageScore ?? '?'}
      </p>

      <div className="anime-detail__personal">
        <label>
          Statut
          <select value={entry?.status ?? 'a_voir'} onChange={(event) => updateEntry({ status: event.target.value })}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Note
          <select value={entry?.note ?? ''} onChange={(event) => updateEntry({ note: event.target.value || null })}>
            <option value="">Pas de note</option>
            {NOTE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Commentaire
          <input
            type="text"
            value={entry?.comment ?? ''}
            onChange={(event) => updateEntry({ comment: event.target.value })}
          />
        </label>
        <button type="button" onClick={() => updateEntry({ excluded: !(entry?.excluded ?? false) })}>
          {entry?.excluded ? 'Retirer de la liste des exclus' : 'Ne plus recommander'}
        </button>
      </div>

      <h3>Animes similaires</h3>
      <ul>
        {similar.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => navigate(`/anime/${item.id}`)}>
              {item.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AnimeDetail;
```

Update `src/App.jsx` to add the Fiche route:
```jsx
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Catalogue from './pages/Catalogue.jsx';
import MyList from './pages/MyList.jsx';
import AnimeDetail from './pages/AnimeDetail.jsx';

function App() {
  return (
    <HashRouter>
      <header>
        <h1>AnimeAdvice</h1>
        <nav>
          <Link to="/">Accueil</Link>
          <Link to="/catalogue">Catalogue</Link>
          <Link to="/ma-liste">Ma liste</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/ma-liste" element={<MyList />} />
          <Route path="/anime/:id" element={<AnimeDetail />} />
        </Routes>
      </main>
    </HashRouter>
  );
}

export default App;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- AnimeDetail.test.jsx App.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/AnimeDetail.jsx src/pages/AnimeDetail.test.jsx src/App.jsx
git commit -m "Add Fiche anime detail page with similar anime section"
```

---

## Task 16: Discovery bonus suggestion

**Files:**
- Create: `src/recommend/discovery.js`
- Test: `src/recommend/discovery.test.js`
- Modify: `src/recommend/fetchRecommendationData.js`
- Modify: `src/recommend/fetchRecommendationData.test.js`
- Modify: `src/pages/Home.jsx`
- Modify: `src/pages/Home.test.jsx`

**Interfaces:**
- Consumes: `browseCatalogue` (`src/api/queries.js`, Task 3), `scoreCandidate` (Task 6), `pickWeighted` (Task 8).
- Produces: `fetchDiscoveryPick(baseList: Array<MediaSummary>, favoritesList?: Array<MediaSummary>, excludeIds?: Array<number>, rng?: () => number): Promise<MediaSummary|null>`
  - Picks the most common genre across `baseList`, queries the catalogue for that genre starting past the ~top-500-most-popular pages (page 11+ at 50 per page, randomized within a 10-page window), scores the results with `scoreCandidate` against `baseList`/`favoritesList`, excludes `excludeIds` and the base anime themselves, and returns one weighted-random pick (or `null` if no genre/candidate is available).
- `fetchRecommendationData` (Task 9) now also returns `discoveryPick: MediaSummary|null` alongside `pool` and `baseList`.

- [ ] **Step 1: Write the failing discovery tests**

`src/recommend/discovery.test.js`:
```js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDiscoveryPick } from './discovery.js';
import { browseCatalogue } from '../api/queries.js';

vi.mock('../api/queries.js', () => ({
  browseCatalogue: vi.fn(),
}));

const baseList = [
  { id: 1, genres: ['Action', 'Drama'], studios: [] },
  { id: 2, genres: ['Action'], studios: [] },
];
const matching = { id: 10, genres: ['Action'], studios: [] };
const notMatching = { id: 11, genres: ['Romance'], studios: [] };

describe('fetchDiscoveryPick', () => {
  beforeEach(() => {
    browseCatalogue.mockReset();
  });

  it('returns null when the base list has no genres', async () => {
    const result = await fetchDiscoveryPick([], [], []);
    expect(result).toBeNull();
    expect(browseCatalogue).not.toHaveBeenCalled();
  });

  it('queries the catalogue filtered by the dominant genre, beyond the top-500 popularity pages', async () => {
    browseCatalogue.mockResolvedValue({ media: [matching], hasNextPage: true });

    await fetchDiscoveryPick(baseList, [], [], () => 0);

    expect(browseCatalogue).toHaveBeenCalledWith(
      expect.objectContaining({ genre: 'Action', page: 11, perPage: 50, sort: ['POPULARITY_DESC'] })
    );
  });

  it('picks a candidate that overlaps with the base genres', async () => {
    browseCatalogue.mockResolvedValue({ media: [notMatching, matching], hasNextPage: true });

    const result = await fetchDiscoveryPick(baseList, [], [], () => 0.99);

    expect(result.id).toBe(10);
  });

  it('excludes ids already in the base list or excludeIds', async () => {
    browseCatalogue.mockResolvedValue({ media: [matching], hasNextPage: true });

    const result = await fetchDiscoveryPick(baseList, [], [10]);

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- discovery.test.js`
Expected: FAIL (`src/recommend/discovery.js` does not exist).

- [ ] **Step 3: Implement discovery.js**

`src/recommend/discovery.js`:
```js
import { browseCatalogue } from '../api/queries.js';
import { scoreCandidate } from './scoring.js';
import { pickWeighted } from './pickResults.js';

const POPULARITY_OFFSET_PAGES = 10; // ~top 500 most popular (perPage 50 * 10 pages)
const PAGE_RANGE = 10;
const PER_PAGE = 50;

function pickDominantGenre(baseList) {
  const counts = new Map();
  for (const media of baseList) {
    for (const genre of media.genres ?? []) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  let best = null;
  let bestCount = 0;
  for (const [genre, count] of counts) {
    if (count > bestCount) {
      best = genre;
      bestCount = count;
    }
  }
  return best;
}

export async function fetchDiscoveryPick(baseList, favoritesList = [], excludeIds = [], rng = Math.random) {
  const genre = pickDominantGenre(baseList);
  if (!genre) return null;

  const page = POPULARITY_OFFSET_PAGES + 1 + Math.floor(rng() * PAGE_RANGE);
  const { media } = await browseCatalogue({
    genre,
    page,
    perPage: PER_PAGE,
    sort: ['POPULARITY_DESC'],
  });

  const excluded = new Set([...excludeIds, ...baseList.map((item) => item.id)]);
  const candidates = media
    .filter((item) => !excluded.has(item.id))
    .map((item) => ({ media: item, score: scoreCandidate(item, baseList, favoritesList) }));

  const { picked } = pickWeighted(candidates, 1, [], rng);
  return picked[0]?.media ?? null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- discovery.test.js`
Expected: PASS

- [ ] **Step 5: Commit discovery.js**

```bash
git add src/recommend/discovery.js src/recommend/discovery.test.js
git commit -m "Add discovery pick for lesser-known but genre-relevant anime"
```

- [ ] **Step 6: Write the failing test for fetchRecommendationData returning a discovery pick**

Add to `src/recommend/fetchRecommendationData.test.js` (new imports and mock alongside the existing ones):
```js
import { fetchDiscoveryPick } from './discovery.js';

vi.mock('./discovery.js', () => ({
  fetchDiscoveryPick: vi.fn(),
}));
```

Add inside the existing `beforeEach`:
```js
fetchDiscoveryPick.mockReset().mockResolvedValue(null);
```

Add a new test case:
```js
it('includes the discovery pick returned by fetchDiscoveryPick', async () => {
  getAnimeDetails.mockResolvedValue(baseMedia);
  getAnimeRecommendations.mockResolvedValue([]);
  getList.mockReturnValue([]);
  fetchDiscoveryPick.mockResolvedValue({ id: 99, title: 'Obscure Anime' });

  const { discoveryPick } = await fetchRecommendationData([1]);

  expect(discoveryPick).toEqual({ id: 99, title: 'Obscure Anime' });
});
```

- [ ] **Step 7: Run tests to verify the new test fails**

Run: `npm test -- fetchRecommendationData.test.js`
Expected: FAIL (`discoveryPick` is `undefined`, not the expected object).

- [ ] **Step 8: Wire discoveryPick into fetchRecommendationData**

`src/recommend/fetchRecommendationData.js`:
```js
import { getAnimeDetails, getAnimeRecommendations } from '../api/queries.js';
import { buildCandidatePool } from './buildPool.js';
import { fetchDiscoveryPick } from './discovery.js';
import { getList } from '../storage/listStorage.js';

const MAX_FAVORITES_FOR_SCORING = 10;

export async function fetchRecommendationData(baseAnimeIds) {
  if (!baseAnimeIds || baseAnimeIds.length === 0) {
    throw new Error('base_vide');
  }

  const baseList = await Promise.all(baseAnimeIds.map((id) => getAnimeDetails(id)));
  const recommendationLists = await Promise.all(
    baseAnimeIds.map((id) => getAnimeRecommendations(id))
  );
  const recommendationNodes = recommendationLists.flat();

  const localList = getList();
  const excludeIds = localList
    .filter((entry) => entry.status === 'vu' || entry.excluded)
    .map((entry) => entry.animeId);

  const favoriteIds = localList
    .filter((entry) => entry.note === 'coup_de_coeur' && !baseAnimeIds.includes(entry.animeId))
    .map((entry) => entry.animeId)
    .slice(0, MAX_FAVORITES_FOR_SCORING);
  const favoritesList = await Promise.all(favoriteIds.map((id) => getAnimeDetails(id)));

  const pool = buildCandidatePool({ baseList, recommendationNodes, favoritesList, excludeIds });
  const discoveryPick = await fetchDiscoveryPick(baseList, favoritesList, excludeIds);

  return { pool, baseList, discoveryPick };
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test -- fetchRecommendationData.test.js`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/recommend/fetchRecommendationData.js src/recommend/fetchRecommendationData.test.js
git commit -m "Include discovery pick in recommendation data"
```

- [ ] **Step 11: Write the failing Home test for the discovery card**

Add to `src/pages/Home.test.jsx`:
```jsx
it('shows a bonus discovery suggestion alongside the main results', async () => {
  fetchRecommendationData.mockResolvedValue({
    pool: [{ media: candidate, score: 10 }],
    baseList: [],
    discoveryPick: { id: 50, title: 'Obscure Gem', genres: [], studios: [], coverImage: null },
  });
  getList.mockReturnValue([{ animeId: 1, status: 'vu' }]);
  const user = userEvent.setup();

  renderHome();
  await user.click(screen.getByRole('button', { name: 'Selon mes vus' }));

  await waitFor(() => expect(screen.getByText('Découverte')).toBeInTheDocument());
  expect(screen.getByText('Obscure Gem')).toBeInTheDocument();
});
```

- [ ] **Step 12: Run tests to verify the new test fails**

Run: `npm test -- Home.test.jsx`
Expected: FAIL (no "Découverte" heading rendered yet).

- [ ] **Step 13: Render the discovery card in Home**

In `src/pages/Home.jsx`, add a new state variable next to the others:
```js
const [discoveryPick, setDiscoveryPick] = useState(null);
```

Update `runRecommendation` to capture and store the pick:
```js
async function runRecommendation(baseAnimeIds) {
  setLastBaseIds(baseAnimeIds);
  setStatus('loading');
  try {
    const { pool: newPool, discoveryPick: pick } = await fetchRecommendationData(baseAnimeIds);
    const { picked } = pickWeighted(newPool, 5);
    setPool(newPool);
    setShownIds(picked.map((entry) => entry.media.id));
    setResults(picked);
    setDiscoveryPick(pick);
    setStatus('idle');
  } catch (error) {
    setStatus(error.message === 'base_vide' ? 'empty_base' : 'error');
  }
}
```

Render the bonus card after the results grid, before the "Voir d'autres" button:
```jsx
{discoveryPick && (
  <div className="discovery-pick">
    <h3>Découverte</h3>
    <AnimeCard
      anime={discoveryPick}
      onAddSeen={handleAddSeen}
      onExclude={handleExclude}
      onClick={(anime) => navigate(`/anime/${anime.id}`)}
    />
  </div>
)}
```

- [ ] **Step 14: Run tests to verify they pass**

Run: `npm test -- Home.test.jsx`
Expected: PASS

- [ ] **Step 15: Commit**

```bash
git add src/pages/Home.jsx src/pages/Home.test.jsx
git commit -m "Show bonus Découverte suggestion on the Home page"
```

---

## Task 17: GitHub Pages deployment

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`

**Interfaces:** none (infrastructure/config only).

- [ ] **Step 1: Add the GitHub Actions deploy workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main, master]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Add developer/deployment instructions**

`README.md`:
```markdown
# AnimeAdvice

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
1. Pousser ce dépôt sur GitHub sous le nom `animeAdvice` (le chemin de base configuré dans `vite.config.js` est `/animeAdvice/`).
2. Dans les paramètres du dépôt, section **Pages**, choisir **Source: GitHub Actions**.
3. Le site sera ensuite disponible à `https://<utilisateur>.github.io/animeAdvice/`.
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS (all test files green).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "Add GitHub Pages deployment workflow and README"
```
