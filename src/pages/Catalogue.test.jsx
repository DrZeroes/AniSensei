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
});
