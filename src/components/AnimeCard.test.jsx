import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AnimeCard from './AnimeCard.jsx';

const anime = { id: 1, title: 'One Piece', coverImage: null, genres: ['Action', 'Adventure'] };

describe('AnimeCard', () => {
  it('renders the title and genres', () => {
    render(<AnimeCard anime={anime} />);
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.getByText('Pas encore diffusé · Action, Adventure')).toBeInTheDocument();
  });

  it('shows a status badge when a list entry is provided', () => {
    render(<AnimeCard anime={anime} listEntry={{ status: 'vu', note: 'coup_de_coeur', excluded: false }} />);
    expect(screen.getByText('Vu · coup_de_coeur')).toBeInTheDocument();
  });

  it('calls onClick with the anime when the cover is clicked', async () => {
    const onClick = vi.fn();
    render(<AnimeCard anime={anime} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: /One Piece/ }));
    expect(onClick).toHaveBeenCalledWith(anime);
  });

  it('calls onAddSeen when the "Déjà vu" button is clicked', async () => {
    const onAddSeen = vi.fn();
    render(<AnimeCard anime={anime} onAddSeen={onAddSeen} />);
    await userEvent.click(screen.getByRole('button', { name: 'Déjà vu' }));
    expect(onAddSeen).toHaveBeenCalledWith(anime);
  });

  it('calls onExclude when the "Ne plus recommander" button is clicked', async () => {
    const onExclude = vi.fn();
    render(<AnimeCard anime={anime} onExclude={onExclude} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ne plus recommander' }));
    expect(onExclude).toHaveBeenCalledWith(anime);
  });

  it('shows the score button with the reason and detail available on hover/focus', () => {
    render(
      <AnimeCard
        anime={anime}
        score={7.5}
        reason="Points communs — genres : Action"
        scoreDetail={'Animes de base — genre "Action" x1 : +2'}
      />
    );
    expect(screen.getByRole('button', { name: 'Score : 7.5' })).toBeInTheDocument();
    expect(screen.getByText('Points communs — genres : Action')).toBeInTheDocument();
    expect(screen.getByText('Animes de base — genre "Action" x1 : +2')).toBeInTheDocument();
  });

  it('does not show a score button when score is not provided', () => {
    render(<AnimeCard anime={anime} />);
    expect(screen.queryByText(/Score :/)).not.toBeInTheDocument();
  });

  it('shows the release year alongside the genres', () => {
    render(<AnimeCard anime={{ ...anime, seasonYear: 1999 }} />);
    expect(screen.getByText('1999 · Action, Adventure')).toBeInTheDocument();
  });

  it('shows "Pas encore diffusé" instead of a year when the anime has not aired yet', () => {
    render(<AnimeCard anime={{ ...anime, seasonYear: null }} />);
    expect(screen.getByText('Pas encore diffusé · Action, Adventure')).toBeInTheDocument();
  });
});
