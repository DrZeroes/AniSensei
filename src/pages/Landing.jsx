import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    to: '/conseil-moi',
    title: 'Conseille-moi',
    description:
      'Donne un ou plusieurs animes que tu as aimés et reçois des suggestions personnalisées, avec une carte "Découverte" bonus à chaque tirage.',
  },
  {
    to: '/catalogue',
    title: 'Catalogue',
    description: 'Parcours tout le catalogue AniList, filtré par genre, tag, année ou format.',
  },
  {
    to: '/ma-liste',
    title: 'Ma liste',
    description:
      'Gère ta liste personnelle : statut (vu / à voir), note, commentaire, triable et filtrable par genre, tag ou studio. Exportable en fichier, et réimportable ailleurs (ou en cas de changement d\'appareil).',
  },
  {
    to: '/stats',
    title: 'Mes stats',
    description: 'Un aperçu chiffré de tes animes : répartition par genre, studio, et plus.',
  },
  {
    to: '/apropos',
    title: 'À propos',
    description: 'Comment le score, la rareté des cartes et le mode gacha fonctionnent, en détail.',
  },
];

function Landing() {
  return (
    <section className="landing">
      <h2>Bienvenue sur AniSensei</h2>
      <p>
        AniSensei est un outil personnel de recommandation d'anime : donne-lui un ou plusieurs
        titres que tu as aimés (ou pioche dans ta liste "vus"/"coups de cœur"), et il te propose
        d'autres animes à découvrir — en évitant ceux que tu as déjà vus ou explicitement exclus.
        Tout reste stocké uniquement dans ton navigateur.
      </p>

      <div className="landing__grid">
        {SECTIONS.map((section) => (
          <Link key={section.to} to={section.to} className="landing__card">
            <h3>{section.title}</h3>
            <p>{section.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default Landing;
