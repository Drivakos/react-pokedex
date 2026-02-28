import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { TYPE_COLORS } from '../../types/pokemon';
import type { Team } from '../../lib/supabase';

interface Pokemon {
  id: number;
  name: string;
  sprites: { front_default: string };
  types: { type: { name: string } }[];
}

const TeamBuilder: React.FC<{
  onClose?: () => void;
  selectedPokemon?: Pokemon | null;
}> = ({ onClose, selectedPokemon }) => {
  const { user, teams, createTeam, updateTeam, deleteTeam, removePokemonFromTeam } = useAuth();

  const [teamsData, setTeamsData] = useState<Record<number, Pokemon[]>>({});
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);


  const handleRemovePokemon = async (teamId: number, position: number) => {
    try {
      await removePokemonFromTeam(teamId, position);
      // Refresh team data
      await loadTeamsData();
      toast.success('Pokémon removed from team!');
    } catch (error) {
      toast.error('Failed to remove Pokémon');
    }
  };

  // Load teams data
  const loadTeamsData = async () => {
    if (!teams?.length) return;

    const newTeamsData: Record<number, Pokemon[]> = {};

    for (const team of teams) {
      try {
        const response = await fetch(`/api/teams/${team.id}/members`);
        if (response.ok) {
          const members = await response.json();
          newTeamsData[team.id] = members;
        }
      } catch (error) {
        console.error(`Failed to load team ${team.id}:`, error);
      }
    }

    setTeamsData(newTeamsData);
  };

  // Load data on mount
  useEffect(() => {
    if (user && teams) {
      loadTeamsData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, teams]);

  // Handle selected Pokemon
  useEffect(() => {
    if (selectedPokemon && onClose) {
      onClose(); // Close modal when Pokemon is selected
    }
  }, [selectedPokemon, onClose]);

  // Form handlers
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Team name is required');
      return;
    }

    try {
      if (formMode === 'create') {
        await createTeam(formData.name, formData.description);
        toast.success('Team created!');
      } else if (editingTeamId) {
        await updateTeam(editingTeamId, formData.name, formData.description);
        toast.success('Team updated!');
      }

      setFormMode(null);
      setFormData({ name: '', description: '' });
      setEditingTeamId(null);
    } catch (error) {
      toast.error(`Failed to ${formMode} team`);
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      await deleteTeam(teamId);
      toast.success('Team deleted!');
    } catch (error) {
      toast.error('Failed to delete team');
    }
  };

  const startEdit = (team: Team) => {
    setFormMode('edit');
    setEditingTeamId(team.id);
    setFormData({ name: team.name, description: team.description || '' });
  };

  const TeamSlot = ({ teamId, position }: { teamId: number; position: number }) => {
    const pokemon = teamsData[teamId]?.[position - 1]; // Adjust for 0-based array

    return (
      <div className="relative aspect-square rounded-lg bg-white border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-blue-400 transition-colors">
        {pokemon ? (
          <>
            <img src={pokemon.sprites.front_default} alt={pokemon.name} className="w-16 h-16" />
            <p className="text-xs mt-1 capitalize truncate w-full text-center">{pokemon.name}</p>
            {pokemon.types?.[0] && (
              <span className={`${TYPE_COLORS[pokemon.types[0].type.name]} text-white text-xs px-2 py-1 rounded mt-1`}>
                {pokemon.types[0].type.name}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemovePokemon(teamId, position);
              }}
              className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-xs shadow-md"
            >
              ×
            </button>
          </>
        ) : (
          <div className="text-center">
            <Plus size={24} className="text-gray-400" />
            <span className="text-xs text-gray-500 mt-1 block">Empty</span>
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <p className="text-center text-gray-600">Please log in to manage teams</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <p className="text-center text-gray-600">Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Teams</h2>
        {!formMode && (
          <button
            onClick={() => setFormMode('create')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} /> New Team
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {formMode && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {formMode === 'create' ? 'Create Team' : 'Edit Team'}
          </h3>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Team name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded"
            />

            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded"
              rows={2}
            />

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                {formMode === 'create' ? 'Create' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setFormMode(null);
                  setFormData({ name: '', description: '' });
                  setEditingTeamId(null);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teams List */}
      {!teams?.length ? (
        <div className="text-center py-12 text-gray-500">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p className="mb-4">No teams yet</p>
          <button
            onClick={() => setFormMode('create')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => (
            <div key={team.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{team.name}</h3>
                  {team.description && (
                    <p className="text-gray-600 text-sm">{team.description}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(team)}
                    className="text-blue-500 hover:text-blue-700 p-2"
                    title="Edit team"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(team.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                    title="Delete team"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Team Slots */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((position) => (
                  <TeamSlot key={position} teamId={team.id} position={position} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamBuilder;
