import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Team } from '../../lib/supabase';
import { Plus, X, Edit, Trash2, Save, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { TYPE_COLORS } from '../../types/pokemon';
import { formatName, getOfficialArtwork } from '../../utils/helpers';
import PokemonImage from '../common/PokemonImage';

interface Pokemon {
  id: number;
  name: string;
  sprites: {
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  types: {
    type: {
      name: string;
    };
  }[];
}

const TeamBuilder: React.FC<{
  onClose?: () => void;
  selectedPokemon?: Pokemon | null;
}> = ({ onClose, selectedPokemon }) => {
  const { user, teams, fetchTeams, createTeam, updateTeam, deleteTeam, addPokemonToTeam, removePokemonFromTeam, getTeamMembers, favorites } = useAuth();
  const [teamPokemon, setTeamPokemon] = useState<Record<number, Record<number, Pokemon>>>({});
  const [poolDetails, setPoolDetails] = useState<Pokemon[]>([]);
  const [selectedPoolPokemon, setSelectedPoolPokemon] = useState<Pokemon | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  // Define handleAddPokemon first with useCallback to avoid it being used before declaration
  const handleAddPokemon = useCallback(async (teamId: number, pokemonId: number, position: number) => {
    if (!addPokemonToTeam || typeof addPokemonToTeam !== 'function') {
      console.error('addPokemonToTeam is not available or not a function');
      toast.error('Failed to add Pokémon to team: System error');
      return;
    }
    
    await addPokemonToTeam(teamId, pokemonId, position);
    
    // Refresh team members
    if (!getTeamMembers || typeof getTeamMembers !== 'function') {
      console.error('getTeamMembers is not available or not a function');
      return;
    }
    
    const members = await getTeamMembers(teamId);
    setTeamPokemon((prev: Record<number, Record<number, Pokemon>>) => ({
      ...prev,
      [teamId]: members.reduce((acc, member) => ({ ...acc, [member.position]: prev[teamId]?.[member.position] }), {})
    }));
    
    // Prefetch pokemon if not already loaded
    const pokemonInState = teamPokemon[teamId]?.[position];
    if (!pokemonInState) {
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
        if (response.ok) {
          const pokemon = await response.json();
          setTeamPokemon(prev => ({
            ...prev,
            [teamId]: {
              ...prev[teamId],
              [position]: pokemon
            }
          }));
        }
      } catch (error) {
        console.error(`Failed to fetch Pokémon ${pokemonId}:`, error);
        toast.error(`Failed to add Pokémon to team: ${error}`);
      }
    }
  }, [addPokemonToTeam, getTeamMembers, teamPokemon, setTeamPokemon]);

  const handleRemovePokemon = useCallback(async (teamId: number, position: number) => {
    if (!removePokemonFromTeam || typeof removePokemonFromTeam !== 'function') {
      console.error('removePokemonFromTeam is not available or not a function');
      toast.error('Failed to remove Pokémon from team: System error');
      return;
    }
    
    await removePokemonFromTeam(teamId, position);
    
    // Update local state
    setTeamPokemon(prev => {
      const newPokemon = { ...prev };
      if (newPokemon[teamId] && newPokemon[teamId][position]) {
        delete newPokemon[teamId][position];
      }
      return newPokemon;
    });
  }, [removePokemonFromTeam]);

  useEffect(() => {
    const loadTeams = async () => {
      if (!fetchTeams || typeof fetchTeams !== 'function') {
        console.error('fetchTeams is not available or not a function');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      await fetchTeams();
      setLoading(false);
    };

    if (user) {
      loadTeams();
    }
  }, [user, fetchTeams]);

  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!getTeamMembers || typeof getTeamMembers !== 'function') {
        console.error('getTeamMembers is not available or not a function');
        return;
      }
      
      const pokemonMap: Record<number, Record<number, Pokemon>> = {};

      if (teams && Array.isArray(teams)) {
        for (const team of teams) {
        const members = await getTeamMembers(team.id);
        
        pokemonMap[team.id] = {};
        for (const member of members) {
          try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${member.pokemon_id}`);
            if (response.ok) {
              const pokemonData = await response.json();
              pokemonMap[team.id][member.position] = pokemonData;
            }
          } catch (error) {
            console.error(`Failed to fetch Pokémon ${member.pokemon_id}:`, error);
          }
        }
      }
      }

      setTeamPokemon(pokemonMap);
    };

    if (teams && Array.isArray(teams) && teams.length > 0) {
      loadTeamMembers();
    }
  }, [teams, getTeamMembers]);

  useEffect(() => {
    const loadPool = async () => {
      const ids = favorites.map(f => f.pokemon_id);
      if (selectedPokemon && !ids.includes(selectedPokemon.id)) ids.unshift(selectedPokemon.id);
      const details: Pokemon[] = [];
      for (const id of ids) {
        try {
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
          if (res.ok) {
            const data = await res.json();
            details.push(data);
          }
        } catch (e) {
          console.error('TeamBuilder: load pool failed', id, e);
        }
      }
      setPoolDetails(details);
    };
    if (favorites?.length || selectedPokemon) loadPool();
  }, [favorites, selectedPokemon]);

  useEffect(() => {
    if (selectedPokemon && selectedTeam !== null && selectedPosition !== null) {
      handleAddPokemon(selectedTeam, selectedPokemon.id, selectedPosition);
      setSelectedTeam(null);
      setSelectedPosition(null);
    }
  }, [selectedPokemon, selectedTeam, selectedPosition, handleAddPokemon]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Team name is required');
      return;
    }
    
    if (!createTeam || typeof createTeam !== 'function') {
      console.error('createTeam is not available or not a function');
      toast.error('Failed to create team: System error');
      return;
    }
    
    try {
      setIsCreating(true);
      const team = await createTeam(newTeamName, newTeamDescription);
      
      if (team) {
        setIsCreating(false);
        setNewTeamName('');
        setNewTeamDescription('');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
      setIsCreating(false);
    }
  };

  const handleUpdateTeam = async (teamId: number) => {
    if (!newTeamName.trim()) {
      toast.error('Team name is required');
      return;
    }
    
    if (!updateTeam || typeof updateTeam !== 'function') {
      console.error('updateTeam is not available or not a function');
      toast.error('Failed to update team: System error');
      return;
    }
    
    try {
      await updateTeam(teamId, newTeamName, newTeamDescription);
      setIsEditing(null);
      setNewTeamName('');
      setNewTeamDescription('');
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team');
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!deleteTeam || typeof deleteTeam !== 'function') {
      console.error('deleteTeam is not available or not a function');
      toast.error('Failed to delete team: System error');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this team?')) {
      await deleteTeam(teamId);
    }
  };

  const handleEditTeam = (team: Team) => {
    setIsEditing(team.id);
    setNewTeamName(team.name);
    setNewTeamDescription(team.description || '');
  };

  const selectPokemonForTeam = (teamId: number, position: number) => {
    setSelectedTeam(teamId);
    setSelectedPosition(position);
    if (onClose) {
      onClose();
    }
  };

  const renderTeamSlot = (teamId: number, position: number) => {
    const pokemon = teamPokemon[teamId]?.[position];
    
    return (
      <div 
        key={position}
        className={`aspect-square rounded-lg shadow-md ${pokemon ? 'bg-gradient-to-b from-gray-50 to-gray-100 p-2' : 'bg-white p-4 border border-dashed border-gray-300'} 
        flex flex-col items-center justify-center overflow-hidden transition-all duration-300 
        ${!pokemon ? 'hover:shadow-lg hover:border-blue-300 cursor-pointer transform hover:scale-105' : ''}`}
        onClick={() => !pokemon && selectPokemonForTeam(teamId, position)}
      >
        {pokemon ? (
          <>
            <div className="relative w-full">
              <PokemonImage 
                pokemon={pokemon}
                fallbackId={pokemon.id}
                alt={formatName(pokemon.name)}
                size="lg" 
                className="w-full h-auto drop-shadow-md transform transition-transform duration-300 hover:scale-110"
              />
              <button 
                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePokemon(teamId, position);
                }}
                title="Remove from team"
              >
                <X size={14} />
              </button>
              
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-20 py-1 px-2">
                <p className="text-xs text-white font-medium capitalize truncate w-full text-center">
                  {formatName(pokemon.name)}
                </p>
              </div>
            </div>
            
            {pokemon.types && pokemon.types.length > 0 && (
              <div className="flex gap-1 mt-2 justify-center">
                {pokemon.types.slice(0, 2).map((typeObj) => {
                  const typeName = typeof typeObj === 'string' ? typeObj : typeObj.type.name;
                  return (
                    <span
                      key={typeName}
                      className={`${TYPE_COLORS[typeName]} text-white px-2 py-0.5 rounded-full text-xs font-medium capitalize shadow-sm`}
                    >
                      {typeName}
                    </span>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-400 hover:text-blue-500 cursor-pointer flex flex-col items-center">
            <Plus size={28} />
            <span className="text-xs mt-1">Add Pokémon</span>
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-lg">
        <p className="text-lg text-gray-600">Please log in to manage your teams.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-lg">
        <p className="text-lg text-gray-600">Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
        <Users className="mr-2 text-blue-500" /> Pokémon Teams
      </h2>

      <div className="mb-6 flex justify-between items-center">
        <p className="text-gray-600">
          Build teams of up to 6 Pokémon each.
        </p>
        {!isCreating && (
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-md transition-all duration-300 hover:shadow-lg transform hover:scale-105"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={18} className="mr-2" /> Create Team
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 shadow-md border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Create New Team</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">Team Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Enter team name"
            />
          </div>
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2 text-gray-700">Description (optional)</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={newTeamDescription}
              onChange={(e) => setNewTeamDescription(e.target.value)}
              placeholder="Enter team description"
              rows={2}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-300 flex items-center"
              onClick={() => {
                setIsCreating(false);
                setNewTeamName('');
                setNewTeamDescription('');
              }}
            >
              <X size={16} className="mr-2" /> Cancel
            </button>
            <button
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center"
              onClick={handleCreateTeam}
            >
              <Plus size={16} className="mr-2" /> Create Team
            </button>
          </div>
        </div>
      )}

      {poolDetails.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Pool</h3>
          <div className="flex space-x-2 overflow-x-auto p-2 bg-gray-50 rounded-lg">
            {poolDetails.map((p) => (
              <div
                key={p.id}
                className={`p-2 bg-white rounded shadow flex flex-col items-center cursor-pointer ${selectedPoolPokemon?.id === p.id ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setSelectedPoolPokemon(p)}
              >
                <img src={getOfficialArtwork(p)} alt={p.name} className="h-12 w-12 object-contain" />
                <span className="text-xs mt-1 capitalize">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!teams || !Array.isArray(teams) || teams.length === 0) && !isCreating ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-5 text-lg">You don't have any teams yet.</p>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 font-medium"
            onClick={() => setIsCreating(true)}
          >
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {teams && Array.isArray(teams) && teams.map((team) => (
            <div key={team.id} className="border border-gray-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-b from-white to-gray-50">
              {isEditing === team.id ? (
                <div className="mb-5">
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-gray-700">Team Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-gray-700">Description</label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      value={newTeamDescription}
                      onChange={(e) => setNewTeamDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-300 flex items-center"
                      onClick={() => {
                        setIsEditing(null);
                        setNewTeamName('');
                        setNewTeamDescription('');
                      }}
                    >
                      <X size={16} className="mr-2" /> Cancel
                    </button>
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center"
                      onClick={() => handleUpdateTeam(team.id)}
                    >
                      <Save size={16} className="mr-2" /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{team.name}</h3>
                    {team.description && <p className="text-gray-600 mt-1">{team.description}</p>}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-full transition-colors"
                      onClick={() => handleEditTeam(team)}
                      title="Edit team"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                      onClick={() => handleDeleteTeam(team.id)}
                      title="Delete team"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((position) => renderTeamSlot(team.id, position))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamBuilder;
