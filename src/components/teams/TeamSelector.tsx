import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import PokemonImage from '../PokemonImage';

interface Pokemon {
  id: number;
  name: string;
}

interface TeamSelectorProps {
  pokemon: Pokemon;
  onClose: () => void;
}

const TeamSelector: React.FC<TeamSelectorProps> = ({ pokemon, onClose }) => {
  const auth = useAuth();
  const { user, teams, teamsLoaded, fetchTeams, createTeam, addPokemonToTeam, removePokemonFromTeam } = auth;

  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');

  // Initial fetch if teams aren't loaded yet
  useEffect(() => {
    if (user && !teamsLoaded) {
      fetchTeams();
    }
  }, [user, teamsLoaded, fetchTeams]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTeamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    try {
      setIsCreating(true);

      if (createTeam && typeof createTeam === 'function') {
        const team = await createTeam(newTeamName.trim(), newTeamDescription.trim() || undefined);
        if (team) {
          setIsCreating(false);
          setNewTeamName('');
          setNewTeamDescription('');
        }
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error('Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddPokemon = async (teamId: number, position: number) => {
    try {
      await addPokemonToTeam(teamId, pokemon.id, position);
      // fetchTeams is called within addPokemonToTeam in AuthProvider
      onClose();
    } catch (error) {
      console.error('Error adding Pokémon to team:', error);
    }
  };

  const handleRemovePokemon = async (teamId: number, position: number) => {
    try {
      await removePokemonFromTeam(teamId, position);
      // fetchTeams is called within removePokemonFromTeam in AuthProvider
    } catch (error) {
      console.error('Error removing Pokémon from team:', error);
    }
  };

  const renderPositionSelector = (team: any) => {
    // Get positions that are already taken in this team
    // AuthProvider returns 'team_members' from the join
    const teamMembers = team.team_members || [];

    return (
      <div className="mt-3">
        <p className="text-sm text-gray-600 mb-2">Select a position for this Pokémon on your team:</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((position) => {
            const pokemonAtPosition = teamMembers.find((m: any) => m.position === position);
            const isTaken = !!pokemonAtPosition;

            return (
              <button
                key={position}
                className={`
                  py-2 px-2 rounded-md flex flex-col items-center justify-center transition-all relative
                  ${isTaken ? 'bg-blue-50 border-2 border-blue-200 hover:bg-blue-100' :
                    'bg-gray-100 hover:bg-gray-200 hover:shadow-sm'}
                `}
                onClick={() => {
                  if (!isTaken) {
                    handleAddPokemon(team.id, position);
                  }
                }}
                title={isTaken ? 'This position is taken - click X to remove' : `Add to position ${position}`}
              >
                {isTaken && pokemonAtPosition ? (
                  <>
                    <div
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 z-10 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePokemon(team.id, position);
                      }}
                    >
                      <X size={12} />
                    </div>
                    <PokemonImage
                      pokemonId={pokemonAtPosition.pokemon_id}
                      alt={`Pokemon ${pokemonAtPosition.pokemon_id}`}
                      className="w-8 h-8 object-contain"
                    />
                    <div className="text-xs text-gray-600">Pos {position}</div>
                  </>
                ) : (
                  <>
                    <div className="text-xs mb-1">Position</div>
                    <div className="font-semibold">{position}</div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <p>Please log in to add Pokémon to teams.</p>
      </div>
    );
  }

  if (!teamsLoaded) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <p>Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Add to Team</h2>
        <button
          className="text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="mb-4 flex items-center">
        <PokemonImage
          pokemonId={pokemon.id}
          alt={pokemon.name}
          className="w-16 h-16 object-contain mr-3"
        />
        <div>
          <h3 className="font-semibold">{pokemon.name}</h3>
          <p className="text-sm text-gray-600">#{pokemon.id}</p>
        </div>
      </div>

      {isCreating ? (
        <div className="mb-4 p-3 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Create New Team</h3>
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">Team Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Enter team name"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg"
              value={newTeamDescription}
              onChange={(e) => setNewTeamDescription(e.target.value)}
              placeholder="Enter team description"
              rows={2}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              className="bg-gray-300 text-gray-800 px-3 py-1 rounded-lg"
              onClick={() => {
                setIsCreating(false);
                setNewTeamName('');
                setNewTeamDescription('');
              }}
            >
              Cancel
            </button>
            <button
              className="bg-green-500 text-white px-3 py-1 rounded-lg flex items-center"
              onClick={handleCreateTeam}
            >
              Create & Select
            </button>
          </div>
        </div>
      ) : (
        <button
          className="mb-4 w-full bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center justify-center"
          onClick={() => setIsCreating(true)}
        >
          <Plus size={16} className="mr-1" /> Create New Team
        </button>
      )}

      {(!teams || !Array.isArray(teams) || teams.length === 0) && !isCreating ? (
        <div className="text-center py-4">
          <p className="text-gray-500">You don't have any teams yet.</p>
          <p className="text-gray-500 mt-2">Create a team to add this Pokémon!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams && Array.isArray(teams) && teams.length > 0 && (
            <>
              <h3 className="font-semibold">Select Team & Position</h3>
              {teams.map((team) => (
                <div key={team.id} className="border rounded-lg p-3">
                  <h4 className="font-medium">{team.name}</h4>
                  {team.description && <p className="text-sm text-gray-600 mb-2">{team.description}</p>}
                  {renderPositionSelector(team)}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamSelector;
