import { useEffect, useRef, useState } from 'react';
import { getList } from '../storage/listStorage.js';
import { backfillListMetadata } from '../storage/backfillMetadata.js';
import { getCustomGroups } from '../storage/customGroups.js';
import { applyCustomGroups } from '../utils/applyCustomGroups.js';
import { computeStats } from '../stats/computeStats.js';
import { translateGenre } from '../i18n/genreLabels.js';
import { translateTag } from '../i18n/tagLabels.js';

function StatTile({ label, value }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile__value">{value}</span>
      <span className="stat-tile__label">{label}</span>
    </div>
  );
}

function matchesFieldValue(entry, field, name) {
  const raw = entry[field];
  return Array.isArray(raw) ? raw.includes(name) : raw === name;
}

function BreakdownSection({
  title,
  counts,
  list,
  field,
  customGroups,
  translate = (name) => name,
  sortableByValue = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedName, setSelectedName] = useState(null);
  const [expandedMatchGroups, setExpandedMatchGroups] = useState({});
  // Only meaningful when sortableByValue: the incoming `counts` is already
  // chronological (see computeStats), "count" re-sorts it most-watched first.
  const [sortMode, setSortMode] = useState('value');
  const displayedCounts = sortableByValue && sortMode === 'count' ? [...counts].sort((a, b) => b[1] - a[1]) : counts;
  const max = Math.max(1, ...counts.map(([, count]) => count));
  const containerRef = useRef(null);

  function toggleSelected(name) {
    setSelectedName((prev) => (prev === name ? null : name));
  }

  function toggleMatchGroup(key) {
    setExpandedMatchGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Clicking anywhere outside the currently open "which anime" panel closes it.
  useEffect(() => {
    if (!selectedName) return undefined;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setSelectedName(null);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [selectedName]);

  return (
    <div className="stats-breakdown" ref={containerRef}>
      <button
        type="button"
        className="stats-breakdown__toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {title}
      </button>
      {expanded && sortableByValue && (
        <div className="stats-breakdown__sort-toggle" role="group" aria-label="Trier par">
          <button type="button" aria-pressed={sortMode === 'value'} onClick={() => setSortMode('value')}>
            Date
          </button>
          <button type="button" aria-pressed={sortMode === 'count'} onClick={() => setSortMode('count')}>
            Nombre d'anime vu
          </button>
        </div>
      )}
      {expanded && (
        <ul className="stats-breakdown__list">
          {counts.length === 0 && (
            <li className="stats-breakdown__empty">Rien à afficher pour l'instant.</li>
          )}
          {displayedCounts.map(([name, count]) => {
            const label = translate(name);
            const isSelected = selectedName === name;
            // Anime lookup is purely local (the personal list is already in
            // memory) — no AniList request needed to answer "which anime?".
            // Anime already grouped in "Mes groupes" are shown under their
            // group name instead of as separate lines, for clarity.
            const matchingBlocks = isSelected
              ? applyCustomGroups(
                  list.filter((entry) => matchesFieldValue(entry, field, name)),
                  customGroups
                ).sort((a, b) => {
                  const titleA = a.custom ? a.custom.title : a.entries[0].title;
                  const titleB = b.custom ? b.custom.title : b.entries[0].title;
                  return titleA.localeCompare(titleB);
                })
              : [];

            return (
              <li key={name}>
                <button
                  type="button"
                  className="stats-breakdown__row"
                  aria-expanded={isSelected}
                  onClick={() => toggleSelected(name)}
                >
                  <span className="stats-breakdown__label" title={label !== name ? name : undefined}>
                    {label}
                  </span>
                  <span className="stats-breakdown__bar-wrap">
                    <span className="stats-breakdown__bar" style={{ width: `${(count / max) * 100}%` }} />
                  </span>
                  <span className="stats-breakdown__count">{count}</span>
                </button>
                {isSelected && (
                  <ul className="stats-breakdown__titles">
                    {matchingBlocks.map((block) => {
                      if (!block.custom) return <li key={block.key}>{block.entries[0].title}</li>;

                      const groupExpanded = !!expandedMatchGroups[block.key];
                      return (
                        <li key={block.key}>
                          <button
                            type="button"
                            className="stats-breakdown__group-toggle"
                            aria-expanded={groupExpanded}
                            onClick={() => toggleMatchGroup(block.key)}
                          >
                            <strong className="stats-breakdown__group-title">{block.custom.title}</strong>{' '}
                            <span className="stats-breakdown__count">({block.entries.length} animes)</span>
                          </button>
                          {groupExpanded && (
                            <ul className="stats-breakdown__group-members">
                              {block.entries.map((entry) => (
                                <li key={entry.animeId}>{entry.title}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stats() {
  const [list, setList] = useState(() => getList());

  // Entries fetched before the AniList studios query was fixed to exclude
  // producers/publishers (e.g. Aniplex, Kodansha) still carry that stale
  // data — refresh them here too, in case the user never opens "Mes animés"
  // (where this same backfill also runs) first.
  useEffect(() => {
    let cancelled = false;
    backfillListMetadata(list).then((updated) => {
      if (!cancelled && updated) setList(updated);
    });
    return () => {
      cancelled = true;
    };
  }, [list]);

  const stats = computeStats(list);
  // The genre/studio/tag breakdowns only ever count watched anime — match
  // that same subset when looking up which anime a clicked row corresponds to.
  const watchedList = list.filter((entry) => entry.status === 'vu');
  const customGroups = getCustomGroups();

  return (
    <section>
      <h2>Mes stats</h2>

      <div className="stats-grid">
        <StatTile label="Animes dans ma liste" value={stats.total} />
        <StatTile label="Vus" value={stats.watchedCount} />
        <StatTile label="À voir" value={stats.toWatchCount} />
        <StatTile label="Coups de cœur" value={stats.favoritesCount} />
        <StatTile label="Aimés" value={stats.likedCount} />
        <StatTile label="Pas aimés" value={stats.dislikedCount} />
        <StatTile label="Exclus" value={stats.excludedCount} />
        <StatTile label="Genre favori" value={stats.topGenre ? translateGenre(stats.topGenre) : '—'} />
        <StatTile label="Studio favori" value={stats.topStudio ?? '—'} />
      </div>

      <BreakdownSection
        title="Voir la répartition par genre"
        counts={stats.genreCounts}
        list={watchedList}
        field="genres"
        customGroups={customGroups}
        translate={translateGenre}
      />
      <BreakdownSection
        title="Voir la répartition par studio"
        counts={stats.studioCounts}
        list={watchedList}
        field="studios"
        customGroups={customGroups}
      />
      <BreakdownSection
        title="Voir le top 20 des tags"
        counts={stats.tagCounts}
        list={watchedList}
        field="tags"
        customGroups={customGroups}
        translate={translateTag}
      />
      <BreakdownSection
        title="Voir la répartition par année"
        counts={stats.yearCounts}
        list={watchedList}
        field="seasonYear"
        customGroups={customGroups}
        sortableByValue
      />
    </section>
  );
}

export default Stats;
