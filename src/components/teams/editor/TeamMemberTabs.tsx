import React from 'react';
import PokemonImage from '../../PokemonImage';
import { TeamMember } from '../../../lib/supabase';

interface TeamMemberTabsProps {
  teamMembers: TeamMember[];
  pokemonData: Record<number, any>;
  selectedMember: TeamMember | null;
  showMovesetEditor: boolean;
  onEditMember: (member: TeamMember) => void;
  onShowSearch: () => void;
  formatName: (name: string) => string;
}

export const TeamMemberTabs: React.FC<TeamMemberTabsProps> = ({
  teamMembers,
  pokemonData,
  selectedMember,
  showMovesetEditor,
  onEditMember,
  onShowSearch,
  formatName
}) => {
  return (
    <div className="sd-team-tabs">
      {teamMembers.map((member) => {
        const pokemon = pokemonData[member.pokemon_id];
        return (
          <div
            key={member.position}
            className={`sd-team-tab ${selectedMember?.position === member.position && showMovesetEditor ? 'sd-team-tab--active' : ''}`}
            onClick={() => onEditMember(member)}
          >
            <PokemonImage pokemonId={member.pokemon_id} alt={pokemon?.name || ''} className="w-10 h-10" />
            <span>{member.nickname || formatName(pokemon?.name || 'Unknown')}</span>
          </div>
        );
      })}
      {teamMembers.length < 6 && (
        <button className="sd-team-tab-add" onClick={onShowSearch} title="Add Pokémon">
          +
        </button>
      )}
    </div>
  );
};
