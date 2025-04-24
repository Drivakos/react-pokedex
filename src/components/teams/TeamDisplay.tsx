import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import TeamSlot from './TeamSlot';
import { Team as SupabaseTeam } from '../../lib/supabase';
import { TeamWithPokemon } from '../../types/teams';

interface TeamDisplayProps {
  team: TeamWithPokemon;
  onEditTeam: (team: SupabaseTeam) => void;
  onDeleteTeam: (teamId: number) => void;
  onSelectSlot: (teamId: number, position: number) => void;
  onRemovePokemon: (teamId: number, position: number) => void;
  selectedPosition: number | null;
}

const TeamDisplay: React.FC<TeamDisplayProps> = ({
  team,
  onEditTeam,
  onDeleteTeam,
  onSelectSlot,
  onRemovePokemon,
  selectedPosition
}) => {
  return (
    <div className="p-4 bg-white">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <h3 className="text-base font-medium text-gray-800">{team.name}</h3>
          {team.description && (
            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {team.description}
            </span>
          )}
        </div>
        <div className="flex space-x-1">
          <button
            className="text-gray-400 hover:text-blue-500 p-1.5 rounded transition-colors"
            onClick={() => onEditTeam({
              id: team.id,
              user_id: team.user_id,
              name: team.name,
              description: team.description,
              created_at: team.created_at,
              updated_at: team.updated_at
            })}
            title="Edit team"
          >
            <Edit size={16} />
          </button>
          <button
            className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"
            onClick={() => onDeleteTeam(team.id)}
            title="Delete team"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 overflow-visible">
        {[1, 2, 3, 4, 5, 6].map((position) => (
          <TeamSlot
            key={`team-${team.id}-slot-${position}`}
            position={position}
            pokemon={team.members[position] || null}
            onSelect={(pos) => onSelectSlot(team.id, pos)}
            onRemove={team.members[position] ? (pos) => onRemovePokemon(team.id, pos) : undefined}
            isActive={selectedPosition === position}
          />
        ))}
      </div>
    </div>
  );
};

export default TeamDisplay;
