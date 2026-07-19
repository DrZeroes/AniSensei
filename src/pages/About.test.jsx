import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import About from './About.jsx';

describe('About', () => {
  it('renders the about heading and the AniList non-affiliation disclaimer', () => {
    render(<About />);

    expect(screen.getByText("À propos d'AniSensei")).toBeInTheDocument();
    expect(screen.getByText(/n'est ni affilié ni approuvé par AniList/)).toBeInTheDocument();
  });
});
