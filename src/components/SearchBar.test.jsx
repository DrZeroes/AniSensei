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
