import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stats from './Stats.jsx';
import { getList } from '../storage/listStorage.js';

vi.mock('../storage/listStorage.js', () => ({
  getList: vi.fn(),
}));

const watched = {
  animeId: 1,
  status: 'vu',
  note: 'coup_de_coeur',
  excluded: false,
  genres: ['Action', 'Fantasy'],
  studios: ['Ufotable'],
  tags: ['Time Skip'],
};
const watched2 = {
  animeId: 2,
  status: 'vu',
  note: 'aime',
  excluded: false,
  genres: ['Action'],
  studios: ['Ufotable'],
  tags: ['Time Skip', 'Tsundere'],
};
const toWatch = { animeId: 3, status: 'a_voir', note: null, excluded: false, genres: [], studios: [] };

describe('Stats', () => {
  beforeEach(() => {
    getList.mockReset().mockReturnValue([watched, watched2, toWatch]);
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

    expect(screen.queryByText('Fantasy')).not.toBeInTheDocument();
  });

  it('shows the genre breakdown with counts once expanded', async () => {
    const user = userEvent.setup();
    render(<Stats />);

    await user.click(screen.getByRole('button', { name: 'Voir la répartition par genre' }));

    const list = screen.getByText('Fantasy').closest('ul');
    const actionRow = within(list).getByText('Action').closest('li');
    expect(actionRow).toHaveTextContent('2');
    const fantasyRow = within(list).getByText('Fantasy').closest('li');
    expect(fantasyRow).toHaveTextContent('1');
  });

  it('shows the top-tags breakdown with counts once expanded', async () => {
    const user = userEvent.setup();
    render(<Stats />);

    await user.click(screen.getByRole('button', { name: 'Voir le top 20 des tags' }));

    const list = screen.getByText('Tsundere').closest('ul');
    const timeSkipRow = within(list).getByText('Time Skip').closest('li');
    expect(timeSkipRow).toHaveTextContent('2');
    const tsundereRow = within(list).getByText('Tsundere').closest('li');
    expect(tsundereRow).toHaveTextContent('1');
  });

  it('shows a message when there is nothing watched yet', async () => {
    getList.mockReturnValue([toWatch]);
    const user = userEvent.setup();
    render(<Stats />);

    await user.click(screen.getByRole('button', { name: 'Voir la répartition par genre' }));

    expect(screen.getByText("Rien à afficher pour l'instant.")).toBeInTheDocument();
  });
});
