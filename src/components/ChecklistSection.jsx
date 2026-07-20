import { useState } from 'react';
import { applyCustomGroups } from '../utils/applyCustomGroups.js';
import { getCustomGroups } from '../storage/customGroups.js';

function ChecklistSection({ title, entries, selectedIds, onToggle, expanded, onToggleExpanded }) {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

  const filtered = entries.filter((entry) => entry.title.toLowerCase().includes(search.toLowerCase()));
  // Only groups entries the user has manually put in a custom group (created
  // from "Ma liste") — no automatic title-based guessing.
  const groups = applyCustomGroups(filtered, getCustomGroups());

  function toggleGroup(key) {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function renderCheckbox(entry) {
    return (
      <label key={entry.animeId} className="checklist__item">
        <input
          type="checkbox"
          checked={selectedIds.includes(entry.animeId)}
          onChange={() => onToggle(entry)}
        />
        {entry.title}
      </label>
    );
  }

  return (
    <div className="checklist">
      <button
        type="button"
        className="checklist__toggle"
        aria-expanded={expanded}
        onClick={onToggleExpanded}
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
          {groups.map((group) => {
            if (group.entries.length === 1 && !group.custom) return renderCheckbox(group.entries[0]);

            const groupExpanded = !!expandedGroups[group.key];
            const selectedCount = group.entries.filter((entry) => selectedIds.includes(entry.animeId)).length;

            return (
              <div key={group.key} className="checklist__group">
                <button
                  type="button"
                  className="checklist__group-toggle"
                  aria-expanded={groupExpanded}
                  onClick={() => toggleGroup(group.key)}
                >
                  <span className="checklist__group-title">{group.custom.title}</span>
                  <span className="checklist__group-count">
                    {selectedCount > 0 ? `${selectedCount}/${group.entries.length}` : group.entries.length} animes
                  </span>
                </button>
                {groupExpanded && (
                  <div className="checklist__group-items">{group.entries.map(renderCheckbox)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ChecklistSection;
