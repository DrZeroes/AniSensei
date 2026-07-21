import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stats from './Stats.jsx';
import { getList } from '../storage/listStorage.js';
import { getAnimeDetails } from '../api/queries.js';

vi.mock('../storage/listStorage.js', () => ({
  getList: vi.fn(),
  saveList: vi.fn(),
}));
vi.mock('../api/queries.js', () => ({
  getAnimeDetails: vi.fn(),
}));

const watched = {
  animeId: 1,
  status: 'vu',
  note: 'coup_de_coeur',
  excluded: false,
  genres: ['Action', 'Fantasy'],
  studios: ['Ufotable'],
  studiosRefreshed: true,
  tags: ['Time Skip'],
};
const watched2 = {
  animeId: 2,
  status: 'vu',
  note: 'aime',
  excluded: false,
  genres: ['Action'],
  studios: ['Ufotable'],
  studiosRefreshed: true,
  tags: ['Time Skip', 'Tsundere'],
};
const toWatch = {
  animeId: 3,
  status: 'a_voir',
  note: null,
  excluded: false,
  genres: [],
  studios: [],
  studiosRefreshed: true,
  tags: [],
};

describe('Stats', () => {
  beforeEach(() => {
    getList.mockReset().mockReturnValue([watched, watched2, toWatch]);
    getAnimeDetails.mockReset();
  });

  it('shows the summary tiles computed from the personal list', () => {
    render(<Stats />);

    expect(screen.getByText('3').closest('.stat-tile')).toHaveTextContent('Animes dans ma liste');
    expect(screen.getByText('2').closest('.stat-tile')).toHaveTextContent('Vus');
    expect(screen.getByText('Action').closest('.stat-tile')).toHaveTextContent('Genre favori');
    expect(screen.getByText('Ufotable').closest('.stat-tile')).toHaveTextContent('Studio favori');
  });

  it('hides the genre/studio breakdown until expanded', () => {
    render(<Stats />);

    expect(screen.queryByText('Fantastique')).not.toBeInTheDocument();
  });

  it('shows the genre breakdown with counts once expanded', async () => {
    const user = userEvent.setup();
    render(<Stats />);

    await user.click(screen.getByRole('button', { name: 'Voir la répartition par genre' }));

    const list = screen.getByText('Fantastique').closest('ul');
    const actionRow = within(list).getByText('Action').closest('li');
    expect(actionRow).toHaveTextContent('2');
    const fantasyRow = within(list).getByText('Fantastique').closest('li');
    expect(fantasyRow).toHaveTextContent('1');
  });

  it('shows the top-tags breakdown with counts once expanded', async () => {
    const user = userEvent.setup();
    render(<Stats />);

    await user.click(screen.getByRole('button', { name: 'Voir le top 20 des tags' }));

    const list = screen.getByText('Tsundere').closest('ul');
    const timeSkipRow = within(list).getByText('Ellipse temporelle').closest('li'); // "Time Skip", translated
    expect(timeSkipRow).toHaveTextContent('2');
    const tsundereRow = within(list).getByText('Tsundere').closest('li');
    expect(tsundereRow).toHaveTextContent('1');
  });

  it('shows which anime match a genre/studio/tag when clicked, purely from the local list (no API call)', async () => {
    getList.mockReturnValue([
      { ...watched, title: 'Fate/Zero' },
      { ...watched2, title: 'Fate/stay night' },
    ]);
    const user = userEvent.setup();
    render(<Stats />);

    await user.click(screen.getByRole('button', { name: 'Voir la répartition par genre' }));
    await user.click(screen.getByRole('button', { name: /Action/ }));

    expect(screen.getByText('Fate/Zero')).toBeInTheDocument();
    expect(screen.getByText('Fate/stay night')).toBeInTheDocument();
    expect(getAnimeDetails).not.toHaveBeenCalled();

    // Clicking again collapses the list of titles.
    await user.click(screen.getByRole('button', { name: /Action/ }));
    expect(screen.queryByText('Fate/Zero')).not.toBeInTheDocument();
  });

  it('closes the "which anime" panel when clicking elsewhere on the page', async () => {
    getList.mockReturnValue([{ ...watched, title: 'Fate/Zero' }]);
    const user = userEvent.setup();
    render(
      <div>
        <Stats />
        <button type="button">Elsewhere</button>
      </div>
    );

    await user.click(screen.getByRole('button', { name: 'Voir la répartition par genre' }));
    await user.click(screen.getByRole('button', { name: /Action/ }));
    expect(screen.getByText('Fate/Zero')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByText('Fate/Zero')).not.toBeInTheDocument();
  });

  it('shows a message when there is nothing watched yet', async () => {
    getList.mockReturnValue([toWatch]);
    const user = userEvent.setup();
    render(<Stats />);

    await user.click(screen.getByRole('button', { name: 'Voir la répartition par genre' }));

    expect(screen.getByText("Rien à afficher pour l'instant.")).toBeInTheDocument();
  });

  it('refreshes studios still carrying pre-fix data (producers, not the animation studio) even if "Mes animés" was never opened', async () => {
    const stale = { ...watched, studiosRefreshed: undefined, studios: ['Aniplex', 'Ufotable'] };
    getList.mockReturnValue([stale]);
    getAnimeDetails.mockResolvedValue({ tags: stale.tags, studios: ['Ufotable'] });

    render(<Stats />);

    // Before the refresh resolves, the stale data (Aniplex first) is still shown.
    expect(screen.getByText('Aniplex').closest('.stat-tile')).toHaveTextContent('Studio favori');

    await waitFor(() => expect(getAnimeDetails).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(screen.getByText('Ufotable').closest('.stat-tile')).toHaveTextContent('Studio favori')
    );
  });
});
