import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Team } from '../../lib/supabase';
import { Plus, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

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
}

interface TeamSelectorProps {
  pokemon: Pokemon;
  onClose: () => void;
}

const TeamSelector: React.FC<TeamSelectorProps> = ({ pokemon, onClose }) => {
  const { user, teams, fetchTeams, createTeam, addPokemonToTeam, getTeamMembers } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<Record<number, number[]>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [addingToTeam, setAddingToTeam] = useState(false);

  useEffect(() => {
    const loadTeams = async () => {
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
      const membersMap: Record<number, number[]> = {};

      for (const team of teams) {
        const members = await getTeamMembers(team.id);
        membersMap[team.id] = members.map(m => m.position);
      }

      setTeamMembers(membersMap);
    };

    if (teams.length > 0) {
      loadTeamMembers();
    }
  }, [teams, getTeamMembers]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Team name is required');
      return;
    }

    setAddingToTeam(true);
    try {
      const team = await createTeam(newTeamName, newTeamDescription);
      if (team) {
        setIsCreating(false);
        setNewTeamName('');
        setNewTeamDescription('');
        setSelectedTeam(team.id);
      }
    } finally {
      setAddingToTeam(false);
    }
  };

  const handleAddToTeam = async (teamId: number, position: number) => {
    if (!user) {
      toast.error('You must be logged in to add Pokémon to a team');
      return;
    }

    setSelectedTeam(teamId);
    setSelectedPosition(position);
    setAddingToTeam(true);

    try {
      await addPokemonToTeam(teamId, pokemon.id, position);
      toast.success(`Added ${pokemon.name} to your team!`);
      
      setTeamMembers(prev => ({
        ...prev,
        [teamId]: [...(prev[teamId] || []), position]
      }));
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Failed to add Pokémon to team:', error);
    } finally {
      setAddingToTeam(false);
    }
  };

  const renderPositionSelector = (team: Team) => {
    const takenPositions = teamMembers[team.id] || [];
    
    return (
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
        {[1, 2, 3, 4, 5, 6].map((position) => {
          const isTaken = takenPositions.includes(position);
          const isSelected = selectedTeam === team.id && selectedPosition === position;
          
          return (
            <button
              key={`team-${team.id}-pos-${position}`}
              className={`w-12 h-12 rounded-lg flex items-center justify-center border ${
                isTaken 
                  ? 'bg-gray-200 cursor-not-allowed' 
                  : isSelected
                    ? 'bg-green-100 border-green-500'
                    : 'bg-white hover:bg-blue-50 cursor-pointer'
              }`}
              disabled={isTaken || addingToTeam}
              onClick={() => !isTaken && handleAddToTeam(team.id, position)}
            >
              {isTaken ? (
                <X size={16} className="text-gray-500" />
              ) : isSelected ? (
                <Check size={16} className="text-green-500" />
              ) : (
                position
              )}
            </button>
          );
        })}
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

  if (loading) {
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
          disabled={addingToTeam}
        >
          <X size={20} />
        </button>
      </div>

      <div className="mb-4 flex items-center">
        <img
          src={pokemon.sprites.other['official-artwork'].front_default}
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
              disabled={addingToTeam}
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
              disabled={addingToTeam}
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
              disabled={addingToTeam}
            >
              Cancel
            </button>
            <button
              className="bg-green-500 text-white px-3 py-1 rounded-lg flex items-center"
              onClick={handleCreateTeam}
              disabled={addingToTeam}
            >
              {addingToTeam ? 'Creating...' : 'Create & Select'}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="mb-4 w-full bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center justify-center"
          onClick={() => setIsCreating(true)}
          disabled={addingToTeam}
        >
          <Plus size={16} className="mr-1" /> Create New Team
        </button>
      )}

      {teams.length === 0 && !isCreating ? (
        <div className="text-center py-4">
          <p className="text-gray-500">You don't have any teams yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-semibold">Select Team & Position</h3>
          {teams.map((team) => (
            <div key={team.id} className="border rounded-lg p-3">
              <h4 className="font-medium">{team.name}</h4>
              {team.description && <p className="text-sm text-gray-600 mb-2">{team.description}</p>}
              {renderPositionSelector(team)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamSelector;
