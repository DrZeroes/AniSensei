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
const SORT_FIELDS = ['note', 'seasonYear', 'genres', 'studios'];

function MyList() {
  const navigate = useNavigate();
  const [list, setList] = useState(() => getList());
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('addedAt');
  const [pendingImport, setPendingImport] = useState(null);

  const visibleList = useMemo(() => {
    let items = list;
    if (statusFilter) {
      items = items.filter((entry) => entry.status === statusFilter);
    }
    return [...items].sort((a, b) => {
      const aValue = Array.isArray(a[sortField]) ? a[sortField][0] ?? '' : a[sortField] ?? '';
      const bValue = Array.isArray(b[sortField]) ? b[sortField][0] ?? '' : b[sortField] ?? '';
      return String(aValue).localeCompare(String(bValue));
    });
  }, [list, statusFilter, sortField]);

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
      <div className="my-list-controls">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select value={sortField} onChange={(event) => setSortField(event.target.value)} aria-label="Trier par">
          <option value="addedAt">Date d'ajout</option>
          {SORT_FIELDS.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
        <button type="button" onClick={handleExport}>
          Exporter
        </button>
        <label>
          Importer
          <input type="file" accept="application/json" onChange={handleImportFile} aria-label="Importer un fichier" />
        </label>
      </div>

      <ul>
        {visibleList.map((entry) => (
          <li key={entry.animeId}>
            <button type="button" onClick={() => navigate(`/anime/${entry.animeId}`)}>
              {entry.title}
            </button>
            <select
              value={entry.status}
              aria-label={`Statut de ${entry.title}`}
              onChange={(event) => updateEntry(entry.animeId, { status: event.target.value })}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={entry.note ?? ''}
              aria-label={`Note de ${entry.title}`}
              onChange={(event) => updateEntry(entry.animeId, { note: event.target.value || null })}
            >
              <option value="">Pas de note</option>
              {NOTE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={entry.comment}
              aria-label={`Commentaire pour ${entry.title}`}
              onChange={(event) => updateEntry(entry.animeId, { comment: event.target.value })}
            />
            <button type="button" onClick={() => handleRemove(entry.animeId)}>
              Supprimer
            </button>
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
