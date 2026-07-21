import { useEffect, useRef, useState } from 'react';
import { getList } from '../storage/listStorage.js';
import { backfillListMetadata } from '../storage/backfillMetadata.js';
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

function BreakdownSection({ title, counts, list, field, translate = (name) => name }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedName, setSelectedName] = useState(null);
  const max = counts[0]?.[1] ?? 1;
  const containerRef = useRef(null);

  function toggleSelected(name) {
    setSelectedName((prev) => (prev === name ? null : name));
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
      {expanded && (
        <ul className="stats-breakdown__list">
          {counts.length === 0 && (
            <li className="stats-breakdown__empty">Rien à afficher pour l'instant.</li>
          )}
          {counts.map(([name, count]) => {
            const label = translate(name);
            const isSelected = selectedName === name;
            // Anime lookup is purely local (the personal list is already in
            // memory) — no AniList request needed to answer "which anime?".
            const matchingTitles = isSelected
              ? list.filter((entry) => (entry[field] ?? []).includes(name)).map((entry) => entry.title)
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
                    {matchingTitles.map((animeTitle) => (
                      <li key={animeTitle}>{animeTitle}</li>
                    ))}
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
        translate={translateGenre}
      />
      <BreakdownSection
        title="Voir la répartition par studio"
        counts={stats.studioCounts}
        list={watchedList}
        field="studios"
      />
      <BreakdownSection
        title="Voir le top 20 des tags"
        counts={stats.tagCounts}
        list={watchedList}
        field="tags"
        translate={translateTag}
      />
    </section>
  );
}

export default Stats;
