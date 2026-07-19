function badgeLabel(listEntry) {
  if (!listEntry) return null;
  if (listEntry.excluded) return 'Exclu';
  if (listEntry.status === 'vu') return listEntry.note ? `Vu · ${listEntry.note}` : 'Vu';
  return 'À voir';
}

function metaLine(anime) {
  const genreText = (anime.genres ?? []).length > 0 ? anime.genres.join(', ') : null;
  return [anime.seasonYear, genreText].filter(Boolean).join(' · ');
}

function AnimeCard({ anime, listEntry = null, score = null, reason = null, scoreDetail = null, onAddSeen, onExclude, onClick }) {
  const badge = badgeLabel(listEntry);

  return (
    <article className="anime-card">
      <button type="button" className="anime-card__cover" onClick={() => onClick?.(anime)}>
        {anime.coverImage && <img src={anime.coverImage} alt={anime.title} />}
        <h3>{anime.title}</h3>
      </button>
      {badge && <span className="anime-card__badge">{badge}</span>}
      {score !== null && (
        <div className="anime-card__match">
          <span className="anime-card__score-wrap">
            <button type="button" className="anime-card__score">
              Score : {score.toFixed(1)}
            </button>
            <span className="anime-card__detail" role="tooltip">
              {reason && <div>{reason}</div>}
              {scoreDetail &&
                scoreDetail.split('\n').map((line, index) => <div key={index}>{line}</div>)}
            </span>
          </span>
        </div>
      )}
      <p>{metaLine(anime)}</p>
      <div className="anime-card__actions">
        {onAddSeen && (
          <button type="button" onClick={() => onAddSeen(anime)}>
            Déjà vu
          </button>
        )}
        {onExclude && (
          <button type="button" onClick={() => onExclude(anime)}>
            Ne plus recommander
          </button>
        )}
      </div>
    </article>
  );
}

export default AnimeCard;
