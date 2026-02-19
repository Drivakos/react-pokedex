import React from 'react';
import PokemonImage from '../../PokemonImage';
import { TeamMember } from '../../../lib/supabase';

interface TeamMemberTabsProps {
  teamMembers: TeamMember[];
  pokemonData: Record<number, any>;
  selectedMember: TeamMember | null;
  showMovesetEditor: boolean;
  onEditMember: (member: TeamMember) => void;
  onRemoveClick: (member: TeamMember) => void;
  onShowSearch: () => void;
  formatName: (name: string) => string;
}

export const TeamMemberTabs: React.FC<TeamMemberTabsProps> = ({
  teamMembers,
  pokemonData,
  selectedMember,
  showMovesetEditor,
  onEditMember,
  onRemoveClick,
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
            className={`sd-team-tab relative group ${selectedMember?.position === member.position && showMovesetEditor ? 'sd-team-tab--active' : ''}`}
            onClick={() => onEditMember(member)}
          >
            <button
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveClick(member);
              }}
              title="Remove Pokemon"
            >
              <span className="text-[10px] leading-none">×</span>
            </button>
            <PokemonImage pokemonId={member.pokemon_id} alt={pokemon?.name || ''} className="w-10 h-10" />
            <span className="truncate max-w-[60px] text-center">{member.nickname || formatName(pokemon?.name || 'Unknown')}</span>
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
