import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <header>
        <h1>AniSensei</h1>
        <nav>
          <Link to="/">Accueil</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </HashRouter>
  );
}

export default App;
