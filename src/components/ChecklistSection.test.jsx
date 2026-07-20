import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ChecklistSection from './ChecklistSection.jsx';

const entries = [
  { animeId: 1, title: 'One Piece' },
  { animeId: 2, title: 'Naruto' },
];

function ControlledChecklist({ selectedIds = [], onToggle = () => {} }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <ChecklistSection
      title="Mes animes vus"
      entries={entries}
      selectedIds={selectedIds}
      onToggle={onToggle}
      expanded={expanded}
      onToggleExpanded={() => setExpanded((prev) => !prev)}
    />
  );
}

describe('ChecklistSection', () => {
  it('hides the checklist items when expanded is false', () => {
    render(
      <ChecklistSection
        title="Mes animes vus"
        entries={entries}
        selectedIds={[]}
        onToggle={() => {}}
        expanded={false}
        onToggleExpanded={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'Mes animes vus' })).toBeInTheDocument();
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
  });

  it('shows the checklist items when expanded is true (controlled by the parent)', () => {
    render(
      <ChecklistSection
        title="Mes animes vus"
        entries={entries}
        selectedIds={[]}
        onToggle={() => {}}
        expanded={true}
        onToggleExpanded={() => {}}
      />
    );

    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.getByText('Naruto')).toBeInTheDocument();
  });

  it('calls onToggleExpanded when the title is clicked, without managing its own state', async () => {
    const onToggleExpanded = vi.fn();
    const user = userEvent.setup();
    render(
      <ChecklistSection
        title="Mes animes vus"
        entries={entries}
        selectedIds={[]}
        onToggle={() => {}}
        expanded={false}
        onToggleExpanded={onToggleExpanded}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Mes animes vus' }));

    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
  });

  it('filters items via the search field once expanded', async () => {
    const user = userEvent.setup();
    render(<ControlledChecklist />);

    await user.click(screen.getByRole('button', { name: 'Mes animes vus' }));
    await user.type(screen.getByLabelText('Rechercher dans Mes animes vus'), 'Naruto');

    expect(screen.queryByText('One Piece')).not.toBeInTheDocument();
    expect(screen.getByText('Naruto')).toBeInTheDocument();
  });

  it('groups franchise-looking entries into a collapsible sub-block', async () => {
    const franchiseEntries = [
      { animeId: 1, title: 'Kara no Kyoukai: Fukan Fuukei' },
      { animeId: 2, title: 'Kara no Kyoukai: Mirai Fukuin' },
      { animeId: 3, title: 'Naruto' },
    ];
    const user = userEvent.setup();

    render(
      <ChecklistSection
        title="Mes animes vus"
        entries={franchiseEntries}
        selectedIds={[]}
        onToggle={() => {}}
        expanded={true}
        onToggleExpanded={() => {}}
      />
    );

    expect(screen.getByText('Naruto')).toBeInTheDocument();
    expect(screen.getByText('2 animes')).toBeInTheDocument();
    expect(screen.queryByLabelText('Kara no Kyoukai: Fukan Fuukei')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /2 animes/ }));

    expect(screen.getByLabelText('Kara no Kyoukai: Fukan Fuukei')).toBeInTheDocument();
    expect(screen.getByLabelText('Kara no Kyoukai: Mirai Fukuin')).toBeInTheDocument();
  });

  it('reflects selectedIds as checked and calls onToggle with the entry', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<ControlledChecklist selectedIds={[1]} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: 'Mes animes vus' }));

    expect(screen.getByLabelText('One Piece')).toBeChecked();
    expect(screen.getByLabelText('Naruto')).not.toBeChecked();

    await user.click(screen.getByLabelText('Naruto'));
    expect(onToggle).toHaveBeenCalledWith(entries[1]);
  });
});
