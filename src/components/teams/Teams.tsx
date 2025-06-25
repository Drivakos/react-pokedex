import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Team } from '../../lib/supabase';
import { ChevronRight, Settings, Sword, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatName, getOfficialArtwork } from '../../utils/helpers';
import MovesetEditor from './MovesetEditor';

interface TeamMember {
  id: number;
  team_id: number;
  pokemon_id: number;
  position: number;
}

interface PokemonWithMoves {
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
  moves: string[];
}

const Teams: React.FC = () => {
  const { user, teams, fetchTeams, getTeamMembers } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pokemonDetails, setPokemonDetails] = useState<Record<number, PokemonWithMoves>>({});
  const [selectedPokemon, setSelectedPokemon] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Use ref to track if teams have been fetched to prevent infinite loops
  const hasFetchedTeams = useRef(false);

  useEffect(() => {
    const loadTeams = async () => {
      if (!user || hasFetchedTeams.current) return;
      
      setLoading(true);
      hasFetchedTeams.current = true;
      
      try {
        console.log('🔄 Loading teams...');
        if (fetchTeams && typeof fetchTeams === 'function') {
          await fetchTeams();
          console.log('✅ Teams loaded successfully');
        }
      } catch (error) {
        console.error('❌ Error loading teams:', error);
        toast.error('Failed to load teams');
        hasFetchedTeams.current = false; // Reset on error to allow retry
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [user]); // Only depend on user, not fetchTeams

  // Reset fetch flag when component unmounts or user changes
  useEffect(() => {
    return () => {
      hasFetchedTeams.current = false;
    };
  }, [user]);

  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!selectedTeam || !getTeamMembers) return;

      try {
        const members = await getTeamMembers(selectedTeam.id);
        setTeamMembers(members);
        
        // Load Pokemon details for each team member
        const pokemonDetailsMap: Record<number, PokemonWithMoves> = {};
        
        for (const member of members) {
          try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${member.pokemon_id}`);
            if (response.ok) {
              const pokemon = await response.json();
              console.log(`🎮 Loaded Pokemon ${member.pokemon_id}:`, {
                name: pokemon.name,
                id: pokemon.id,
                sprites: pokemon.sprites,
                officialArtwork: pokemon.sprites?.other?.['official-artwork']?.front_default
              });
              pokemonDetailsMap[member.pokemon_id] = {
                id: pokemon.id,
                name: pokemon.name,
                sprites: pokemon.sprites,
                types: pokemon.types,
                moves: [], // Will be loaded from database
              };
            }
          } catch (error) {
            console.error(`Failed to fetch Pokemon ${member.pokemon_id}:`, error);
          }
        }
        
        setPokemonDetails(pokemonDetailsMap);
      } catch (error) {
        console.error('Error loading team members:', error);
        toast.error('Failed to load team members');
      }
    };

    loadTeamMembers();
  }, [selectedTeam, getTeamMembers]);

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    setSelectedPokemon(null);
  };

  const handlePokemonSelect = (pokemonId: number) => {
    setSelectedPokemon(pokemonId);
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
    setSelectedPokemon(null);
  };

  const handleBackToPokemon = () => {
    setSelectedPokemon(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Teams & Movesets</h1>
          <p className="text-gray-600">Please sign in to manage your teams and movesets.</p>
        </div>
      </div>
    );
  }

  // Show moveset editor if a specific Pokemon is selected
  if (selectedPokemon && pokemonDetails[selectedPokemon]) {
    return (
      <MovesetEditor
        pokemon={pokemonDetails[selectedPokemon]}
        teamId={selectedTeam!.id}
        onBack={handleBackToPokemon}
      />
    );
  }

  // Show team Pokemon if a team is selected
  if (selectedTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={handleBackToTeams}
              className="text-blue-600 hover:text-blue-800 mb-4 flex items-center transition-colors"
            >
              ← Back to Teams
            </button>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{selectedTeam.name}</h1>
            {selectedTeam.description && (
              <p className="text-gray-600">{selectedTeam.description}</p>
            )}
          </div>

          {/* Team Pokemon Grid */}
          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <Settings className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Pokémon in this team</h3>
                <p className="text-gray-600">Add Pokémon to this team first to manage their movesets.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member) => {
                const pokemon = pokemonDetails[member.pokemon_id];
                if (!pokemon) return null;

                return (
                  <div
                    key={member.id}
                    onClick={() => handlePokemonSelect(member.pokemon_id)}
                    className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-300"
                  >
                    <div className="text-center">
                      <div className="relative mb-4">
                        <img
                          src={getOfficialArtwork(pokemon.sprites)}
                          alt={formatName(pokemon.name)}
                          className="w-24 h-24 mx-auto object-contain"
                          onError={(e) => {
                            // Fallback to regular sprite if official artwork fails
                            const target = e.target as HTMLImageElement;
                            target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
                          }}
                        />
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          #{pokemon.id}
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {formatName(pokemon.name)}
                      </h3>
                      
                      <div className="flex justify-center gap-1 mb-4">
                        {pokemon.types.map((type, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 rounded-md text-xs font-medium text-white"
                            style={{ backgroundColor: `var(--type-${type.type.name})` }}
                          >
                            {formatName(type.type.name)}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <Sword size={16} />
                        <span>Position {member.position}</span>
                        <ChevronRight size={16} className="text-blue-500" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show teams list
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Teams & Movesets</h1>
          <p className="text-gray-600 text-lg">Select a team to manage your Pokémon movesets</p>
        </div>

        {/* Teams Grid */}
        {!teams || teams.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <Shield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No teams found</h3>
              <p className="text-gray-600 mb-4">Create your first team to start managing movesets.</p>
              <button
                onClick={() => window.location.href = '/profile'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Go to Profile to Create Teams
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => handleTeamSelect(team)}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{team.name}</h3>
                  <ChevronRight size={20} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                </div>
                
                {team.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">{team.description}</p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Settings size={16} />
                  <span>Manage movesets</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;
