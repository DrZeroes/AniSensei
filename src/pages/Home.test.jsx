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
