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
    getList.mockReset().mockReturnValue([]);
    upsertAnime.mockReset();
    searchAnime.mockReset();
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

  it('shows a bonus Découverte suggestion alongside the main results', async () => {
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

    await waitFor(() => expect(screen.getByText('Découverte')).toBeInTheDocument());
    expect(screen.getByText('Obscure Gem')).toBeInTheDocument();
  });

  it('keeps existing results visible when "Voir d\'autres" finds nothing new', async () => {
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

    await user.click(screen.getByRole('button', { name: "Voir d'autres" }));

    expect(screen.getByText('Tsukihime')).toBeInTheDocument();
    expect(screen.getByText('Plus de suggestions dans ce lot, relance une recherche.')).toBeInTheDocument();
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
});
