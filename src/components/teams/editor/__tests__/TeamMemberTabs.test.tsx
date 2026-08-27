import { fireEvent, render, screen } from '@testing-library/react';
import type { TeamMember } from '../../../../lib/supabase';
import type { TeamPokemonData } from '../../../../types/team-builder';
import { TeamMemberTabs } from '../TeamMemberTabs';

jest.mock('../../../PokemonImage', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <span>{alt}</span>,
}));

const members: TeamMember[] = [
  { id: 1, team_id: 5, pokemon_id: 1, position: 1 },
  { id: 2, team_id: 5, pokemon_id: 2, position: 2 },
  { id: 3, team_id: 5, pokemon_id: 3, position: 3 },
];

const pokemonData = Object.fromEntries([
  [1, 'bulbasaur'],
  [2, 'ivysaur'],
  [3, 'venusaur'],
].map(([id, name]) => [id, {
  id,
  name,
  sprites: {
    front_default: '',
    other: { 'official-artwork': { front_default: '' } },
  },
  types: [],
  stats: [],
  abilities: [],
}])) as Record<number, TeamPokemonData>;

function renderTabs(onReorderMember = jest.fn()) {
  render(
    <TeamMemberTabs
      teamMembers={members}
      pokemonData={pokemonData}
      selectedMember={null}
      showMovesetEditor={false}
      onEditMember={jest.fn()}
      onRemoveClick={jest.fn()}
      onReorderMember={onReorderMember}
      reorderingMemberId={null}
      onShowSearch={jest.fn()}
      formatName={name => name.charAt(0).toUpperCase() + name.slice(1)}
    />,
  );
  return onReorderMember;
}

describe('TeamMemberTabs reordering', () => {
  it('moves directly to a selected position', () => {
    const onReorderMember = renderTabs();

    fireEvent.change(screen.getByRole('combobox', { name: 'Move Bulbasaur to position' }), {
      target: { value: '3' },
    });

    expect(onReorderMember).toHaveBeenCalledWith(members[0], 3);
  });

  it('moves a dragged member directly to the drop target', () => {
    const onReorderMember = renderTabs();
    const destination = screen.getByRole('listitem', { name: 'Team slot 3: Venusaur' });
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: jest.fn(() => destination),
    });
    const handle = screen.getByRole('button', { name: 'Drag Bulbasaur to reorder' });

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100, clientY: 10 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 100, clientY: 10 });

    expect(onReorderMember).toHaveBeenCalledWith(members[0], 3);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: originalElementFromPoint,
    });
  });
});
