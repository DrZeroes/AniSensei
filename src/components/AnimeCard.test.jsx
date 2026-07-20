import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AnimeCard from './AnimeCard.jsx';
import { rarityFor } from '../recommend/scoring.js';

const anime = { id: 1, title: 'One Piece', coverImage: null, genres: ['Action', 'Adventure'] };

describe('AnimeCard', () => {
  it('renders the title and genres', () => {
    render(<AnimeCard anime={anime} />);
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.getByText('Pas encore diffusé · Action, Aventure')).toBeInTheDocument();
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
    expect(screen.getByText('1999 · Action, Aventure')).toBeInTheDocument();
  });

  it('shows "Pas encore diffusé" instead of a year when the anime has not aired yet', () => {
    render(<AnimeCard anime={{ ...anime, seasonYear: null }} />);
    expect(screen.getByText('Pas encore diffusé · Action, Aventure')).toBeInTheDocument();
  });

  it('shows a "Bonus" tag with an explanation when marked as the bonus pick', () => {
    render(<AnimeCard anime={anime} score={4} bonus bonusReason="Pépite peu connue du genre Action." />);
    expect(screen.getByRole('button', { name: 'Bonus' })).toBeInTheDocument();
    expect(screen.getByText('Pépite peu connue du genre Action.')).toBeInTheDocument();
  });

  it('does not show a "Bonus" tag for regular results', () => {
    render(<AnimeCard anime={anime} score={4} />);
    expect(screen.queryByText('Bonus')).not.toBeInTheDocument();
  });

  it('hides the card content behind a reveal button in gacha mode', () => {
    render(<AnimeCard anime={anime} score={4} gacha />);
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
    expect(screen.queryByText('Score : 4.0')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Révéler One Piece' })).toBeInTheDocument();
  });

  it('reveals the card content after clicking the gacha reveal button', async () => {
    render(<AnimeCard anime={anime} score={4} gacha />);
    await userEvent.click(screen.getByRole('button', { name: 'Révéler One Piece' }));

    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Score : 4.0' })).toBeInTheDocument();
  });

  it('shows the card content immediately when gacha mode is off', () => {
    render(<AnimeCard anime={anime} score={4} gacha={false} />);
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Révéler/ })).not.toBeInTheDocument();
  });

  it('does not leak which card is the bonus while it is face-down in gacha mode', () => {
    const { container } = render(
      <AnimeCard anime={anime} score={4} bonus bonusReason="Pépite peu connue." gacha />
    );

    expect(screen.queryByText('Bonus')).not.toBeInTheDocument();
    expect(container.querySelector('.anime-card--bonus')).toBeNull();
    expect(container.querySelector('.anime-card--hidden')).not.toBeNull();
  });

  it('reveals the bonus tag and its distinct styling only after the gacha reveal click', async () => {
    const { container } = render(
      <AnimeCard anime={anime} score={4} bonus bonusReason="Pépite peu connue." gacha />
    );

    await userEvent.click(screen.getByRole('button', { name: /Révéler/ }));

    expect(screen.getByRole('button', { name: 'Bonus' })).toBeInTheDocument();
    expect(container.querySelector('.anime-card--bonus')).not.toBeNull();
    expect(container.querySelector('.anime-card--bonus-reveal')).not.toBeNull();
  });

  it('shows only a colored frame (no text label) for a strong match', () => {
    const rarity = rarityFor(30, [30, 20, 10, 2]); // legendary
    const { container } = render(<AnimeCard anime={anime} score={30} rarity={rarity} />);

    expect(container.querySelector('.anime-card--rarity-legendary')).not.toBeNull();
    expect(screen.queryByText('Légendaire')).not.toBeInTheDocument();
  });

  it('shows no rarity frame for a common-tier match', () => {
    const rarity = rarityFor(2, [30, 20, 10, 2]); // common
    const { container } = render(<AnimeCard anime={anime} score={2} rarity={rarity} />);

    expect(container.querySelector('[class*="anime-card--rarity-"]')).toBeNull();
  });

  it('never shows the bonus tag and a rarity frame together', () => {
    const rarity = rarityFor(30, [30, 20, 10, 2]); // legendary
    const { container } = render(
      <AnimeCard anime={anime} score={30} bonus bonusReason="Pépite." rarity={rarity} />
    );

    expect(screen.getByRole('button', { name: 'Bonus' })).toBeInTheDocument();
    expect(container.querySelector('[class*="anime-card--rarity-"]')).toBeNull();
  });

  it('does not leak the rarity of a face-down card in gacha mode', () => {
    const rarity = rarityFor(30, [30, 20, 10, 2]); // legendary
    const { container } = render(<AnimeCard anime={anime} score={30} rarity={rarity} gacha />);

    expect(container.querySelector('[class*="anime-card--rarity-"]')).toBeNull();
  });
});
