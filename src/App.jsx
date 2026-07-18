import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Catalogue from './pages/Catalogue.jsx';
import MyList from './pages/MyList.jsx';

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <header>
        <h1>AniSensei</h1>
        <nav>
          <Link to="/">Accueil</Link>
          <Link to="/catalogue">Catalogue</Link>
          <Link to="/ma-liste">Ma liste</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/ma-liste" element={<MyList />} />
        </Routes>
      </main>
    </HashRouter>
  );
}

export default App;
