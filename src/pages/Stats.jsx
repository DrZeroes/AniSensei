import { useEffect, useState } from 'react';
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

function BreakdownSection({ title, counts, translate = (name) => name }) {
  const [expanded, setExpanded] = useState(false);
  const max = counts[0]?.[1] ?? 1;

  return (
    <div className="stats-breakdown">
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
            return (
              <li key={name}>
                <span className="stats-breakdown__label" title={label !== name ? name : undefined}>
                  {label}
                </span>
                <span className="stats-breakdown__bar-wrap">
                  <span className="stats-breakdown__bar" style={{ width: `${(count / max) * 100}%` }} />
                </span>
                <span className="stats-breakdown__count">{count}</span>
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
        translate={translateGenre}
      />
      <BreakdownSection title="Voir la répartition par studio" counts={stats.studioCounts} />
      <BreakdownSection title="Voir le top 20 des tags" counts={stats.tagCounts} translate={translateTag} />
    </section>
  );
}

export default Stats;
