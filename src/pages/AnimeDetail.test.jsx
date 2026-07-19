import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
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

  it('shows the season year when available', async () => {
    getAnimeDetails.mockResolvedValue({ ...details, seasonYear: 2006 });
    getAnimeRecommendations.mockResolvedValue([]);

    renderDetail();

    await waitFor(() => expect(screen.getByText(/Année : 2006/)).toBeInTheDocument());
  });

  it('shows "Pas encore diffusé" when no season year is available yet', async () => {
    getAnimeDetails.mockResolvedValue({ ...details, seasonYear: null });
    getAnimeRecommendations.mockResolvedValue([]);

    renderDetail();

    await waitFor(() => expect(screen.getByText(/Année : Pas encore diffusé/)).toBeInTheDocument());
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

  it('discards a stale response when navigating to a different anime before the older request resolves', async () => {
    const user = userEvent.setup({ delay: null });

    const details2 = { ...details, id: 2, title: 'Tsukihime' };

    // Manually-controlled promises so we can decide the resolution order.
    let resolveFirst;
    let resolveSecond;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise((resolve) => {
      resolveSecond = resolve;
    });

    getAnimeDetails.mockImplementation((animeId) => (animeId === 1 ? firstPromise : secondPromise));
    getAnimeRecommendations.mockResolvedValue([]);

    // A harness that keeps AnimeDetail mounted at the same tree position and lets us
    // trigger navigation programmatically, exactly like React Router does when
    // /anime/1 -> /anime/2 is navigated to from within the app (e.g. a "similaire" link).
    function Harness() {
      const navigate = useNavigate();
      return (
        <>
          <button type="button" onClick={() => navigate('/anime/2')}>
            Aller vers 2
          </button>
          <Routes>
            <Route path="/anime/:id" element={<AnimeDetail />} />
          </Routes>
        </>
      );
    }

    render(
      <MemoryRouter
        initialEntries={['/anime/1']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Harness />
      </MemoryRouter>
    );

    // First request (id=1) starts but is left pending.
    await waitFor(() => expect(getAnimeDetails).toHaveBeenCalledWith(1));

    // Navigate to /anime/2 before the id=1 request resolves. Because React Router
    // matches the same <Route path="/anime/:id"> element, AnimeDetail stays mounted
    // as the same component instance (only its params/effects re-run) instead of
    // unmounting and remounting.
    await user.click(screen.getByRole('button', { name: 'Aller vers 2' }));

    await waitFor(() => expect(getAnimeDetails).toHaveBeenCalledWith(2));

    // The newer request (id=2) resolves first.
    resolveSecond(details2);
    await waitFor(() => expect(screen.getByText('Tsukihime')).toBeInTheDocument());

    // The older, stale request (id=1) resolves afterwards.
    resolveFirst(details);

    // Give React time to process any updates from the stale response.
    await new Promise((resolve) => setTimeout(resolve, 50));

    // The final rendered page must still show anime 2's data, not the stale anime 1 data.
    expect(screen.getByText('Tsukihime')).toBeInTheDocument();
    expect(screen.queryByText('Fate/stay night')).not.toBeInTheDocument();
  });
});
