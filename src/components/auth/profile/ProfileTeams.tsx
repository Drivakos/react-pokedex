import React from 'react';
import PokemonImage from '../../PokemonImage';
import { TeamMember, TeamWithJoinedMembers } from '../../../lib/supabase';

interface ProfileTeamsProps {
  userTeams: TeamWithJoinedMembers[];
  teamMembers: Record<number, TeamMember[]>;
  onManage: () => void;
  onNavigateToTeam: (id: number) => void;
}

export const ProfileTeams: React.FC<ProfileTeamsProps> = ({
  userTeams,
  teamMembers,
  onManage,
  onNavigateToTeam
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">Teams</h2>
        <button onClick={onManage} className="text-blue-500 hover:text-blue-600 text-sm font-medium">
          Manage
        </button>
      </div>

      {userTeams.length === 0 ? (
        <p className="text-gray-500 text-sm">No teams yet. <button onClick={onManage} className="text-blue-500 hover:underline">Create one</button></p>
      ) : (
        <div className="space-y-3">
          {userTeams.slice(0, 3).map((team: { id: number; name: string; description?: string }) => (
            <button
              key={team.id}
              onClick={() => onNavigateToTeam(team.id)}
              className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900">{team.name}</span>
                <span className="text-gray-400 text-sm">→</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((position) => {
                  const member = teamMembers[team.id]?.find(m => m.position === position);
                  return (
                    <div key={position} className="w-8 h-8 bg-gray-100 rounded border flex items-center justify-center">
                      {member ? (
                        <PokemonImage
                          pokemonId={member.pokemon_id}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-gray-300">{position}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </button>
          ))}
          {userTeams.length > 3 && (
            <button onClick={onManage} className="text-sm text-blue-500 hover:underline">
              View all {userTeams.length} teams
            </button>
          )}
        </div>
      )}
    </div>
  );
};
