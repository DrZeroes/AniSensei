import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConflictDialog from './ConflictDialog.jsx';

const conflicts = [
  {
    animeId: 1,
    existing: { title: 'One Piece', status: 'vu' },
    imported: { title: 'One Piece', status: 'a_voir' },
  },
];

describe('ConflictDialog', () => {
  it('defaults every conflict to "keep existing"', () => {
    render(<ConflictDialog conflicts={conflicts} onResolve={() => {}} onCancel={() => {}} />);
    expect(screen.getByLabelText('Garder existant')).toBeChecked();
  });

  it('resolves with the chosen option per conflict', async () => {
    const onResolve = vi.fn();
    const user = userEvent.setup();

    render(<ConflictDialog conflicts={conflicts} onResolve={onResolve} onCancel={() => {}} />);
    await user.click(screen.getByLabelText('Garder importé'));
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onResolve).toHaveBeenCalledWith({ 1: 'imported' });
  });

  it('calls onCancel when cancelled', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<ConflictDialog conflicts={conflicts} onResolve={() => {}} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
