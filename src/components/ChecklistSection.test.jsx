import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ChecklistSection from './ChecklistSection.jsx';

const entries = [
  { animeId: 1, title: 'One Piece' },
  { animeId: 2, title: 'Naruto' },
];

describe('ChecklistSection', () => {
  it('is collapsed by default, hiding the checklist items', () => {
    render(<ChecklistSection title="Mes animes vus" entries={entries} selectedIds={[]} onToggle={() => {}} />);

    expect(screen.getByRole('button', { name: 'Mes animes vus' })).toBeInTheDocument();
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
  });

  it('expands to show the items when the title is clicked', async () => {
    const user = userEvent.setup();
    render(<ChecklistSection title="Mes animes vus" entries={entries} selectedIds={[]} onToggle={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Mes animes vus' }));

    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.getByText('Naruto')).toBeInTheDocument();
  });

  it('filters items via the search field once expanded', async () => {
    const user = userEvent.setup();
    render(<ChecklistSection title="Mes animes vus" entries={entries} selectedIds={[]} onToggle={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Mes animes vus' }));
    await user.type(screen.getByLabelText('Rechercher dans Mes animes vus'), 'Naruto');

    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
    expect(screen.getByText('Naruto')).toBeInTheDocument();
  });

  it('reflects selectedIds as checked and calls onToggle with the entry', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <ChecklistSection title="Mes animes vus" entries={entries} selectedIds={[1]} onToggle={onToggle} />
    );

    await user.click(screen.getByRole('button', { name: 'Mes animes vus' }));

    expect(screen.getByLabelText('One Piece')).toBeChecked();
    expect(screen.getByLabelText('Naruto')).not.toBeChecked();

    await user.click(screen.getByLabelText('Naruto'));
    expect(onToggle).toHaveBeenCalledWith(entries[1]);
  });
});
