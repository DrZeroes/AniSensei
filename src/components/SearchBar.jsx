import { useEffect, useState } from 'react';
import { searchAnime } from '../api/queries.js';

const DEBOUNCE_MS = 300;

function SearchBar({ onSelect }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error

  useEffect(() => {
    if (term.trim().length === 0) {
      setResults([]);
      setStatus('idle');
      return undefined;
    }

    let ignore = false;
    setStatus('loading');
    const timeoutId = setTimeout(async () => {
      try {
        const data = await searchAnime(term);
        if (ignore) return;
        setResults(data);
        setStatus('idle');
      } catch {
        if (ignore) return;
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [term]);

  function handleSelect(anime) {
    onSelect(anime);
    setTerm('');
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Rechercher un anime..."
        aria-label="Rechercher un anime"
      />
      {status === 'error' && <p role="alert">Recherche indisponible, réessaie plus tard.</p>}
      {status === 'idle' && term.trim().length > 0 && results.length === 0 && (
        <p>Aucun anime trouvé.</p>
      )}
      <ul>
        {results.map((anime) => (
          <li key={anime.id}>
            <button type="button" onClick={() => handleSelect(anime)}>
              {anime.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SearchBar;
