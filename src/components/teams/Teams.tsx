import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Team } from '../../lib/supabase';

const Teams: React.FC = () => {
  const { user, teams, teamsLoaded, fetchTeams, createTeam, deleteTeam } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleTeamSelect = (team: Team) => {
    // Navigate directly to team editor instead of showing details
    navigate(`/team-editor/${team.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, team: Team) => {
    e.stopPropagation(); // Don't navigate to editor
    setTeamToDelete(team);
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;

    try {
      setDeleting(true);
      await deleteTeam(teamToDelete.id);
      setTeamToDelete(null);
    } catch (error) {
      console.error('Failed to delete team:', error);
      toast.error('Failed to delete team');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Team name is required');
      return;
    }

    try {
      setCreating(true);
      const newTeam = await createTeam(formData.name.trim(), formData.description.trim() || undefined);

      if (newTeam) {
        setShowCreateModal(false);
        setFormData({ name: '', description: '' });
        // fetchTeams is already called within createTeam (in AuthProvider)
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  if (!teamsLoaded && user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your teams...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Teams</h1>
          <p className="text-gray-600">Please sign in to view your teams.</p>
        </div>
      </div>
    );
  }


  // Show teams list
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Your Teams</h1>
          <p className="text-gray-600">Manage your Pokemon teams</p>
        </div>

        {!teams || teams.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg p-8 shadow-md">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No teams yet</h3>
              <p className="text-gray-600 mb-4">Create your first team to get started.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded font-medium"
              >
                Create Team
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleTeamSelect(team)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{team.name}</h3>
                    {team.description && (
                      <p className="text-gray-600 mt-1 line-clamp-2">{team.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleDeleteClick(e, team)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete Team"
                    >
                      <Trash2 size={20} />
                    </button>
                    <ChevronRight className="text-blue-500 self-center" />
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  Created {team.created_at ? new Date(team.created_at).toLocaleDateString() : '—'}
                </div>
              </div>
            ))}

            {/* Create new team card */}
            <div
              onClick={() => setShowCreateModal(true)}
              className="bg-gray-100 rounded-lg p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer"
            >
              <div className="text-center">
                <Plus className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Create New Team</h3>
                <p className="text-gray-500">Add a new team to organize your Pokemon</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Create New Team</h2>
              <button
                onClick={() => !creating && (setShowCreateModal(false), setFormData({ name: '', description: '' }))}
                disabled={creating}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter team name"
                  disabled={creating}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Describe your team..."
                  rows={3}
                  disabled={creating}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => !creating && (setShowCreateModal(false), setFormData({ name: '', description: '' }))}
                  disabled={creating}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-md font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !formData.name.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-md font-medium disabled:opacity-50 flex items-center justify-center"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Team'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Team Confirmation Modal */}
      {teamToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Team?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-bold text-gray-800">"{teamToDelete.name}"</span>? 
              This will remove all Pokémon from this team and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                onClick={() => setTeamToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete Team
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
