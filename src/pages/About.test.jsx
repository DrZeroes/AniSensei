import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import About from './About.jsx';

describe('About', () => {
  it('renders the about heading and the AniList non-affiliation disclaimer', () => {
    render(<About />);

    expect(screen.getByText("À propos d'AniSensei")).toBeInTheDocument();
    expect(screen.getByText(/n'est ni affilié ni approuvé par AniList/)).toBeInTheDocument();
  });

  it('explains how the recommendation score is calculated', () => {
    render(<About />);

    expect(screen.getByText('Comment le score est calculé')).toBeInTheDocument();
    expect(screen.getByText(/\+2 points par genre partagé/)).toBeInTheDocument();
  });
});
