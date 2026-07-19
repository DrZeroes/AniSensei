import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Landing from './Landing.jsx';

function renderLanding() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Landing />
    </MemoryRouter>
  );
}

describe('Landing', () => {
  it('renders a welcome heading and an explanation of what the app does', () => {
    renderLanding();
    expect(screen.getByText('Bienvenue sur AniSensei')).toBeInTheDocument();
    expect(screen.getByText(/outil personnel de recommandation d'anime/)).toBeInTheDocument();
  });

  it('links to every tab of the app', () => {
    renderLanding();

    expect(screen.getByRole('link', { name: /Conseil moi/ })).toHaveAttribute('href', '/conseil-moi');
    expect(screen.getByRole('link', { name: /Catalogue/ })).toHaveAttribute('href', '/catalogue');
    expect(screen.getByRole('link', { name: /Ma liste/ })).toHaveAttribute('href', '/ma-liste');
    expect(screen.getByRole('link', { name: /Mes stats/ })).toHaveAttribute('href', '/stats');
    expect(screen.getByRole('link', { name: /À propos/ })).toHaveAttribute('href', '/apropos');
  });
});
