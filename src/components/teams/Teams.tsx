import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Team } from '../../lib/supabase';
import { ChevronRight, Settings, Sword, Shield, Copy } from 'lucide-react';
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

  const exportSinglePokemon = async (pokemonId: number) => {
    try {
      const pokemon = pokemonDetails[pokemonId];
      if (!pokemon) {
        toast.error('Pokemon data not found');
        return;
      }

      // Try to load build data from localStorage
      const buildKey = `pokemon-build-${pokemonId}`;
      const savedBuild = localStorage.getItem(buildKey);
      
      let build = null;
      if (savedBuild) {
        try {
          build = JSON.parse(savedBuild);
        } catch (e) {
          console.warn(`Failed to parse build for ${pokemon.name}`);
        }
      }

      // Default values if no build saved
      const pokemonName = formatName(pokemon.name);
      const heldItem = build?.heldItem ? formatName(build.heldItem) : '';
      const ability = build?.ability ? formatName(build.ability) : '';
      const nature = build?.nature ? formatName(build.nature) : 'Hardy';
      const moves = build?.moves || [];
      const nickname = build?.nickname || '';
      const teraType = build?.teraType || '';

      // Format EVs (only show non-zero values)
      const evs = build?.evs || {};
      const evStrings: string[] = [];
      if (evs.hp > 0) evStrings.push(`${evs.hp} HP`);
      if (evs.attack > 0) evStrings.push(`${evs.attack} Atk`);
      if (evs.defense > 0) evStrings.push(`${evs.defense} Def`);
      if (evs['special-attack'] > 0) evStrings.push(`${evs['special-attack']} SpA`);
      if (evs['special-defense'] > 0) evStrings.push(`${evs['special-defense']} SpD`);
      if (evs.speed > 0) evStrings.push(`${evs.speed} Spe`);

      // Build the Pokemon export string
      let pokemonExport = '';
      
      // Pokemon name and item (with nickname if present)
      if (nickname) {
        if (heldItem) {
          pokemonExport += `${nickname} (${pokemonName}) @ ${heldItem}\n`;
        } else {
          pokemonExport += `${nickname} (${pokemonName})\n`;
        }
      } else {
        if (heldItem) {
          pokemonExport += `${pokemonName} @ ${heldItem}\n`;
        } else {
          pokemonExport += `${pokemonName}\n`;
        }
      }

      // Ability
      if (ability) {
        pokemonExport += `Ability: ${ability}\n`;
      }

      // Tera Type
      if (teraType) {
        pokemonExport += `Tera Type: ${teraType}\n`;
      }

      // EVs
      if (evStrings.length > 0) {
        pokemonExport += `EVs: ${evStrings.join(' / ')}\n`;
      }

      // Nature
      pokemonExport += `${nature} Nature\n`;

      // Moves
      if (moves.length > 0) {
        moves.forEach((move: any) => {
          const moveName = typeof move === 'string' ? move : move.name;
          pokemonExport += `- ${formatName(moveName)}\n`;
        });
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(pokemonExport.trim());
      toast.success(`${pokemonName} exported to clipboard!`);
      
    } catch (error) {
      console.error('Error exporting Pokemon:', error);
      toast.error('Failed to export Pokemon');
    }
  };

  const exportTeam = async (team: Team, members: TeamMember[]) => {
    if (members.length === 0) {
      // If no members provided, fetch them first
      try {
        const teamMembers = await getTeamMembers(team.id);
        return exportTeam(team, teamMembers);
      } catch (error) {
        toast.error('Failed to load team members for export');
        return;
      }
    }

    try {
      const teamExportData: string[] = [];

      for (const member of members) {
        const pokemon = pokemonDetails[member.pokemon_id];
        if (!pokemon) continue;

        // Try to load build data from localStorage
        const buildKey = `pokemon-build-${member.pokemon_id}`;
        const savedBuild = localStorage.getItem(buildKey);
        
        let build = null;
        if (savedBuild) {
          try {
            build = JSON.parse(savedBuild);
          } catch (e) {
            console.warn(`Failed to parse build for ${pokemon.name}`);
          }
        }

        // Default values if no build saved
        const pokemonName = formatName(pokemon.name);
        const heldItem = build?.heldItem ? formatName(build.heldItem) : '';
        const ability = build?.ability ? formatName(build.ability) : '';
        const nature = build?.nature ? formatName(build.nature) : 'Hardy';
        const moves = build?.moves || [];
        const nickname = build?.nickname || '';
        const teraType = build?.teraType || '';

        // Format EVs (only show non-zero values)
        const evs = build?.evs || {};
        const evStrings: string[] = [];
        if (evs.hp > 0) evStrings.push(`${evs.hp} HP`);
        if (evs.attack > 0) evStrings.push(`${evs.attack} Atk`);
        if (evs.defense > 0) evStrings.push(`${evs.defense} Def`);
        if (evs['special-attack'] > 0) evStrings.push(`${evs['special-attack']} SpA`);
        if (evs['special-defense'] > 0) evStrings.push(`${evs['special-defense']} SpD`);
        if (evs.speed > 0) evStrings.push(`${evs.speed} Spe`);

        // Build the Pokemon export string
        let pokemonExport = '';
        
        // Pokemon name and item (with nickname if present)
        if (nickname) {
          if (heldItem) {
            pokemonExport += `${nickname} (${pokemonName}) @ ${heldItem}\n`;
          } else {
            pokemonExport += `${nickname} (${pokemonName})\n`;
          }
        } else {
          if (heldItem) {
            pokemonExport += `${pokemonName} @ ${heldItem}\n`;
          } else {
            pokemonExport += `${pokemonName}\n`;
          }
        }

        // Ability
        if (ability) {
          pokemonExport += `Ability: ${ability}\n`;
        }

        // Tera Type
        if (teraType) {
          pokemonExport += `Tera Type: ${teraType}\n`;
        }

        // EVs
        if (evStrings.length > 0) {
          pokemonExport += `EVs: ${evStrings.join(' / ')}\n`;
        }

        // Nature
        pokemonExport += `${nature} Nature\n`;

        // Moves
        if (moves.length > 0) {
          moves.forEach((move: any) => {
            const moveName = typeof move === 'string' ? move : move.name;
            pokemonExport += `- ${formatName(moveName)}\n`;
          });
        }

        teamExportData.push(pokemonExport.trim());
      }

      const fullTeamData = `${team.name}\n\n${teamExportData.join('\n\n')}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(fullTeamData);
      toast.success(`Team "${team.name}" copied to clipboard!`);
      
    } catch (error) {
      console.error('Error exporting team:', error);
      toast.error('Failed to export team');
    }
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
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToTeams}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
              >
                ← Back to Teams
              </button>
              <h1 className="text-3xl font-bold text-gray-800">{selectedTeam.name}</h1>
            </div>
            <button
              onClick={() => exportTeam(selectedTeam, teamMembers)}
              className="flex items-center gap-1 md:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base"
              title="Export team to clipboard"
            >
              <Copy size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Export Team</span>
              <span className="sm:hidden">Export</span>
            </button>
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
                      <div className="flex justify-center mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportSinglePokemon(member.pokemon_id);
                          }}
                          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors text-sm"
                          title="Export Pokemon to clipboard"
                        >
                          <Copy size={14} />
                          Export
                        </button>
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
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-300 group relative"
              >
                <div
                  onClick={() => handleTeamSelect(team)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{team.name}</h3>
                    <ChevronRight size={20} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                  
                  {team.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">{team.description}</p>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Settings size={16} />
                    <span>Manage movesets</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportTeam(team, []);
                    }}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors text-sm"
                    title="Export team to clipboard"
                  >
                    <Copy size={14} />
                    Export
                  </button>
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
