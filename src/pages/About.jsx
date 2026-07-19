function About() {
  return (
    <section className="about-page">
      <h2>À propos d'AniSensei</h2>
      <p>
        AniSensei est un outil personnel de recommandation d'anime : donne-lui un ou plusieurs
        titres que tu as aimés (ou utilise ta liste "vus"/"coups de cœur"), et il te propose
        d'autres animes à découvrir, en évitant ceux que tu as déjà vus ou explicitement exclus.
      </p>
      <p>
        Ta liste personnelle (statut, note, commentaire) est stockée uniquement dans ton
        navigateur (localStorage) — aucune donnée n'est envoyée à un serveur. Tu peux
        l'exporter et la réimporter en JSON depuis "Ma liste".
      </p>
      <p>
        Code source sur{' '}
        <a href="https://github.com/DrZeroes/AniSensei" target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>
      <div className="about-page__disclaimer">
        AniSensei utilise l'API publique{' '}
        <a href="https://anilist.co" target="_blank" rel="noreferrer">
          AniList
        </a>{' '}
        pour les informations sur les animes (synopsis, genres, images, recommandations). Ce
        projet est indépendant et n'est ni affilié ni approuvé par AniList.
      </div>
    </section>
  );
}

export default About;
