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
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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

  it('replaces results (instead of appending) when a filter changes', async () => {
    browseCatalogue
      .mockResolvedValueOnce({ media: [{ id: 1, title: 'One Piece', genres: [], studios: [] }], hasNextPage: false })
      .mockResolvedValue({ media: [{ id: 2, title: 'Naruto', genres: [], studios: [] }], hasNextPage: false });
    const user = userEvent.setup();

    renderCatalogue();
    await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument());

    await user.click(screen.getByLabelText('Action'));

    await waitFor(() => expect(screen.getByText('Naruto')).toBeInTheDocument());
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
  });

  it('lets the user select and deselect multiple genres', async () => {
    browseCatalogue.mockResolvedValue({ media: [], hasNextPage: false });
    const user = userEvent.setup();

    renderCatalogue();
    await waitFor(() => expect(browseCatalogue).toHaveBeenCalledTimes(1));

    await user.click(screen.getByLabelText('Action'));
    await waitFor(() =>
      expect(browseCatalogue).toHaveBeenLastCalledWith(expect.objectContaining({ genres: ['Action'] }))
    );

    await user.click(screen.getByLabelText('Comedy'));
    await waitFor(() =>
      expect(browseCatalogue).toHaveBeenLastCalledWith(
        expect.objectContaining({ genres: ['Action', 'Comedy'] })
      )
    );

    await user.click(screen.getByLabelText('Action'));
    await waitFor(() =>
      expect(browseCatalogue).toHaveBeenLastCalledWith(expect.objectContaining({ genres: ['Comedy'] }))
    );
  });

  it('shows the list badge for anime already present in the local list', async () => {
    getList.mockReset().mockReturnValue([{ animeId: 1, status: 'vu', note: null, excluded: false }]);
    browseCatalogue.mockResolvedValue({
      media: [{ id: 1, title: 'One Piece', genres: [], studios: [] }],
      hasNextPage: false,
    });

    renderCatalogue();

    await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument());
    expect(screen.getByText('Vu')).toBeInTheDocument();
  });

  it('disables "Charger plus" while a fetch is in flight and ignores a second rapid click', async () => {
    let resolveSecondPage;
    const secondPagePromise = new Promise((resolve) => {
      resolveSecondPage = resolve;
    });
    browseCatalogue
      .mockResolvedValueOnce({ media: [{ id: 1, title: 'One Piece', genres: [], studios: [] }], hasNextPage: true })
      .mockImplementationOnce(() => secondPagePromise);
    const user = userEvent.setup();

    renderCatalogue();
    await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument());

    const loadMoreButton = screen.getByRole('button', { name: 'Charger plus' });
    await user.click(loadMoreButton);

    expect(loadMoreButton).toBeDisabled();
    await user.click(loadMoreButton);

    resolveSecondPage({ media: [{ id: 2, title: 'Naruto', genres: [], studios: [] }], hasNextPage: false });
    await waitFor(() => expect(screen.getByText('Naruto')).toBeInTheDocument());

    expect(browseCatalogue).toHaveBeenCalledTimes(2);
  });
});
