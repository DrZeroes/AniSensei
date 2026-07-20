import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyList from './MyList.jsx';
import { getList, saveList, upsertAnime, removeAnime } from '../storage/listStorage.js';
import { getAnimeDetails } from '../api/queries.js';
import { upsertCustomGroup } from '../storage/customGroups.js';

vi.mock('../storage/listStorage.js', () => ({
  getList: vi.fn(),
  saveList: vi.fn(),
  upsertAnime: vi.fn(),
  removeAnime: vi.fn(),
}));
vi.mock('../api/queries.js', () => ({
  getAnimeDetails: vi.fn(),
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
    saveList.mockReset();
    upsertAnime.mockReset();
    removeAnime.mockReset().mockReturnValue([]);
    getAnimeDetails.mockReset();
    // Custom groups are real localStorage (not mocked), so clear between tests.
    localStorage.clear();
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

  it('backfills tags from AniList for entries added before tags were tracked', async () => {
    const entryWithoutTags = { ...entry, tags: undefined };
    getList.mockReturnValue([entryWithoutTags]);
    getAnimeDetails.mockResolvedValue({ tags: ['Pirates', 'Time Skip'] });

    renderMyList();

    await waitFor(() => expect(getAnimeDetails).toHaveBeenCalledWith(1));
    await waitFor(() => expect(saveList).toHaveBeenCalled());

    // The backfilled tag is now offered as a filter suggestion (shown translated).
    const datalist = document.getElementById('my-list-tag-options');
    expect([...datalist.options].map((option) => option.value)).toContain('Ellipse temporelle');
  });

  it('does not re-fetch details for entries that already have tags (even an empty list)', async () => {
    getList.mockReturnValue([{ ...entry, tags: [] }]);

    renderMyList();
    await waitFor(() => screen.getByText('One Piece'));

    expect(getAnimeDetails).not.toHaveBeenCalled();
  });

  it('filters the visible list by title as you type', async () => {
    getList.mockReturnValue([entry, { ...entry, animeId: 2, title: 'Fate/stay night' }]);
    const user = userEvent.setup();

    renderMyList();
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.getByText('Fate/stay night')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Rechercher dans ma liste par titre'), 'fate');

    expect(screen.getByText('Fate/stay night')).toBeInTheDocument();
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
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

    const genreInput = screen.getByLabelText('Filtrer par genre');
    await user.type(genreInput, 'Action');
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.queryByText('Fate/stay night')).not.toBeInTheDocument();
    await user.clear(genreInput);

    await user.selectOptions(screen.getByLabelText('Filtrer par studio'), 'Ufotable');
    expect(screen.getByText('Fate/stay night')).toBeInTheDocument();
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Filtrer par studio'), 'Tous les studios');

    await user.type(screen.getByLabelText('Filtrer par tag'), 'Pirates');
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.queryByText('Fate/stay night')).not.toBeInTheDocument();
  });

  it('finds a genre by typing its French translation even though it is stored/filtered in English', async () => {
    getList.mockReturnValue([
      entry, // genres: ['Action']
      { ...entry, animeId: 2, title: 'Fate/stay night', genres: ['Slice of Life'] },
    ]);
    const user = userEvent.setup();

    renderMyList();
    await user.type(screen.getByLabelText('Filtrer par genre'), 'Tranche de vie');

    expect(screen.getByText('Fate/stay night')).toBeInTheDocument();
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
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

  it('collapses entries that belong to a custom group into one block', async () => {
    getList.mockReturnValue([
      { ...entry, animeId: 1, title: 'Kara no Kyoukai: Fukan Fuukei', note: null },
      { ...entry, animeId: 2, title: 'Kara no Kyoukai: Mirai Fukuin', note: null },
      { ...entry, animeId: 3, title: 'Naruto', note: null },
    ]);
    upsertCustomGroup({ title: 'Kara no Kyoukai: Fukan Fuukei', animeIds: [1, 2] });
    const user = userEvent.setup();

    renderMyList();

    // Collapsed by default: only the group header and the unrelated single
    // entry show up, not the individual franchise entries' controls.
    expect(screen.getByText('2 animes')).toBeInTheDocument();
    expect(screen.getByText('Naruto')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kara no Kyoukai: Fukan Fuukei' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Statut de Kara no Kyoukai: Fukan Fuukei')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /2 animes/ }));

    expect(screen.getByRole('button', { name: 'Kara no Kyoukai: Fukan Fuukei' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kara no Kyoukai: Mirai Fukuin' })).toBeInTheDocument();
  });

  it('flags a custom group that contains a "coup de cœur" entry', () => {
    getList.mockReturnValue([
      { ...entry, animeId: 1, title: 'Kara no Kyoukai: Fukan Fuukei', note: 'coup_de_coeur' },
      { ...entry, animeId: 2, title: 'Kara no Kyoukai: Mirai Fukuin', note: null },
    ]);
    upsertCustomGroup({ title: 'Kara no Kyoukai: Fukan Fuukei', animeIds: [1, 2] });

    renderMyList();

    expect(screen.getByText('Coup de cœur dedans')).toBeInTheDocument();
  });

  it('does not auto-group unrelated titles that merely share a common word', () => {
    getList.mockReturnValue([
      { ...entry, animeId: 1, title: '5 Centimeters per Second' },
      { ...entry, animeId: 2, title: 'Clannad' },
      { ...entry, animeId: 3, title: 'Puella Magi Madoka Magica' },
    ]);

    renderMyList();

    expect(screen.getByText('5 Centimeters per Second')).toBeInTheDocument();
    expect(screen.getByText('Clannad')).toBeInTheDocument();
    expect(screen.getByText('Puella Magi Madoka Magica')).toBeInTheDocument();
    expect(screen.queryByText(/^\d+ animes$/)).not.toBeInTheDocument();
  });

  it('lets the user create a custom group from "Mes groupes", which then collapses in "Ma liste"', async () => {
    getList.mockReturnValue([
      { ...entry, animeId: 1, title: 'Clannad', coverImage: 'clannad.jpg' },
      { ...entry, animeId: 2, title: 'Puella Magi Madoka Magica', coverImage: 'madoka.jpg' },
    ]);
    const user = userEvent.setup();
    renderMyList();

    await user.click(screen.getByRole('tab', { name: 'Mes groupes' }));
    await user.click(screen.getByRole('button', { name: 'Créer un groupe' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter Clannad au groupe' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter Puella Magi Madoka Magica au groupe' }));

    // Default proposed title is whichever anime is currently first (Clannad,
    // added first).
    expect(screen.getByLabelText('Titre du groupe')).toHaveValue('Clannad');

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(screen.getByText('Clannad')).toBeInTheDocument();
    expect(screen.getByText('2 animes')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Ma liste' }));
    expect(screen.getByText('2 animes')).toBeInTheDocument();
    expect(screen.queryByText('Puella Magi Madoka Magica')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /2 animes/ }));
    expect(screen.getByText('Puella Magi Madoka Magica')).toBeInTheDocument();
  });

  it('lets the user reorder members within a group, which updates the default title proposal', async () => {
    getList.mockReturnValue([
      { ...entry, animeId: 1, title: 'Clannad' },
      { ...entry, animeId: 2, title: 'Puella Magi Madoka Magica' },
    ]);
    const user = userEvent.setup();
    renderMyList();

    await user.click(screen.getByRole('tab', { name: 'Mes groupes' }));
    await user.click(screen.getByRole('button', { name: 'Créer un groupe' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter Clannad au groupe' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter Puella Magi Madoka Magica au groupe' }));

    await user.click(screen.getByRole('button', { name: 'Monter Puella Magi Madoka Magica' }));

    expect(screen.getByLabelText('Titre du groupe')).toHaveValue('Puella Magi Madoka Magica');

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Puella Magi Madoka Magica')).toBeInTheDocument();
  });

  it('allows renaming a custom group and deleting it from "Mes groupes"', async () => {
    getList.mockReturnValue([
      { ...entry, animeId: 1, title: 'Clannad' },
      { ...entry, animeId: 2, title: 'Puella Magi Madoka Magica' },
    ]);
    const user = userEvent.setup();
    renderMyList();

    await user.click(screen.getByRole('tab', { name: 'Mes groupes' }));
    await user.click(screen.getByRole('button', { name: 'Créer un groupe' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter Clannad au groupe' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter Puella Magi Madoka Magica au groupe' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    const titleInput = screen.getByLabelText('Titre du groupe');
    await user.clear(titleInput);
    await user.type(titleInput, 'Mes tranches de vie tristes');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(screen.getByText('Mes tranches de vie tristes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(screen.queryByText('Mes tranches de vie tristes')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Ma liste' }));
    expect(screen.getByText('Clannad')).toBeInTheDocument();
    expect(screen.getByText('Puella Magi Madoka Magica')).toBeInTheDocument();
  });

  it('offers anime to add to a group sorted alphabetically', async () => {
    getList.mockReturnValue([
      { ...entry, animeId: 1, title: 'Zelda Anime' },
      { ...entry, animeId: 2, title: 'Attack on Titan' },
      { ...entry, animeId: 3, title: 'Naruto' },
    ]);
    const user = userEvent.setup();
    renderMyList();

    await user.click(screen.getByRole('tab', { name: 'Mes groupes' }));
    await user.click(screen.getByRole('button', { name: 'Créer un groupe' }));

    const titles = screen.getAllByRole('listitem').filter((item) => item.querySelector('button[aria-label^="Ajouter"]'));
    expect(titles.map((item) => item.textContent.replace('Ajouter', '').trim())).toEqual([
      'Attack on Titan',
      'Naruto',
      'Zelda Anime',
    ]);
  });

  it('does not offer anime that already belong to a different group', async () => {
    getList.mockReturnValue([
      { ...entry, animeId: 1, title: 'Clannad' },
      { ...entry, animeId: 2, title: 'Puella Magi Madoka Magica' },
      { ...entry, animeId: 3, title: 'Naruto' },
    ]);
    upsertCustomGroup({ title: 'Clannad', animeIds: [1] });
    const user = userEvent.setup();
    renderMyList();

    await user.click(screen.getByRole('tab', { name: 'Mes groupes' }));
    await user.click(screen.getByRole('button', { name: 'Créer un groupe' }));

    expect(screen.queryByRole('button', { name: 'Ajouter Clannad au groupe' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter Puella Magi Madoka Magica au groupe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter Naruto au groupe' })).toBeInTheDocument();
  });

  it('still offers a group\'s own members when editing it', async () => {
    getList.mockReturnValue([
      { ...entry, animeId: 1, title: 'Clannad' },
      { ...entry, animeId: 2, title: 'Puella Magi Madoka Magica' },
    ]);
    upsertCustomGroup({ title: 'Clannad', animeIds: [1] });
    const user = userEvent.setup();
    renderMyList();

    await user.click(screen.getByRole('tab', { name: 'Mes groupes' }));
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await user.click(screen.getByRole('button', { name: 'Retirer Clannad du groupe' }));

    // Clannad was just removed from the draft but the group is still being
    // edited, so it should be re-addable without saving first.
    expect(screen.getByRole('button', { name: 'Ajouter Clannad au groupe' })).toBeInTheDocument();
  });

  it('filters "Ma liste" to show only anime without a group, or only those in a group', async () => {
    getList.mockReturnValue([
      { ...entry, animeId: 1, title: 'Clannad' },
      { ...entry, animeId: 2, title: 'Naruto' },
    ]);
    upsertCustomGroup({ title: 'Clannad', animeIds: [1] });
    const user = userEvent.setup();
    renderMyList();

    await user.selectOptions(screen.getByLabelText('Filtrer par groupe'), 'sans_groupe');
    expect(screen.getByText('Naruto')).toBeInTheDocument();
    expect(screen.queryByText('Clannad')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filtrer par groupe'), 'dans_groupe');
    expect(screen.getByText('Clannad')).toBeInTheDocument();
    expect(screen.queryByText('Naruto')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filtrer par groupe'), 'tous');
    expect(screen.getByText('Clannad')).toBeInTheDocument();
    expect(screen.getByText('Naruto')).toBeInTheDocument();
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

  it('includes custom groups in the exported JSON', async () => {
    getList.mockReturnValue([{ ...entry, animeId: 1, title: 'Clannad' }]);
    let capturedBlob;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob) => {
        capturedBlob = blob;
        return 'blob:mock';
      }),
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();

    renderMyList();
    await user.click(screen.getByRole('tab', { name: 'Mes groupes' }));
    await user.click(screen.getByRole('button', { name: 'Créer un groupe' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter Clannad au groupe' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await user.click(screen.getByRole('tab', { name: 'Ma liste' }));
    await user.click(screen.getByRole('button', { name: 'Exporter' }));

    const parsed = JSON.parse(await capturedBlob.text());
    expect(parsed.customGroups).toHaveLength(1);
    expect(parsed.customGroups[0]).toMatchObject({ title: 'Clannad', animeIds: [1] });

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('imports custom groups from the new export format alongside the list', async () => {
    const importedGroup = { id: 'g1', title: 'Groupe importé', animeIds: [1], coverAnimeId: 1 };
    const file = new File([JSON.stringify({ list: [entry], customGroups: [importedGroup] })], 'liste.json', {
      type: 'application/json',
    });
    const user = userEvent.setup();

    renderMyList();
    await user.upload(screen.getByLabelText('Importer un fichier'), file);
    await user.click(screen.getByRole('tab', { name: 'Mes groupes' }));

    expect(screen.getByText('Groupe importé')).toBeInTheDocument();
  });
});
