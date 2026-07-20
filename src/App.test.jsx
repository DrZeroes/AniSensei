import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('renders the AniSensei title', () => {
    render(<App />);
    expect(screen.getByText('AniSensei')).toBeInTheDocument();
  });

  it('renders a link to the About page', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'À propos' })).toBeInTheDocument();
  });

  it('renders a link to the "Conseille-moi" recommendation page, and shows the landing page by default', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Conseille-moi' })).toHaveAttribute('href', '#/conseil-moi');
    expect(screen.getByText('Bienvenue sur AniSensei')).toBeInTheDocument();
  });

  it('renders a link to the Stats page', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Mes stats' })).toBeInTheDocument();
  });

  it('toggles the theme when the theme button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    const initialTheme = document.documentElement.dataset.theme;
    await user.click(screen.getByRole('button', { name: 'Changer de thème' }));

    expect(document.documentElement.dataset.theme).not.toBe(initialTheme);
    expect(localStorage.getItem('aniSensei.theme')).toBe(document.documentElement.dataset.theme);
  });
});
