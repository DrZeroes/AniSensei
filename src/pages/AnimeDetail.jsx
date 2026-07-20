import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAnimeDetails, getAnimeRecommendations } from '../api/queries.js';
import { getList, upsertAnime } from '../storage/listStorage.js';
import { translateGenre } from '../i18n/genreLabels.js';
import { translateTag } from '../i18n/tagLabels.js';

const STATUS_OPTIONS = ['a_voir', 'vu'];
const NOTE_OPTIONS = ['coup_de_coeur', 'aime', 'pas_aime'];

function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [status, setStatus] = useState('loading');
  const [entry, setEntry] = useState(null);
  const requestIdRef = useRef(0);

  function loadData() {
    const requestId = ++requestIdRef.current;
    setStatus('loading');
    Promise.all([getAnimeDetails(Number(id)), getAnimeRecommendations(Number(id))])
      .then(([data, recommendations]) => {
        if (requestIdRef.current !== requestId) return; // a newer request has since been issued; discard this stale response
        setAnime(data);
        setSimilar(recommendations.map((node) => node.media));
        setEntry(getList().find((item) => item.animeId === Number(id)) ?? null);
        setStatus('idle');
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setStatus('error');
      });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateEntry(changes) {
    const updated = upsertAnime({
      animeId: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      genres: anime.genres,
      studios: anime.studios,
      tags: anime.tags,
      seasonYear: anime.seasonYear,
      ...changes,
    });
    setEntry(updated.find((item) => item.animeId === anime.id));
  }

  if (status === 'loading') return <p>Chargement...</p>;
  if (status === 'error') {
    return (
      <p role="alert">
        Impossible de charger cet anime, réessaie plus tard.{' '}
        <button type="button" onClick={loadData}>
          Réessayer
        </button>
      </p>
    );
  }
  if (!anime) return null;

  return (
    <section className="anime-detail">
      <h2>{anime.title}</h2>
      {anime.coverImage && <img src={anime.coverImage} alt={anime.title} />}
      <p>{anime.description}</p>
      <p>
        <span className="anime-detail__label">Genres</span> :{' '}
        {anime.genres.map((genre, index) => (
          <span key={genre}>
            <span title={genre}>{translateGenre(genre)}</span>
            {index < anime.genres.length - 1 ? ', ' : ''}
          </span>
        ))}
      </p>
      <p>
        <span className="anime-detail__label">Tags</span> :{' '}
        {anime.tags.map((tag, index) => (
          <span key={tag}>
            <span title={tag}>{translateTag(tag)}</span>
            {index < anime.tags.length - 1 ? ', ' : ''}
          </span>
        ))}
      </p>
      <p>
        <span className="anime-detail__label">Studios</span> : {anime.studios.join(', ')}
      </p>
      <p>
        <span className="anime-detail__label">Année</span> : {anime.seasonYear ?? 'Pas encore diffusé'} ·{' '}
        <span className="anime-detail__label">Format</span> : {anime.format} ·{' '}
        <span className="anime-detail__label">Épisodes</span> : {anime.episodes ?? '?'} ·{' '}
        <span className="anime-detail__label">Score</span> : {anime.averageScore ?? '?'}
      </p>

      <div className="anime-detail__personal">
        <label>
          <span className="anime-detail__label">Statut</span>
          <select
            className={`status-select status-select--${entry?.status ?? 'a_voir'}`}
            value={entry?.status ?? 'a_voir'}
            onChange={(event) => updateEntry({ status: event.target.value })}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="anime-detail__label">Note</span>
          <select
            className={`note-select note-select--${entry?.note ?? 'none'}`}
            value={entry?.note ?? ''}
            onChange={(event) => updateEntry({ note: event.target.value || null })}
          >
            <option value="">Pas de note</option>
            {NOTE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="anime-detail__label">Commentaire</span>
          <input
            type="text"
            value={entry?.comment ?? ''}
            onChange={(event) => updateEntry({ comment: event.target.value })}
          />
        </label>
        <button type="button" onClick={() => updateEntry({ excluded: !(entry?.excluded ?? false) })}>
          {entry?.excluded ? 'Retirer de la liste des exclus' : 'Ne plus recommander'}
        </button>
      </div>

      <h3>Animes similaires</h3>
      <ul>
        {similar.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => navigate(`/anime/${item.id}`)}>
              {item.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AnimeDetail;
