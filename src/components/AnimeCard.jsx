import { useState } from 'react';

function badgeLabel(listEntry) {
  if (!listEntry) return null;
  if (listEntry.excluded) return 'Exclu';
  if (listEntry.status === 'vu') return listEntry.note ? `Vu · ${listEntry.note}` : 'Vu';
  return 'À voir';
}

function metaLine(anime) {
  const genreText = (anime.genres ?? []).length > 0 ? anime.genres.join(', ') : null;
  const yearText = anime.seasonYear ?? 'Pas encore diffusé';
  return [yearText, genreText].filter(Boolean).join(' · ');
}

function AnimeCard({
  anime,
  listEntry = null,
  score = null,
  reason = null,
  scoreDetail = null,
  bonus = false,
  bonusReason = null,
  gacha = false,
  onAddSeen,
  onExclude,
  onClick,
}) {
  const [revealed, setRevealed] = useState(!gacha);
  const badge = badgeLabel(listEntry);
  // While face-down in gacha mode, the bonus card must look identical to the
  // rest — no gold border giving away which one it is — so the shiny "bonus"
  // treatment only kicks in once actually revealed.
  const showBonusStyling = bonus && !(gacha && !revealed);
  const cardClassName = [
    'anime-card',
    showBonusStyling && 'anime-card--bonus',
    gacha && revealed && (bonus ? 'anime-card--bonus-reveal' : 'anime-card--revealed'),
  ]
    .filter(Boolean)
    .join(' ');

  if (gacha && !revealed) {
    return (
      <article className={cardClassName + ' anime-card--hidden'}>
        <button
          type="button"
          className="anime-card__reveal"
          onClick={() => setRevealed(true)}
          aria-label={`Révéler ${anime.title}`}
        >
          <span className="anime-card__reveal-icon" aria-hidden="true">?</span>
          <span>Cliquer pour révéler</span>
        </button>
      </article>
    );
  }

  return (
    <article className={cardClassName}>
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
              {reason && <p className="anime-card__detail-reason">{reason}</p>}
              {scoreDetail && (
                <ul className="anime-card__detail-list">
                  {scoreDetail.split('\n').map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              )}
            </span>
          </span>
          {bonus && (
            <span className="anime-card__score-wrap">
              <button type="button" className="anime-card__score anime-card__bonus-tag">
                Bonus
              </button>
              <span className="anime-card__detail" role="tooltip">
                <p className="anime-card__detail-reason">
                  {bonusReason ?? 'Sélectionné pour te faire découvrir une pépite peu connue.'}
                </p>
              </span>
            </span>
          )}
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
