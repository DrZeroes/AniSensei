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

  it('clears the input and results after selecting an anime', async () => {
    searchAnime.mockResolvedValue([{ id: 1, title: 'One Piece' }]);
    const user = userEvent.setup();

    render(<SearchBar onSelect={() => {}} />);
    await user.type(screen.getByLabelText('Rechercher un anime'), 'One Piece');
    await waitFor(() => screen.getByText('One Piece'));
    await user.click(screen.getByRole('button', { name: 'One Piece' }));

    expect(screen.getByLabelText('Rechercher un anime')).toHaveValue('');
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
  });

  it('does not show a quick-add button when onQuickAddSeen is not provided', async () => {
    searchAnime.mockResolvedValue([{ id: 1, title: 'One Piece' }]);
    const user = userEvent.setup();

    render(<SearchBar onSelect={() => {}} />);
    await user.type(screen.getByLabelText('Rechercher un anime'), 'One Piece');
    await waitFor(() => screen.getByText('One Piece'));

    expect(screen.queryByRole('button', { name: /Marquer/ })).not.toBeInTheDocument();
  });

  it('calls onQuickAddSeen (and clears the search) without calling onSelect', async () => {
    searchAnime.mockResolvedValue([{ id: 1, title: 'One Piece' }]);
    const onSelect = vi.fn();
    const onQuickAddSeen = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSelect={onSelect} onQuickAddSeen={onQuickAddSeen} />);
    await user.type(screen.getByLabelText('Rechercher un anime'), 'One Piece');
    await waitFor(() => screen.getByText('One Piece'));
    await user.click(screen.getByRole('button', { name: 'Marquer One Piece comme vu' }));

    expect(onQuickAddSeen).toHaveBeenCalledWith({ id: 1, title: 'One Piece' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Rechercher un anime')).toHaveValue('');
  });

  it('shows an error message when the search fails', async () => {
    searchAnime.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();

    render(<SearchBar onSelect={() => {}} />);
    await user.type(screen.getByLabelText('Rechercher un anime'), 'One Piece');

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('renders no results list when the field is empty', () => {
    render(<SearchBar onSelect={() => {}} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('does not render an empty results list when nothing matches', async () => {
    searchAnime.mockResolvedValue([]);
    const user = userEvent.setup();

    render(<SearchBar onSelect={() => {}} />);
    await user.type(screen.getByLabelText('Rechercher un anime'), 'Zzz');

    await waitFor(() => expect(screen.getByText('Aucun anime trouvé.')).toBeInTheDocument());
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows a no-results message when nothing matches', async () => {
    searchAnime.mockResolvedValue([]);
    const user = userEvent.setup();

    render(<SearchBar onSelect={() => {}} />);
    await user.type(screen.getByLabelText('Rechercher un anime'), 'Zzz');

    await waitFor(() => expect(screen.getByText('Aucun anime trouvé.')).toBeInTheDocument());
  });

  it('ignores stale responses from earlier searches', async () => {
    const user = userEvent.setup({ delay: null });

    // Create two manually-controlled promises
    let resolveFirst, resolveSecond;
    const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
    const secondPromise = new Promise(resolve => { resolveSecond = resolve; });

    // Set up mocked searchAnime to return different promises per call
    searchAnime
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    render(<SearchBar onSelect={() => {}} />);
    const input = screen.getByLabelText('Rechercher un anime');

    // Type 'One' - will trigger first search after debounce
    await user.type(input, 'One');

    // Wait for first search to be called
    await waitFor(() => expect(searchAnime).toHaveBeenCalledTimes(1));

    // Type more to get 'One Piece' - will trigger second search after debounce
    await user.type(input, ' Piece');

    // Wait for second search to be called
    await waitFor(() => expect(searchAnime).toHaveBeenCalledTimes(2));

    // Now resolve the second (later) search first with its results
    resolveSecond([{ id: 2, title: 'One Piece' }]);
    await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument());

    // Now resolve the first (earlier) search with different results
    resolveFirst([{ id: 1, title: 'One' }]);

    // Give React time to process any updates
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that the final results still show 'One Piece' (from the second, later search)
    // and not 'One' (from the first, stale search)
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.queryByText('One')).not.toBeInTheDocument();
  });
});
