import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { TeamMember } from '../../../lib/supabase';
import type { Pokemon } from '../../../types/pokemon';
import { TeamRosterPreview } from '../TeamRosterPreview';

const member: TeamMember = {
  id: 1,
  team_id: 9,
  pokemon_id: 25,
  position: 1,
  moves: ['volt-tackle', 'iron-tail', 'fake-out', 'protect'],
  item: 'light-ball',
  ability: 'static',
  nature: 'jolly',
  tera_type: 'electric',
  level: 100,
  nickname: 'Sparky',
  evs: { hp: 4, attack: 252, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 252 },
  ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 0, 'special-defense': 31, speed: 31 },
};

const pokemon: Pokemon = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  types: ['electric'],
  moves: [],
  sprites: {
    front_default: '',
    back_default: '',
    front_shiny: '',
    back_shiny: '',
    official_artwork: '',
  },
  generation: 'generation-i',
  has_evolutions: true,
  is_default: true,
  base_experience: 112,
  stats: { hp: 35, attack: 55, defense: 40, 'special-attack': 50, 'special-defense': 50, speed: 90 },
};

describe('TeamRosterPreview build details', () => {
  it('includes the saved build and species stats in the hover preview', () => {
    render(
      <TeamRosterPreview
        members={[member]}
        pokemonById={{ 25: pokemon }}
        movesByName={{
          'volt-tackle': { name: 'volt-tackle', type: 'electric', damageClass: 'physical', power: 120 },
          'iron-tail': { name: 'iron-tail', type: 'steel', damageClass: 'physical', power: 100 },
          'fake-out': { name: 'fake-out', type: 'normal', damageClass: 'physical', power: 40 },
          protect: { name: 'protect', type: 'normal', damageClass: 'status', power: null },
        }}
        abilitiesByName={{
          static: { name: 'static', description: 'Contact with the Pokémon may cause paralysis.' },
        }}
        showBuildDetails
      />,
    );

    expect(screen.getByText('Sparky')).toBeInTheDocument();
    expect(screen.getByText('Pikachu')).toBeInTheDocument();
    expect(screen.getByText('Light Ball')).toBeInTheDocument();
    expect(screen.getByText('Static')).toBeInTheDocument();
    expect(screen.getByText('Contact with the Pokémon may cause paralysis.')).toBeInTheDocument();
    expect(screen.getByText('Volt Tackle')).toBeInTheDocument();
    expect(screen.getByText('120 BP')).toBeInTheDocument();
    expect(screen.getAllByTitle('Physical move')).toHaveLength(3);
    expect(screen.getByTitle('Status move')).toBeInTheDocument();
    expect(screen.getByText('Saved Lv. 100 · VS battles use Lv. 50')).toBeInTheDocument();
    const rosterMember = screen.getByTitle(/hover for build details/i);
    expect(rosterMember).toBeInTheDocument();
    expect(rosterMember.querySelector('[aria-hidden="true"]')).toHaveClass('max-sm:hidden');
  });

  it('keeps the normal roster compact when details are not requested', () => {
    render(<TeamRosterPreview members={[member]} />);

    expect(screen.queryByText('Volt Tackle')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Team preview')).toBeInTheDocument();
  });
});
