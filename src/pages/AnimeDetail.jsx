import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAnimeDetails, getAnimeRecommendations } from '../api/queries.js';
import { getList, upsertAnime } from '../storage/listStorage.js';

const STATUS_OPTIONS = ['a_voir', 'vu'];
const NOTE_OPTIONS = ['coup_de_coeur', 'aime', 'pas_aime'];

function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [status, setStatus] = useState('loading');
  const [entry, setEntry] = useState(null);

  function loadData() {
    setStatus('loading');
    Promise.all([getAnimeDetails(Number(id)), getAnimeRecommendations(Number(id))])
      .then(([data, recommendations]) => {
        setAnime(data);
        setSimilar(recommendations.map((node) => node.media));
        setEntry(getList().find((item) => item.animeId === Number(id)) ?? null);
        setStatus('idle');
      })
      .catch(() => setStatus('error'));
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
    <section>
      <h2>{anime.title}</h2>
      {anime.coverImage && <img src={anime.coverImage} alt={anime.title} />}
      <p>{anime.description}</p>
      <p>Genres : {anime.genres.join(', ')}</p>
      <p>Tags : {anime.tags.join(', ')}</p>
      <p>Studios : {anime.studios.join(', ')}</p>
      <p>
        Format : {anime.format} · Épisodes : {anime.episodes ?? '?'} · Score : {anime.averageScore ?? '?'}
      </p>

      <div className="anime-detail__personal">
        <label>
          Statut
          <select value={entry?.status ?? 'a_voir'} onChange={(event) => updateEntry({ status: event.target.value })}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Note
          <select value={entry?.note ?? ''} onChange={(event) => updateEntry({ note: event.target.value || null })}>
            <option value="">Pas de note</option>
            {NOTE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Commentaire
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
