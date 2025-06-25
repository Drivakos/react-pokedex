import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Team, supabase } from '../../lib/supabase';
import { checkSession, withSession } from '../../lib/auth-helpers';
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
  const auth = useAuth();
  const { user, teams, fetchTeams, getTeamMembers } = auth;
  
  const addPokemonToTeam = useCallback(async (teamId: number, pokemonId: number, position: number) => {
    if (!auth.addPokemonToTeam || typeof auth.addPokemonToTeam !== 'function') {
      console.error('addPokemonToTeam is not available or not a function:', auth.addPokemonToTeam);
      return;
    }
    return auth.addPokemonToTeam(teamId, pokemonId, position);
  }, [auth]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<Record<number, number[]>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [addingToTeam, setAddingToTeam] = useState(false);


  // Track if we've already fetched data to prevent multiple fetches
  const hasInitiallyFetched = React.useRef(false);
  
  // Load data just once when the component mounts (modal opens)
  useEffect(() => {
    // Only fetch if we haven't already
    if (!hasInitiallyFetched.current) {
      const fetchInitialData = async () => {
        setLoading(true);
        
        try {
          // Step 1: Fetch teams if we have a user
          if (user && typeof fetchTeams === 'function') {
            await fetchTeams();
            
            // Step 2: Fetch team members only after teams are loaded
            // This ensures we use the freshly loaded teams
            if (teams && teams.length > 0 && typeof getTeamMembers === 'function') {
              const members: Record<number, number[]> = {};
              
              for (const team of teams) {
                const teamMembers = await getTeamMembers(team.id);
                members[team.id] = teamMembers.map(member => member.pokemon_id);
              }
              
              setTeamMembers(members);
            }
          }
        } catch (error) {
          console.error('Error in initial data fetch:', error);
          toast.error('Failed to load teams data');
        } finally {
          setLoading(false);
          hasInitiallyFetched.current = true;
        }
      };
      
      fetchInitialData();
    }
  }, [user, fetchTeams, teams, getTeamMembers]); // Including dependencies to satisfy linter

  // Direct Supabase access for diagnostics
  const directCreateTeam = async () => {
    if (!user || !user.id) {
      toast.error('Not logged in');
      return null;
    }
    
    // Using our auth    // Session wrapper for database operations
    const result = await withSession(async () => {
      try {
        // Create the team with valid session from withSession helper
        const { data, error } = await supabase
          .from('teams')
          .insert([{
            user_id: user.id,
            name: newTeamName,
            description: newTeamDescription || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) {
          console.error('Direct team creation error:', error);
          
          if (error.code === '42501' || error.message?.includes('permission denied')) {
            toast.error('Permission denied: Row Level Security is blocking this operation.');
          } else if (error.code === '23505') {
            toast.error('Team name already exists');
          } else {
            toast.error(`Failed to create team: ${error.message}`);
          }
          return { data: null, error };
        }
        
        if (data) {
          // Successfully created team
          toast.success('Team created successfully!');
          
          // Clear the form
          setNewTeamName('');
          setNewTeamDescription('');
          setIsCreating(false);
          
          // Auto-select the new team
          setSelectedTeam(data.id);
          
          // Fetch teams to update the UI
          if (auth?.fetchTeams) {
            await auth.fetchTeams();
          } else if (typeof fetchTeams === 'function') {
            await fetchTeams();
          }
        }
        
        return { data, error: null };
      } catch (err) {
        console.error('Direct team creation exception:', err);
        toast.error('An unexpected error occurred');
        return { data: null, error: err };
      }
    });
    
    return result?.data || null;
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTeamName) {
      toast.error('Please enter a team name');
      return;
    }
    
    try {
      setIsCreating(true);
      
      // Check that we have a valid session
      const sessionValid = await checkSession();
      if (!sessionValid) {
        toast.error('Please sign in again to create a team');
        return;
      }
      
      if (auth?.createTeam && typeof auth.createTeam === 'function') {
        // Use the auth context method with our freshly refreshed session
        const team = await auth.createTeam(newTeamName, newTeamDescription);
        
        if (team) {
          setIsCreating(false);
          setNewTeamName('');
          setNewTeamDescription('');
          toast.success('Team created successfully!');
        }
      } else {
        // Fall back to direct create if auth context method not available
        await directCreateTeam();
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error('Failed to create team: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddPokemon = async (teamId: number, position: number) => {
    setSelectedTeam(teamId);
    setSelectedPosition(position);
    setAddingToTeam(true);
    
    try {
      // Check that we have a valid session before adding the Pokémon
      const sessionValid = await checkSession();
      if (!sessionValid) {
        toast.error('Please sign in again to add Pokémon to your team');
        return;
      }
      
      let success = false;
      
      if (typeof addPokemonToTeam === 'function') {
        await addPokemonToTeam(teamId, pokemon.id, position);
        success = true;
      } else {
        // Fallback to direct database access if the context method isn't available
        const result = await withSession(async () => {
          const { error } = await supabase
            .from('team_members')
            .upsert({
              team_id: teamId,
              pokemon_id: pokemon.id,
              position: position,
              created_at: new Date().toISOString()
            });
            
          if (error) {
            console.error('Direct add to team error:', error);
            return { error };
          }
          
          return { data: true, error: null };
        });
        
        success = result && !result.error;
      }
      
      if (success) {
        // Update local state immediately for UI feedback
        setTeamMembers(prev => {
          const updatedMembers = { ...prev };
          
          // Initialize array for team if it doesn't exist
          if (!updatedMembers[teamId]) {
            updatedMembers[teamId] = [];
          }
          
          // Add the position to the taken positions array
          // Since we store position numbers in this array, not pokemon IDs
          if (!updatedMembers[teamId].includes(position)) {
            updatedMembers[teamId] = [...updatedMembers[teamId], position];
          }
          
          return updatedMembers;
        });
        
        toast.success(`Added ${pokemon.name} to team!`);
        onClose();
      } else {
        toast.error('Failed to add Pokémon to team');
      }
    } catch (error) {
      console.error('Error adding Pokémon to team:', error);
      toast.error('Failed to add Pokémon to team');
    } finally {
      setAddingToTeam(false);
    }
  };

  const renderPositionSelector = (team: Team) => {
    // Get positions that are already taken in this team
    const takenPositions = teamMembers[team.id] || [];
    
    return (
      <div className="mt-3">
        <p className="text-sm text-gray-600 mb-2">Select a position for this Pokémon on your team:</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((position) => {
            const isTaken = takenPositions.includes(position);
            const isSelected = selectedTeam === team.id && selectedPosition === position;
            
            return (
              <button
                key={position}
                className={`
                  py-2 px-2 rounded-md flex flex-col items-center justify-center transition-all
                  ${isTaken ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 
                    isSelected ? 'bg-green-500 text-white ring-2 ring-green-300' : 
                    'bg-gray-100 hover:bg-gray-200 hover:shadow-sm'}
                `}
                onClick={() => {
                  if (!isTaken && !addingToTeam) {
                    setSelectedTeam(team.id);
                    setSelectedPosition(position);
                    handleAddPokemon(team.id, position);
                  }
                }}
                disabled={isTaken || addingToTeam}
                title={isTaken ? 'This position is already taken' : `Add to position ${position}`}
              >
                <div className="text-xs mb-1">
                  {isTaken ? 'Taken' : 'Position'}
                </div>
                <div className="font-semibold">
                  {isTaken ? (
                    <X size={16} />
                  ) : isSelected ? (
                    <Check size={16} />
                  ) : (
                    position
                  )}
                </div>
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
