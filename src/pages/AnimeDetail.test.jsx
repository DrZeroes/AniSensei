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
    <MemoryRouter
      initialEntries={[`/anime/${id}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
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
