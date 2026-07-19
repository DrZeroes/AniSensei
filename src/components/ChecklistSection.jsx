import { useState } from 'react';

function ChecklistSection({ title, entries, selectedIds, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = entries.filter((entry) => entry.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="checklist">
      <button
        type="button"
        className="checklist__toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {title}
      </button>
      {expanded && (
        <div className="checklist__body">
          <input
            type="text"
            className="checklist__search"
            placeholder="Rechercher..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={`Rechercher dans ${title}`}
          />
          {entries.length === 0 && <p className="checklist__empty">Aucun anime ici.</p>}
          {entries.length > 0 && filtered.length === 0 && (
            <p className="checklist__empty">Aucun résultat.</p>
          )}
          {filtered.map((entry) => (
            <label key={entry.animeId} className="checklist__item">
              <input
                type="checkbox"
                checked={selectedIds.includes(entry.animeId)}
                onChange={() => onToggle(entry)}
              />
              {entry.title}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default ChecklistSection;
