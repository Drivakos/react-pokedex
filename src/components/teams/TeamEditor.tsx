import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { TeamMember } from '../../lib/supabase';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Zap,
  Shield,
  Heart,
  Swords,
  Sparkles,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import MovesetEditor from './MovesetEditor';

interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    other?: {
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
  stats: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];
  abilities: {
    ability: {
      name: string;
    };
    is_hidden: boolean;
  }[];
}


const TeamEditor: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { user, getTeamMembers, addPokemonToTeam, removePokemonFromTeam, updateTeamMemberBuild, teams } = auth as any;

  const [team, setTeam] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pokemonData, setPokemonData] = useState<Record<number, Pokemon>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showPokemonSearch, setShowPokemonSearch] = useState(false);
  const [showMovesetEditor, setShowMovesetEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pokemon[]>([]);

  // Load team and members
  useEffect(() => {
    const loadTeamData = async () => {
      if (!teamId || !user) return;

      try {
        // Find team by ID
        const foundTeam = teams.find(t => t.id === parseInt(teamId));
        if (!foundTeam) {
          toast.error('Team not found');
          navigate('/teams');
          return;
        }
        setTeam(foundTeam);

        // Load team members
        const members = await getTeamMembers(parseInt(teamId));
        setTeamMembers(members || []);

        // Load Pokemon data for each member using GraphQL
        const pokemonIds = members?.map(m => m.pokemon_id) || [];
        const uniqueIds = [...new Set(pokemonIds)];

        // Use the GraphQL API for fetching Pokemon data
        for (const pokemonId of uniqueIds) {
          try {
            const query = `
              query GetPokemonBasic($id: Int!) {
                pokemon_v2_pokemon_by_pk(id: $id) {
                  id
                  name
                  types: pokemon_v2_pokemontypes {
                    type: pokemon_v2_type {
                      name
                    }
                  }
                  stats: pokemon_v2_pokemonstats {
                    base_stat
                    pokemon_v2_stat {
                      name
                    }
                  }
                  abilities: pokemon_v2_pokemonabilities {
                    ability: pokemon_v2_ability {
                      name
                    }
                    is_hidden
                  }
                  sprites: pokemon_v2_pokemonsprites(limit: 1) {
                    sprites
                  }
                }
              }
            `;

            const response = await fetch(import.meta.env.VITE_API_GRAPHQL_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, variables: { id: pokemonId } }),
            });

            if (response.ok) {
              const result = await response.json();

              if (result.data?.pokemon_v2_pokemon_by_pk) {
                const pokemon = result.data.pokemon_v2_pokemon_by_pk;

                // Transform GraphQL data to match expected format
                let sprites = {};
                try {
                  // Handle different possible sprite data formats
                  if (pokemon.sprites?.[0]?.sprites) {
                    const spriteData = pokemon.sprites[0].sprites;
                    // Check if it's already an object or needs parsing
                    if (typeof spriteData === 'string') {
                      sprites = JSON.parse(spriteData);
                    } else if (typeof spriteData === 'object') {
                      sprites = spriteData;
                    }
                  } else {
                    // Fallback to basic sprite URLs if GraphQL sprites not available
                    sprites = {
                      front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
                      back_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pokemonId}.png`,
                      front_shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`,
                      back_shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/shiny/${pokemonId}.png`
                    };
                  }
                } catch (e) {
                  console.warn('Failed to parse sprite data:', e);
                  // Provide fallback sprites
                  sprites = {
                    front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
                    back_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pokemonId}.png`,
                    front_shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`,
                    back_shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/shiny/${pokemonId}.png`
                  };
                }

                const transformedPokemon = {
                  id: pokemon.id,
                  name: pokemon.name,
                  sprites: sprites,
                  types: pokemon.types?.map((t: any) => ({
                    type: { name: t.type.name }
                  })) || [],
                  stats: pokemon.stats?.map((s: any) => ({
                    base_stat: s.base_stat,
                    stat: { name: s.pokemon_v2_stat.name }
                  })) || [],
                  abilities: pokemon.abilities?.map((a: any) => ({
                    ability: { name: a.ability.name },
                    is_hidden: a.is_hidden
                  })) || []
                };

                setPokemonData(prev => ({ ...prev, [pokemonId]: transformedPokemon }));
              }
            }
          } catch (error) {
            console.error(`Failed to load Pokemon ${pokemonId}:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to load team data:', error);
        toast.error('Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [teamId, user, teams, getTeamMembers, navigate]);

  // Search Pokemon using GraphQL
  const searchPokemon = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const searchQuery = `
        query SearchPokemon($searchTerm: String!) {
          pokemon_v2_pokemon(
            where: {
              name: { _ilike: $searchTerm }
              pokemon_v2_pokemonforms: { is_default: { _eq: true } }
            }
            limit: 10
            order_by: { id: asc }
          ) {
            id
            name
            pokemon_v2_pokemonsprites {
              data: sprites
            }
          }
        }
      `;

      const response = await fetch(import.meta.env.VITE_API_GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          variables: { searchTerm: `%${query.toLowerCase()}%` }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.pokemon_v2_pokemon) {
          // Transform GraphQL results to match expected format
          const transformedResults = result.data.pokemon_v2_pokemon.map((p: any) => ({
            id: p.id,
            name: p.name,
            url: `https://pokeapi.co/api/v2/pokemon/${p.id}/` // Mock URL for compatibility
          }));
          setSearchResults(transformedResults);
        }
      }
    } catch (error) {
      console.error('Failed to search Pokemon:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => searchPokemon(searchQuery), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleAddPokemon = async (pokemon: any) => {
    if (!teamId) return;

    // Find next available position
    const positions = teamMembers.map(m => m.position).sort((a, b) => a - b);
    let nextPosition = 1;
    for (const pos of positions) {
      if (nextPosition === pos) nextPosition++;
      else break;
    }

    if (nextPosition > 6) {
      toast.error('Team is full (6 Pokémon maximum)');
      return;
    }

    try {
      await addPokemonToTeam(parseInt(teamId), pokemon.id || pokemon.url.split('/').slice(-2)[0], nextPosition);
      toast.success(`${pokemon.name} added to team!`);

      // Refresh team data
      const members = await getTeamMembers(parseInt(teamId));
      setTeamMembers(members || []);

      setShowPokemonSearch(false);
      setSearchQuery('');
    } catch (error) {
      toast.error('Failed to add Pokemon to team');
    }
  };

  const handleRemovePokemon = async (position: number) => {
    if (!teamId) return;

    try {
      await removePokemonFromTeam(parseInt(teamId), position);
      toast.success('Pokemon removed from team!');

      // Refresh team data
      const members = await getTeamMembers(parseInt(teamId));
      setTeamMembers(members || []);
    } catch (error) {
      toast.error('Failed to remove Pokemon from team');
    }
  };

  const handleEditPokemon = (member: TeamMember) => {
    setSelectedMember(member);
    setShowMovesetEditor(true);
  };

  const handleSaveBuild = async (buildData: any) => {
    if (!teamId || !selectedMember) return;

    try {
      // Map the PokemonBuild data to TeamMember format for database
      const teamMemberData = {
        moves: buildData.moves || [],
        item: buildData.heldItem || '',
        ability: buildData.ability || '',
        nature: buildData.nature || 'hardy',
        evs: buildData.evs || {
          hp: 0,
          attack: 0,
          defense: 0,
          'special-attack': 0,
          'special-defense': 0,
          speed: 0
        },
        ivs: buildData.ivs || {
          hp: 31,
          attack: 31,
          defense: 31,
          'special-attack': 31,
          'special-defense': 31,
          speed: 31
        },
        level: selectedMember.level || 50,
        gender: buildData.gender || selectedMember.gender || 'male',
        tera_type: buildData.teraType || selectedMember.tera_type || 'normal'
      };

      await updateTeamMemberBuild(parseInt(teamId), selectedMember.position, teamMemberData);

      // Refresh team data
      const members = await getTeamMembers(parseInt(teamId));
      setTeamMembers(members || []);

      setShowMovesetEditor(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Failed to save build:', error);
      toast.error('Failed to save build');
    }
  };

  const handleCloseMovesetEditor = () => {
    setShowMovesetEditor(false);
    setSelectedMember(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading team editor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Team Editor</h1>
          <p className="text-gray-600">Please sign in to edit teams.</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Team Not Found</h1>
          <p className="text-gray-600 mb-4">The requested team could not be found.</p>
          <button
            onClick={() => navigate('/teams')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teams')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <ArrowLeft size={20} />
              Back to Teams
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{team.name}</h1>
              {team.description && (
                <p className="text-gray-600 mt-1">{team.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {teamMembers.length} / 6 Pokémon
            </div>
            <button
              onClick={() => setShowPokemonSearch(true)}
              disabled={teamMembers.length >= 6}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={16} />
              Add Pokemon
            </button>
          </div>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6].map((position) => {
            const member = teamMembers.find(m => m.position === position);
            const pokemon = member ? pokemonData[member.pokemon_id] : null;

            return (
              <div
                key={position}
                className={`bg-white rounded-lg p-6 shadow-md border-2 ${
                  member ? 'border-gray-200' : 'border-dashed border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Position {position}</h3>
                  {member && (
                    <button
                      onClick={() => handleRemovePokemon(position)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {member && pokemon ? (
                  <div className="text-center">
                    <img
                      src={pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default}
                      alt={pokemon.name}
                      className="w-20 h-20 mx-auto mb-3"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = pokemon.sprites?.front_default || '';
                      }}
                    />
                    <h4 className="font-semibold text-gray-800 capitalize mb-2">{pokemon.name}</h4>

                    {/* Types */}
                    <div className="flex justify-center gap-1 mb-3">
                      {pokemon.types.map((type, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{
                            backgroundColor: `var(--type-${type.type.name})`,
                            color: ['electric', 'ice', 'fairy', 'grass'].includes(type.type.name) ? '#000' : '#fff'
                          }}
                        >
                          {type.type.name}
                        </span>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPokemon(member)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded text-sm">
                        Details
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">Empty slot</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pokemon Search Modal */}
        {showPokemonSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Add Pokemon to Team</h2>
                <button
                  onClick={() => {
                    setShowPokemonSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Pokemon..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map((pokemon) => (
                      <button
                        key={pokemon.name}
                        onClick={() => handleAddPokemon(pokemon)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-md border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                      >
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                          alt={pokemon.name}
                          className="w-8 h-8"
                        />
                        <span className="capitalize font-medium">{pokemon.name}</span>
                      </button>
                    ))
                  ) : searchQuery.length >= 2 ? (
                    <p className="text-gray-500 text-center py-4">No Pokemon found</p>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Start typing to search...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Moveset Editor */}
        {showMovesetEditor && selectedMember && (
          <MovesetEditor
            pokemon={{
              id: selectedMember.pokemon_id,
              name: pokemonData[selectedMember.pokemon_id]?.name || 'Unknown',
              sprites: pokemonData[selectedMember.pokemon_id]?.sprites || { other: { 'official-artwork': { front_default: '' } } },
              types: pokemonData[selectedMember.pokemon_id]?.types || [],
              moves: selectedMember.moves || []
            }}
            teamId={parseInt(teamId!)}
            onBack={handleCloseMovesetEditor}
            initialBuild={{
              moves: selectedMember.moves || [],
              nature: selectedMember.nature || 'hardy',
              ability: selectedMember.ability || '',
              gender: selectedMember.gender || null,
              heldItem: selectedMember.item || '',
              nickname: '',
              teraType: selectedMember.tera_type || '',
              ivs: selectedMember.ivs || {
                hp: 31,
                attack: 31,
                defense: 31,
                'special-attack': 31,
                'special-defense': 31,
                speed: 31
              },
              evs: selectedMember.evs || {
                hp: 0,
                attack: 0,
                defense: 0,
                'special-attack': 0,
                'special-defense': 0,
                speed: 0
              }
            }}
            onSave={handleSaveBuild}
          />
        )}
      </div>
    </div>
  );
};

export default TeamEditor;
