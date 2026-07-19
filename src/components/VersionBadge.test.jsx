import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import VersionBadge from './VersionBadge.jsx';

vi.mock('../generated/changelog.json', () => ({
  default: [
    { sha: 'abc123', date: '2026-07-19', summary: 'Add version badge and changelog' },
    { sha: 'def456', date: '2026-07-18', summary: 'Fix search dropdown' },
  ],
}));

describe('VersionBadge', () => {
  it('shows the version and hides the changelog by default', () => {
    render(<VersionBadge />);

    expect(screen.getByRole('button', { name: 'dev' })).toBeInTheDocument();
    expect(screen.queryByText(/Add version badge and changelog/)).not.toBeInTheDocument();
  });

  it('shows the last changelog entries when the version is clicked', async () => {
    const user = userEvent.setup();
    render(<VersionBadge />);

    await user.click(screen.getByRole('button', { name: 'dev' }));

    expect(screen.getByText(/Add version badge and changelog/)).toBeInTheDocument();
    expect(screen.getByText(/Fix search dropdown/)).toBeInTheDocument();
  });

  it('toggles the changelog closed on a second click', async () => {
    const user = userEvent.setup();
    render(<VersionBadge />);

    await user.click(screen.getByRole('button', { name: 'dev' }));
    await user.click(screen.getByRole('button', { name: 'dev' }));

    expect(screen.queryByText(/Add version badge and changelog/)).not.toBeInTheDocument();
  });
});
