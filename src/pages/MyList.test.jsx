import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyList from './MyList.jsx';
import { getList, upsertAnime, removeAnime } from '../storage/listStorage.js';

vi.mock('../storage/listStorage.js', () => ({
  getList: vi.fn(),
  saveList: vi.fn(),
  upsertAnime: vi.fn(),
  removeAnime: vi.fn(),
}));

const entry = {
  animeId: 1,
  title: 'One Piece',
  status: 'vu',
  note: 'coup_de_coeur',
  excluded: false,
  comment: '',
  genres: ['Action'],
  studios: ['Toei Animation'],
  tags: ['Pirates'],
  seasonYear: 1999,
  addedAt: 't',
};

function renderMyList() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MyList />
    </MemoryRouter>
  );
}

describe('MyList', () => {
  beforeEach(() => {
    getList.mockReset().mockReturnValue([entry]);
    upsertAnime.mockReset();
    removeAnime.mockReset().mockReturnValue([]);
  });

  it('renders entries from the stored list', () => {
    renderMyList();
    expect(screen.getByText('One Piece')).toBeInTheDocument();
  });

  it('shows only watched anime on the "Vus" tab by default', () => {
    getList.mockReturnValue([entry, { ...entry, animeId: 2, title: 'Naruto', status: 'a_voir' }]);

    renderMyList();

    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.queryByText('Naruto')).not.toBeInTheDocument();
  });

  it('shows only excluded anime on the "Exclus" tab', async () => {
    getList.mockReturnValue([
      entry,
      { ...entry, animeId: 3, title: 'Bad Anime', status: 'a_voir', excluded: true },
    ]);
    const user = userEvent.setup();

    renderMyList();
    await user.click(screen.getByRole('tab', { name: 'Exclus' }));

    expect(screen.getByText('Bad Anime')).toBeInTheDocument();
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
  });

  it('shows anime still to watch on the "À voir" tab, excluding excluded ones', async () => {
    getList.mockReturnValue([
      entry,
      { ...entry, animeId: 2, title: 'Naruto', status: 'a_voir', excluded: false },
      { ...entry, animeId: 3, title: 'Bad Anime', status: 'a_voir', excluded: true },
    ]);
    const user = userEvent.setup();

    renderMyList();
    await user.click(screen.getByRole('tab', { name: 'À voir' }));

    expect(screen.getByText('Naruto')).toBeInTheDocument();
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
    expect(screen.queryByText('Bad Anime')).not.toBeInTheDocument();
  });

  it('filters by note on the "Aimés" and "Pas aimés" tabs', async () => {
    getList.mockReturnValue([
      entry, // note: coup_de_coeur
      { ...entry, animeId: 2, title: 'Naruto', note: 'aime' },
      { ...entry, animeId: 3, title: 'Bad Anime', note: 'pas_aime' },
    ]);
    const user = userEvent.setup();

    renderMyList();
    await user.click(screen.getByRole('tab', { name: 'Aimés' }));
    expect(screen.getByText('Naruto')).toBeInTheDocument();
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Pas aimés' }));
    expect(screen.getByText('Bad Anime')).toBeInTheDocument();
    expect(screen.queryByText('Naruto')).not.toBeInTheDocument();
  });

  it('sorts entries alphabetically by title by default', () => {
    getList.mockReturnValue([
      { ...entry, animeId: 2, title: 'Zelda Anime' },
      { ...entry, animeId: 3, title: 'Attack on Titan' },
      entry, // 'One Piece'
    ]);

    renderMyList();

    const titles = screen.getAllByRole('button', { name: /Zelda Anime|Attack on Titan|One Piece/ });
    expect(titles.map((button) => button.textContent)).toEqual(['Attack on Titan', 'One Piece', 'Zelda Anime']);
  });

  it('filters the visible list by genre, studio, and tag, offering only values present in the list', async () => {
    getList.mockReturnValue([
      entry, // genres: Action, studios: Toei Animation, tags: Pirates
      {
        ...entry,
        animeId: 2,
        title: 'Fate/stay night',
        genres: ['Fantasy'],
        studios: ['Ufotable'],
        tags: ['Mahou Shoujo'],
      },
    ]);
    const user = userEvent.setup();

    renderMyList();
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.getByText('Fate/stay night')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filtrer par genre'), 'Action');
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.queryByText('Fate/stay night')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Filtrer par genre'), 'Tous les genres');

    await user.selectOptions(screen.getByLabelText('Filtrer par studio'), 'Ufotable');
    expect(screen.getByText('Fate/stay night')).toBeInTheDocument();
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Filtrer par studio'), 'Tous les studios');

    await user.selectOptions(screen.getByLabelText('Filtrer par tag'), 'Pirates');
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.queryByText('Fate/stay night')).not.toBeInTheDocument();
  });

  it('sorts by tag when that sort option is chosen', async () => {
    getList.mockReturnValue([
      { ...entry, animeId: 2, title: 'Zelda Anime', tags: ['Zealous'] },
      { ...entry, animeId: 3, title: 'Attack on Titan', tags: ['Anguish'] },
      entry, // tags: ['Pirates']
    ]);
    const user = userEvent.setup();

    renderMyList();
    await user.selectOptions(screen.getByLabelText('Trier par'), 'tags');

    const titles = screen.getAllByRole('button', { name: /Zelda Anime|Attack on Titan|One Piece/ });
    expect(titles.map((button) => button.textContent)).toEqual(['Attack on Titan', 'One Piece', 'Zelda Anime']);
  });

  it('removes an entry when "Supprimer" is clicked', async () => {
    const user = userEvent.setup();
    renderMyList();

    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(removeAnime).toHaveBeenCalledWith(1);
  });

  it('updates the note via the select', async () => {
    upsertAnime.mockReturnValue([{ ...entry, note: 'aime' }]);
    const user = userEvent.setup();

    renderMyList();
    await user.selectOptions(screen.getByLabelText('Note de One Piece'), 'aime');

    expect(upsertAnime).toHaveBeenCalledWith(expect.objectContaining({ animeId: 1, note: 'aime' }));
  });

  it('shows a conflict dialog when the import has diverging entries', async () => {
    const importedEntry = { ...entry, status: 'a_voir' };
    const file = new File([JSON.stringify([importedEntry])], 'liste.json', {
      type: 'application/json',
    });
    const user = userEvent.setup();

    renderMyList();
    await user.upload(screen.getByLabelText('Importer un fichier'), file);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  it('exports the list as a downloadable JSON file', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
    const user = userEvent.setup();

    renderMyList();
    await user.click(screen.getByRole('button', { name: 'Exporter' }));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
