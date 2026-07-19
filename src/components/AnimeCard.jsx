function badgeLabel(listEntry) {
  if (!listEntry) return null;
  if (listEntry.excluded) return 'Exclu';
  if (listEntry.status === 'vu') return listEntry.note ? `Vu · ${listEntry.note}` : 'Vu';
  return 'À voir';
}

function AnimeCard({ anime, listEntry = null, onAddSeen, onExclude, onClick }) {
  const badge = badgeLabel(listEntry);

  return (
    <article className="anime-card">
      <button type="button" className="anime-card__cover" onClick={() => onClick?.(anime)}>
        {anime.coverImage && <img src={anime.coverImage} alt={anime.title} />}
        <h3>{anime.title}</h3>
      </button>
      {badge && <span className="anime-card__badge">{badge}</span>}
      <p>{(anime.genres ?? []).join(', ')}</p>
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
