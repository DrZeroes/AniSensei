import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConflictDialog from '../components/ConflictDialog.jsx';
import { getList, saveList, upsertAnime, removeAnime } from '../storage/listStorage.js';
import {
  serializeList,
  parseImportedList,
  mergeLists,
  applyConflictResolutions,
} from '../storage/exportImport.js';

const STATUS_OPTIONS = ['a_voir', 'vu'];
const NOTE_OPTIONS = ['coup_de_coeur', 'aime', 'pas_aime'];
const SORT_FIELDS = ['title', 'note', 'seasonYear', 'genres', 'studios', 'addedAt'];
const SORT_LABELS = {
  title: 'Titre (A-Z)',
  note: 'Note',
  seasonYear: 'Année',
  genres: 'Genre',
  studios: 'Studio',
  addedAt: "Date d'ajout",
};

const STATUS_LABELS = { a_voir: 'À voir', vu: 'Vu ✓' };
const NOTE_LABELS = {
  '': 'Pas de note',
  coup_de_coeur: '❤️ Coup de cœur',
  aime: '👍 Aimé',
  pas_aime: '👎 Pas aimé',
};

// Mirrors the categories shown on the Stats page so the counts there match what
// filtering to that tab here shows.
const TABS = [
  { id: 'vus', label: 'Vus' },
  { id: 'a_voir', label: 'À voir' },
  { id: 'coup_de_coeur', label: 'Coups de cœur' },
  { id: 'aime', label: 'Aimés' },
  { id: 'pas_aime', label: 'Pas aimés' },
  { id: 'exclus', label: 'Exclus' },
];

function matchesTab(entry, tab) {
  switch (tab) {
    case 'vus':
      return entry.status === 'vu';
    case 'a_voir':
      return entry.status === 'a_voir' && !entry.excluded;
    case 'coup_de_coeur':
    case 'aime':
    case 'pas_aime':
      return entry.note === tab;
    case 'exclus':
      return entry.excluded;
    default:
      return true;
  }
}

function MyList() {
  const navigate = useNavigate();
  const [list, setList] = useState(() => getList());
  const [activeTab, setActiveTab] = useState('vus');
  const [sortField, setSortField] = useState('title');
  const [pendingImport, setPendingImport] = useState(null);

  const visibleList = useMemo(() => {
    const items = list.filter((entry) => matchesTab(entry, activeTab));
    return [...items].sort((a, b) => {
      const aValue = Array.isArray(a[sortField]) ? a[sortField][0] ?? '' : a[sortField] ?? '';
      const bValue = Array.isArray(b[sortField]) ? b[sortField][0] ?? '' : b[sortField] ?? '';
      return String(aValue).localeCompare(String(bValue));
    });
  }, [list, activeTab, sortField]);

  function updateEntry(animeId, changes) {
    const updated = upsertAnime({ animeId, ...changes });
    setList(updated);
  }

  function handleRemove(animeId) {
    setList(removeAnime(animeId));
  }

  function handleExport() {
    const blob = new Blob([serializeList(list)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'anisensei-liste.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();

    try {
      const imported = parseImportedList(text);
      const { merged, conflicts } = mergeLists(list, imported);
      if (conflicts.length === 0) {
        saveList(merged);
        setList(merged);
      } else {
        setPendingImport({ merged, conflicts });
      }
    } catch {
      window.alert('Fichier invalide, import annulé.');
    } finally {
      event.target.value = '';
    }
  }

  function handleResolveConflicts(resolutions) {
    const final = applyConflictResolutions(pendingImport.merged, pendingImport.conflicts, resolutions);
    saveList(final);
    setList(final);
    setPendingImport(null);
  }

  return (
    <section>
      <h2>Ma liste</h2>

      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'tab tab--active' : 'tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="my-list-controls">
        <select value={sortField} onChange={(event) => setSortField(event.target.value)} aria-label="Trier par">
          {SORT_FIELDS.map((field) => (
            <option key={field} value={field}>
              {SORT_LABELS[field]}
            </option>
          ))}
        </select>
        <button type="button" className="my-list-controls__action" onClick={handleExport}>
          Exporter
        </button>
        <label className="my-list-controls__action my-list-controls__action--file">
          Importer
          <input type="file" accept="application/json" onChange={handleImportFile} aria-label="Importer un fichier" />
        </label>
      </div>

      <ul className="my-list">
        {visibleList.map((entry) => (
          <li key={entry.animeId} className="my-list-item">
            {entry.coverImage && <img src={entry.coverImage} alt="" className="my-list-item__cover" />}
            <div className="my-list-item__content">
              <button
                type="button"
                className="my-list-item__title"
                onClick={() => navigate(`/anime/${entry.animeId}`)}
              >
                {entry.title}
              </button>
              <div className="my-list-item__fields">
                <select
                  className={`status-select status-select--${entry.status}`}
                  value={entry.status}
                  aria-label={`Statut de ${entry.title}`}
                  onChange={(event) => updateEntry(entry.animeId, { status: event.target.value })}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {STATUS_LABELS[option]}
                    </option>
                  ))}
                </select>
                <select
                  className={`note-select note-select--${entry.note ?? 'none'}`}
                  value={entry.note ?? ''}
                  aria-label={`Note de ${entry.title}`}
                  onChange={(event) => updateEntry(entry.animeId, { note: event.target.value || null })}
                >
                  <option value="">{NOTE_LABELS['']}</option>
                  {NOTE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {NOTE_LABELS[option]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={entry.comment}
                  aria-label={`Commentaire pour ${entry.title}`}
                  onChange={(event) => updateEntry(entry.animeId, { comment: event.target.value })}
                />
                {entry.excluded && (
                  <button type="button" onClick={() => updateEntry(entry.animeId, { excluded: false })}>
                    Retirer de la liste des exclus
                  </button>
                )}
                <button type="button" onClick={() => handleRemove(entry.animeId)}>
                  Supprimer
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {pendingImport && (
        <ConflictDialog
          conflicts={pendingImport.conflicts}
          onResolve={handleResolveConflicts}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </section>
  );
}

export default MyList;
