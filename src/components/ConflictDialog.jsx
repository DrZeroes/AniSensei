import { useState } from 'react';

function ConflictDialog({ conflicts, onResolve, onCancel }) {
  const [choices, setChoices] = useState(
    Object.fromEntries(conflicts.map((conflict) => [conflict.animeId, 'existing']))
  );

  function setChoice(animeId, value) {
    setChoices((prev) => ({ ...prev, [animeId]: value }));
  }

  return (
    <div role="dialog" aria-label="Conflits d'import">
      <h3>Conflits détectés</h3>
      <ul>
        {conflicts.map((conflict) => (
          <li key={conflict.animeId}>
            <p>{conflict.existing.title}</p>
            <label>
              <input
                type="radio"
                name={`conflict-${conflict.animeId}`}
                checked={choices[conflict.animeId] === 'existing'}
                onChange={() => setChoice(conflict.animeId, 'existing')}
              />
              Garder existant
            </label>
            <label>
              <input
                type="radio"
                name={`conflict-${conflict.animeId}`}
                checked={choices[conflict.animeId] === 'imported'}
                onChange={() => setChoice(conflict.animeId, 'imported')}
              />
              Garder importé
            </label>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onResolve(choices)}>
        Valider
      </button>
      <button type="button" onClick={onCancel}>
        Annuler
      </button>
    </div>
  );
}

export default ConflictDialog;
