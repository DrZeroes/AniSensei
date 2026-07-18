import { HashRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    <HashRouter>
      <header>
        <h1>AnimeAdvice</h1>
        <nav>
          <Link to="/">Accueil</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<p>Bienvenue sur AnimeAdvice.</p>} />
        </Routes>
      </main>
    </HashRouter>
  );
}

export default App;
