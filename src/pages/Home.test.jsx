import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home.jsx';
import { fetchRecommendationData, fetchMoreCandidates, getExcludedIds } from '../recommend/fetchRecommendationData.js';
import { fetchDiscoveryPick, pickDominantGenre } from '../recommend/discovery.js';
import { getList, upsertAnime } from '../storage/listStorage.js';
import { searchAnime } from '../api/queries.js';

vi.mock('../recommend/fetchRecommendationData.js', () => ({
  fetchRecommendationData: vi.fn(),
  fetchMoreCandidates: vi.fn(),
  getExcludedIds: vi.fn(),
}));
vi.mock('../recommend/discovery.js', () => ({
  fetchDiscoveryPick: vi.fn(),
  pickDominantGenre: vi.fn(),
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
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Home />
    </MemoryRouter>
  );
}

async function selectFromChecklist(user, sectionTitle, animeTitle) {
  await user.click(screen.getByRole('button', { name: sectionTitle }));
  await user.click(screen.getByLabelText(animeTitle));
}

describe('Home', () => {
  beforeEach(() => {
    fetchRecommendationData.mockReset();
    fetchMoreCandidates.mockReset().mockResolvedValue({ candidates: [], genre: null });
    getExcludedIds.mockReset().mockReturnValue([]);
    fetchDiscoveryPick.mockReset().mockResolvedValue(null);
    pickDominantGenre.mockReset().mockReturnValue(null);
    getList.mockReset().mockReturnValue([]);
    upsertAnime.mockReset();
    searchAnime.mockReset();
    localStorage.clear(); // gacha mode preference is real localStorage, unlike the mocked stores above
  });

  it('disables "Me conseiller un anime" until an anime is selected', async () => {
    searchAnime.mockResolvedValue([{ id: 1, title: 'Fate/stay night', genres: [], studios: [] }]);
    const user = userEvent.setup();

    renderHome();
    expect(screen.getByRole('button', { name: 'Me conseiller un anime' })).toBeDisabled();

    await user.type(screen.getByLabelText('Rechercher un anime'), 'Fate');
    await waitFor(() => screen.getByText('Fate/stay night'));
    await user.click(screen.getByRole('button', { name: 'Fate/stay night' }));

    expect(screen.getByRole('button', { name: 'Me conseiller un anime' })).toBeEnabled();
  });

  it('clears the search field after selecting an anime, keeping it in the selection list', async () => {
    searchAnime.mockResolvedValue([{ id: 1, title: 'Fate/stay night', genres: [], studios: [] }]);
    const user = userEvent.setup();

    renderHome();
    await user.type(screen.getByLabelText('Rechercher un anime'), 'Fate');
    await waitFor(() => screen.getByText('Fate/stay night'));
    await user.click(screen.getByRole('button', { name: 'Fate/stay night' }));

    expect(screen.getByLabelText('Rechercher un anime')).toHaveValue('');
    expect(screen.getByText('Fate/stay night')).toBeInTheDocument();
  });

  it('removes a selected anime from the base list when its remove button is clicked', async () => {
    searchAnime.mockResolvedValue([{ id: 1, title: 'Fate/stay night', genres: [], studios: [] }]);
    const user = userEvent.setup();

    renderHome();
    await user.type(screen.getByLabelText('Rechercher un anime'), 'Fate');
    await waitFor(() => screen.getByText('Fate/stay night'));
    await user.click(screen.getByRole('button', { name: 'Fate/stay night' }));
    await user.click(screen.getByRole('button', { name: 'Retirer Fate/stay night' }));

    expect(screen.queryByText('Fate/stay night')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Me conseiller un anime' })).toBeDisabled();
  });

  it('renders recommendation results after a manual search', async () => {
    searchAnime.mockResolvedValue([{ id: 1, title: 'Fate/stay night', genres: [], studios: [] }]);
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [{ id: 1, genres: [], studios: [] }],
      favoritesList: [],
      discoveryPick: null,
    });
    const user = userEvent.setup();

    renderHome();
    await user.type(screen.getByLabelText('Rechercher un anime'), 'Fate');
    await waitFor(() => screen.getByText('Fate/stay night'));
    await user.click(screen.getByRole('button', { name: 'Fate/stay night' }));
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));

    await waitFor(() => expect(screen.getByText('Tsukihime')).toBeInTheDocument());
  });

  it('lets the user pick anime from the "Mes animes vus" checklist', async () => {
    getList.mockReturnValue([{ animeId: 1, title: 'One Piece', status: 'vu', note: null, excluded: false }]);
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: null,
    });
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes animes vus', 'One Piece');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));

    await waitFor(() => expect(fetchRecommendationData).toHaveBeenCalledWith([1]));
    expect(screen.getByText('Tsukihime')).toBeInTheDocument();
  });

  it('lets the user pick anime from the "Mes coups de cœur" checklist', async () => {
    getList.mockReturnValue([
      { animeId: 4, title: 'Fate/stay night', status: 'a_voir', note: 'coup_de_coeur', excluded: false },
    ]);
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: null,
    });
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes coups de cœur', 'Fate/stay night');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));

    await waitFor(() => expect(fetchRecommendationData).toHaveBeenCalledWith([4]));
  });

  it('does not show an anime under "Mes animes vus" if it is already a favorite', async () => {
    getList.mockReturnValue([
      { animeId: 4, title: 'Fate/stay night', status: 'vu', note: 'coup_de_coeur', excluded: false },
    ]);
    const user = userEvent.setup();

    renderHome();
    await user.click(screen.getByRole('button', { name: 'Mes coups de cœur' }));
    expect(screen.getByLabelText('Fate/stay night')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mes animes vus' }));
    expect(screen.getByText('Aucun anime ici.')).toBeInTheDocument();
  });

  it('shows the score and a genre-based reason for each result', async () => {
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: { ...candidate, genres: ['Action'] }, score: 7.5 }],
      baseList: [{ id: 1, genres: ['Action'], studios: [] }],
      favoritesList: [],
      discoveryPick: null,
    });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));

    await waitFor(() => expect(screen.getByText('Score : 7.5')).toBeInTheDocument());
    expect(screen.getByText('Points communs — genres : Action')).toBeInTheDocument();
  });

  it('marks a result as seen via the quick action and shows a confirmation badge', async () => {
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: null,
    });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));
    await waitFor(() => screen.getByText('Tsukihime'));
    await user.click(screen.getByRole('button', { name: 'Déjà vu' }));

    expect(upsertAnime).toHaveBeenCalledWith(expect.objectContaining({ animeId: 2, status: 'vu' }));
    expect(screen.getByText('Vu')).toBeInTheDocument();
  });

  it('excludes a result via the quick action and shows a confirmation badge', async () => {
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: null,
    });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));
    await waitFor(() => screen.getByText('Tsukihime'));
    await user.click(screen.getByRole('button', { name: 'Ne plus recommander' }));

    expect(screen.getByText('Exclu')).toBeInTheDocument();
  });

  it('shows a retry button and re-runs the last search when a fetch fails', async () => {
    fetchRecommendationData
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        pool: [{ media: candidate, score: 10 }],
        baseList: [],
        favoritesList: [],
        discoveryPick: null,
      });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));
    await waitFor(() => screen.getByRole('alert'));
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    await waitFor(() => expect(screen.getByText('Tsukihime')).toBeInTheDocument());
    expect(fetchRecommendationData).toHaveBeenCalledTimes(2);
  });

  it('shows a bonus Découverte suggestion alongside the main results, tagged as bonus', async () => {
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: { media: { id: 50, title: 'Obscure Gem', genres: [], studios: [], coverImage: null }, score: 4 },
    });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));

    await waitFor(() => expect(screen.getByText('Obscure Gem')).toBeInTheDocument());
    expect(screen.getByText('Bonus')).toBeInTheDocument();
    // Rendered inline in the same results grid as the other suggestions, not a separate section.
    expect(screen.getByText('Obscure Gem').closest('.results-grid')).not.toBeNull();
  });

  it('scrolls the results grid back into view when "Voir d\'autres" is clicked', async () => {
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: null,
    });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});

    try {
      renderHome();
      await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
      await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));
      await waitFor(() => screen.getByText('Tsukihime'));
      expect(scrollSpy).not.toHaveBeenCalled(); // only on "Voir d'autres", not the initial search

      await user.click(screen.getByRole('button', { name: "Voir d'autres" }));

      await waitFor(() =>
        expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth', block: 'start' }))
      );
    } finally {
      scrollSpy.mockRestore();
    }
  });

  it('keeps existing results visible when "Voir d\'autres" finds nothing new anywhere', async () => {
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: null,
    });
    // No dominant genre (empty baseList), so the pool top-up has nothing to fetch either.
    fetchMoreCandidates.mockResolvedValue({ candidates: [], genre: null });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));
    await waitFor(() => screen.getByText('Tsukihime'));

    await user.click(screen.getByRole('button', { name: "Voir d'autres" }));

    await waitFor(() =>
      expect(screen.getByText('Plus de suggestions dans ce lot, relance une recherche.')).toBeInTheDocument()
    );
    expect(screen.getByText('Tsukihime')).toBeInTheDocument();
  });

  it('tops up the pool from the catalogue when "Voir d\'autres" runs out of recommendations', async () => {
    const extra = { id: 99, title: 'Fresh Pick', genres: [], studios: [], coverImage: null };
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [{ id: 1, genres: ['Action'], studios: [] }],
      favoritesList: [],
      discoveryPick: null,
    });
    fetchMoreCandidates.mockResolvedValue({ candidates: [{ media: extra, score: 5 }], genre: 'Action' });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));
    await waitFor(() => screen.getByText('Tsukihime'));

    await user.click(screen.getByRole('button', { name: "Voir d'autres" }));

    await waitFor(() => expect(screen.getByText('Fresh Pick')).toBeInTheDocument());
    expect(fetchMoreCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ baseList: [{ id: 1, genres: ['Action'], studios: [] }], page: 1 })
    );
  });

  it('rolls a fresh "Découverte" bonus pick every time "Voir d\'autres" is clicked', async () => {
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: { media: { id: 50, title: 'Obscure Gem', genres: [], studios: [], coverImage: null }, score: 4 },
    });
    fetchDiscoveryPick.mockResolvedValueOnce({
      media: { id: 51, title: 'Second Gem', genres: [], studios: [], coverImage: null },
      score: 3,
    });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));
    await waitFor(() => expect(screen.getByText('Obscure Gem')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: "Voir d'autres" }));

    await waitFor(() => expect(screen.getByText('Second Gem')).toBeInTheDocument());
    expect(fetchDiscoveryPick).toHaveBeenLastCalledWith(
      [],
      [],
      expect.arrayContaining([2, 50])
    );
  });

  it('collapses the expanded checklist when a recommendation is launched', async () => {
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: null,
    });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
    expect(screen.getByLabelText('Base Anime')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));

    await waitFor(() => expect(screen.getByText('Tsukihime')).toBeInTheDocument());
    expect(screen.queryByLabelText('Base Anime')).not.toBeInTheDocument();
  });

  it('resets the recommendation results when "Réinitialiser" is clicked', async () => {
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: null,
    });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();

    renderHome();
    await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));
    await waitFor(() => screen.getByText('Tsukihime'));

    await user.click(screen.getByRole('button', { name: 'Réinitialiser' }));

    expect(screen.queryByText('Tsukihime')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réinitialiser' })).not.toBeInTheDocument();
  });

  it('hides results behind a reveal button once "Mode gacha" is enabled, and persists the choice', async () => {
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: null,
    });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();

    renderHome();
    await user.click(screen.getByRole('checkbox', { name: 'Mode gacha' }));
    await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
    await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Révéler Tsukihime' })).toBeInTheDocument()
    );
    expect(screen.queryByText('Tsukihime')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Révéler Tsukihime' }));
    expect(screen.getByText('Tsukihime')).toBeInTheDocument();

    expect(localStorage.getItem('aniSensei.settings')).toContain('"gachaMode":true');
  });

  it('shuffles the bonus card among the others in gacha mode instead of always showing it last', async () => {
    fetchRecommendationData.mockResolvedValue({
      pool: [{ media: candidate, score: 10 }],
      baseList: [],
      favoritesList: [],
      discoveryPick: { media: { id: 50, title: 'Obscure Gem', genres: [], studios: [], coverImage: null }, score: 4 },
    });
    getList.mockReturnValue([{ animeId: 1, title: 'Base Anime', status: 'vu', note: null, excluded: false }]);
    const user = userEvent.setup();
    // Forces the Fisher-Yates shuffle to swap the last two positions every time,
    // so [regular, bonus] deterministically becomes [bonus, regular].
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    try {
      renderHome();
      await user.click(screen.getByRole('checkbox', { name: 'Mode gacha' }));
      await selectFromChecklist(user, 'Mes animes vus', 'Base Anime');
      await user.click(screen.getByRole('button', { name: 'Me conseiller un anime' }));

      await waitFor(() =>
        expect(screen.getAllByRole('button', { name: /Révéler/ })).toHaveLength(2)
      );
      const revealButtons = screen.getAllByRole('button', { name: /Révéler/ });
      expect(revealButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
        'Révéler Obscure Gem',
        'Révéler Tsukihime',
      ]);
    } finally {
      randomSpy.mockRestore();
    }
  });
});
