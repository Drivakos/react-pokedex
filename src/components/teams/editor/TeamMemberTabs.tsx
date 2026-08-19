import React from 'react';
import PokemonImage from '../../PokemonImage';
import { TeamMember } from '../../../lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TeamMemberTabsProps {
  teamMembers: TeamMember[];
  pokemonData: Record<number, any>;
  selectedMember: TeamMember | null;
  showMovesetEditor: boolean;
  onEditMember: (member: TeamMember) => void;
  onRemoveClick: (member: TeamMember) => void;
  onMoveMember: (member: TeamMember, direction: -1 | 1) => void;
  reorderingMemberId: number | null;
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
  onMoveMember,
  reorderingMemberId,
  onShowSearch,
  formatName
}) => {
  return (
    <div className="sd-team-tabs">
      {[...teamMembers].sort((a, b) => a.position - b.position).map((member, index, orderedMembers) => {
        const pokemon = pokemonData[member.pokemon_id];
        return (
          <div
            key={member.id}
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
            <span className="sd-team-tab-position">Position {index + 1}</span>
            <span className="sd-team-tab-reorder" aria-label={`Reorder ${pokemon?.name || 'Pokémon'}`}>
              <button
                type="button"
                disabled={index === 0 || reorderingMemberId !== null}
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveMember(member, -1);
                }}
                aria-label={`Move ${pokemon?.name || 'Pokémon'} left`}
                title="Move left"
              >
                <ChevronLeft size={12} aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={index === orderedMembers.length - 1 || reorderingMemberId !== null}
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveMember(member, 1);
                }}
                aria-label={`Move ${pokemon?.name || 'Pokémon'} right`}
                title="Move right"
              >
                <ChevronRight size={12} aria-hidden="true" />
              </button>
            </span>
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
