import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stats from './Stats.jsx';
import { getList } from '../storage/listStorage.js';
import { getAnimeDetails } from '../api/queries.js';
import { upsertCustomGroup } from '../storage/customGroups.js';

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
    localStorage.clear(); // custom groups are real localStorage, not mocked
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

  it('shows a year breakdown, and which anime match a given year when clicked', async () => {
    getList.mockReturnValue([
      { ...watched, title: 'Fate/Zero', seasonYear: 2011 },
      { ...watched2, title: 'Fate/stay night', seasonYear: 2006 },
    ]);
    const user = userEvent.setup();
    render(<Stats />);

    await user.click(screen.getByRole('button', { name: 'Voir la répartition par année' }));

    // Chronological (oldest first), unlike the count-sorted breakdowns.
    const yearList = screen.getByText('2006').closest('ul');
    const labels = within(yearList).getAllByText(/^\d{4}$/);
    expect(labels.map((el) => el.textContent)).toEqual(['2006', '2011']);

    await user.click(screen.getByText('2011').closest('button'));
    expect(screen.getByText('Fate/Zero')).toBeInTheDocument();
    expect(screen.queryByText('Fate/stay night')).not.toBeInTheDocument();
  });

  it('lets the user switch the year breakdown between chronological and most-watched-first sorting', async () => {
    getList.mockReturnValue([
      { ...watched, animeId: 1, seasonYear: 2006 },
      { ...watched2, animeId: 2, seasonYear: 2011 },
      { ...watched, animeId: 3, seasonYear: 2011 },
      { ...watched2, animeId: 4, seasonYear: 2020 },
    ]);
    const user = userEvent.setup();
    render(<Stats />);

    await user.click(screen.getByRole('button', { name: 'Voir la répartition par année' }));

    const yearList = screen.getByText('2006').closest('ul');
    expect(within(yearList).getAllByText(/^\d{4}$/).map((el) => el.textContent)).toEqual([
      '2006',
      '2011',
      '2020',
    ]);

    await user.click(screen.getByRole('button', { name: "Nombre d'anime vu" }));
    expect(within(yearList).getAllByText(/^\d{4}$/).map((el) => el.textContent)).toEqual([
      '2011',
      '2006',
      '2020',
    ]);

    await user.click(screen.getByRole('button', { name: 'Date' }));
    expect(within(yearList).getAllByText(/^\d{4}$/).map((el) => el.textContent)).toEqual([
      '2006',
      '2011',
      '2020',
    ]);
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

  it('sorts the matching anime/groups alphabetically', async () => {
    getList.mockReturnValue([
      { ...watched, title: 'Zelda Anime' },
      { ...watched2, title: 'Attack on Titan' },
    ]);
    const user = userEvent.setup();
    render(<Stats />);

    await user.click(screen.getByRole('button', { name: 'Voir la répartition par genre' }));
    await user.click(screen.getByRole('button', { name: /Action/ }));

    const titlesList = screen.getByText('Zelda Anime').closest('ul');
    const items = within(titlesList).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['Attack on Titan', 'Zelda Anime']);
  });

  it('groups matching anime under their custom group name, collapsed until clicked', async () => {
    getList.mockReturnValue([
      { ...watched, animeId: 1, title: 'Fate/Zero' },
      { ...watched2, animeId: 2, title: 'Fate/stay night' },
    ]);
    upsertCustomGroup({ title: 'Fate', animeIds: [2, 1] });
    const user = userEvent.setup();
    render(<Stats />);

    await user.click(screen.getByRole('button', { name: 'Voir la répartition par genre' }));
    await user.click(screen.getByRole('button', { name: /Action/ }));

    expect(screen.getByText('Fate')).toBeInTheDocument();
    expect(screen.getByText('(2 animes)')).toBeInTheDocument();
    expect(screen.queryByText('Fate/stay night')).not.toBeInTheDocument();
    expect(screen.queryByText('Fate/Zero')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Fate/ }));

    expect(screen.getByText('Fate/stay night')).toBeInTheDocument();
    expect(screen.getByText('Fate/Zero')).toBeInTheDocument();
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
