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
      <h2>Comment le score est calculé</h2>
      <p>
        Chaque suggestion reçoit un score qui mesure ses points communs avec les animes que tu as
        sélectionnés :
      </p>
      <ul>
        <li>+2 points par genre partagé avec un anime de base (et par anime de base concerné)</li>
        <li>+3 points par studio d'animation partagé avec un anime de base</li>
        <li>
          un bonus plus faible (+1 par genre, +1,5 par studio) si ça correspond aussi à tes
          coups de cœur existants
        </li>
        <li>+ un petit bonus lié à la popularité de la suggestion parmi la communauté AniList</li>
      </ul>
      <p>
        Le score ne détermine pas directement "le top 5" : parmi le pool de candidats
        pertinents, 5 sont tirés au hasard mais <strong>pondérés</strong> par leur score — plus il
        est élevé, plus la suggestion a de chances d'apparaître, mais ça garde de la variété d'une
        fois à l'autre. Survole (ou touche sur mobile) le score affiché sur une carte pour voir le
        détail du calcul.
      </p>
      <p>
        En plus de ces 5 suggestions, une <strong>6ᵉ carte "Découverte"</strong> apparaît toujours à
        part : elle utilise le même calcul de score, mais pioche uniquement parmi des animes peu
        populaires (en dehors du top ~500) du genre dominant de ta sélection, pour toujours
        proposer une pépite plutôt qu'un classique déjà connu. Chaque clic sur "Voir d'autres" tire
        aussi une nouvelle carte "Découverte", en plus des 5 nouvelles suggestions.
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
      <p className="about-page__contact">
        Contact : zeroes.time.prod@gmail.com
      </p>
    </section>
  );
}

export default About;
