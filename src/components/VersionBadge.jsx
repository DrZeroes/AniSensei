import { useEffect, useRef, useState } from 'react';
import changelog from '../generated/changelog.json';

const VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

function VersionBadge() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div className="version-badge" ref={containerRef}>
      <button
        type="button"
        className="version-badge__toggle"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {VERSION}
      </button>
      {open && (
        <div className="version-badge__log" role="dialog" aria-label="Historique des versions">
          <h4>Dernières mises à jour</h4>
          {changelog.length === 0 && <p>Historique indisponible.</p>}
          <ul>
            {changelog.map((entry) => (
              <li key={entry.sha}>
                <span className="version-badge__date">{entry.date}</span>
                {' — '}
                {entry.summary}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default VersionBadge;
