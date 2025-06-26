import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Team, TeamMember, supabase } from '../../lib/supabase';
import { checkSession, withSession } from '../../lib/auth-helpers';
import { Plus, X } from 'lucide-react';
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
  const { user, teams, fetchTeams, getTeamMembers, removePokemonFromTeam } = auth;
  
  const addPokemonToTeam = useCallback(async (teamId: number, pokemonId: number, position: number) => {
    if (!auth.addPokemonToTeam || typeof auth.addPokemonToTeam !== 'function') {
      console.error('addPokemonToTeam is not available or not a function:', auth.addPokemonToTeam);
      return;
    }
    return auth.addPokemonToTeam(teamId, pokemonId, position);
  }, [auth]);
  
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<Record<number, number[]>>({});
  const [teamMemberDetails, setTeamMemberDetails] = useState<Record<number, TeamMember[]>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');

  // Track if we've fetched data to prevent infinite loops
  const hasFetchedTeams = useRef(false);
  const hasFetchedMembers = useRef(false);

  // Load data ONCE when the component mounts (modal opens)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (hasFetchedTeams.current) return; // Prevent multiple fetches
      
      setLoading(true);
      
      try {
        // Step 1: Fetch teams fresh when modal opens
        if (user && typeof fetchTeams === 'function') {
          await fetchTeams();
          hasFetchedTeams.current = true;
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
        toast.error('Failed to load teams');
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch if we have a user and haven't fetched yet
    if (user && !hasFetchedTeams.current) {
      fetchInitialData();
    }
  }, [user]); // Only depend on user, not fetchTeams

  // Fetch team members ONCE after teams are loaded
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (hasFetchedMembers.current) return; // Prevent multiple fetches
      
      if (teams && teams.length > 0 && typeof getTeamMembers === 'function') {
        try {
          const members: Record<number, number[]> = {};
          const memberDetails: Record<number, TeamMember[]> = {};
          
          for (const team of teams) {
            const teamMembers = await getTeamMembers(team.id);
            // Store the positions that are taken, not pokemon IDs
            members[team.id] = teamMembers.map(member => member.position);
            memberDetails[team.id] = teamMembers;
          }
          
          setTeamMembers(members);
          setTeamMemberDetails(memberDetails);
          hasFetchedMembers.current = true;
        } catch (error) {
          console.error('Error fetching team members:', error);
        }
      }
    };

    // Only fetch if we have teams and haven't fetched members yet
    if (teams && teams.length > 0 && !hasFetchedMembers.current) {
      fetchTeamMembers();
    }
  }, [teams]); // Only depend on teams, not getTeamMembers

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
        toast.error('Team creation is not available');
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error('Failed to create team: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddPokemon = async (teamId: number, position: number) => {
    try {
      // Check that we have a valid session before adding the Pokémon
      const sessionValid = await checkSession();
      if (!sessionValid) {
        toast.error('Please sign in again to add Pokémon to your team');
        return;
      }
      
      let success = false;
      
      try {
        await addPokemonToTeam(teamId, pokemon.id, position);
        success = true;
      } catch (error) {
        console.error('❌ Error in addPokemonToTeam:', error);
        success = false;
      }
      
      if (success) {
        // Refresh team members from database to get accurate state
        if (typeof getTeamMembers === 'function') {
          try {
            const freshTeamMembers = await getTeamMembers(teamId);
            setTeamMembers(prev => ({
              ...prev,
              [teamId]: freshTeamMembers.map(member => member.position)
            }));
            setTeamMemberDetails(prev => ({
              ...prev,
              [teamId]: freshTeamMembers
            }));
          } catch (error) {
            console.error('Error refreshing team members:', error);
          }
        }
        
        toast.success(`Added ${pokemon.name} to team!`);
        onClose();
      } else {
        toast.error('Failed to add Pokémon to team');
      }
    } catch (error) {
      console.error('Error adding Pokémon to team:', error);
      toast.error('Failed to add Pokémon to team');
    }
  };

  const handleRemovePokemon = async (teamId: number, position: number) => {
    try {
      // Check that we have a valid session before removing the Pokémon
      const sessionValid = await checkSession();
      if (!sessionValid) {
        toast.error('Please sign in again to remove Pokémon from your team');
        return;
      }
      
      let success = false;
      
      if (typeof removePokemonFromTeam === 'function') {
        await removePokemonFromTeam(teamId, position);
        success = true;
      } else {
        // Fallback to direct database access if the context method isn't available
        const result = await withSession(async () => {
          const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('position', position);
            
          if (error) {
            console.error('Direct remove from team error:', error);
            return { error };
          }
          
          return { data: true, error: null };
        });
        
        success = result && !result.error;
        if (!success) {
          console.error('❌ Direct removal failed:', result?.error);
        }
      }
      
      if (success) {
        // Refresh team members from database to get accurate state
        if (typeof getTeamMembers === 'function') {
          try {
            const freshTeamMembers = await getTeamMembers(teamId);
            setTeamMembers(prev => ({
              ...prev,
              [teamId]: freshTeamMembers.map(member => member.position)
            }));
            setTeamMemberDetails(prev => ({
              ...prev,
              [teamId]: freshTeamMembers
            }));
          } catch (error) {
            console.error('Error refreshing team members:', error);
          }
        }
        
        toast.success(`Removed Pokémon from team!`);
      } else {
        toast.error('Failed to remove Pokémon from team');
      }
    } catch (error) {
      console.error('Error removing Pokémon from team:', error);
      toast.error('Failed to remove Pokémon from team');
    }
  };

  const renderPositionSelector = (team: Team) => {
    // Get positions that are already taken in this team
    const takenPositions = teamMembers[team.id] || [];
    const teamDetails = teamMemberDetails[team.id] || [];
    
    // Helper function to get Pokemon data for a position
    const getPokemonAtPosition = (position: number) => {
      return teamDetails.find(member => member.position === position);
    };
    
    return (
      <div className="mt-3">
        <p className="text-sm text-gray-600 mb-2">Select a position for this Pokémon on your team:</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((position) => {
            const isTaken = takenPositions.includes(position);
            const pokemonAtPosition = getPokemonAtPosition(position);
            
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
                    {/* Remove button */}
                    <div
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 z-10 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePokemon(team.id, position);
                      }}
                      title="Remove Pokemon"
                    >
                      <X size={12} />
                    </div>
                    {/* Pokemon sprite */}
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonAtPosition.pokemon_id}.png`}
                      alt={`Pokemon ${pokemonAtPosition.pokemon_id}`}
                      className="w-8 h-8 object-contain"
                    />
                    <div className="text-xs text-gray-600">Pos {position}</div>
                  </>
                ) : (
                  <>
                    <div className="text-xs mb-1">
                      Position
                    </div>
                    <div className="font-semibold">
                      {position}
                    </div>
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
