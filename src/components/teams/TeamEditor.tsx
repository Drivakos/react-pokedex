import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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

interface TeamMember {
  id: number;
  team_id: number;
  pokemon_id: number;
  position: number;
  moves: string[];
  item: string;
  ability: string;
  nature: string;
  evs: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
  ivs: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
  level: number;
  gender: 'male' | 'female' | 'genderless';
  tera_type: string;
}

const TeamEditor: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user, getTeamMembers, addPokemonToTeam, removePokemonFromTeam, teams } = useAuth();

  const [team, setTeam] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pokemonData, setPokemonData] = useState<Record<number, Pokemon>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showPokemonSearch, setShowPokemonSearch] = useState(false);
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

        // Load Pokemon data for each member
        const pokemonIds = members?.map(m => m.pokemon_id) || [];
        const uniqueIds = [...new Set(pokemonIds)];

        for (const pokemonId of uniqueIds) {
          try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            if (response.ok) {
              const pokemon = await response.json();
              setPokemonData(prev => ({ ...prev, [pokemonId]: pokemon }));
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

  // Search Pokemon
  const searchPokemon = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=20&offset=0`);
      if (response.ok) {
        const data = await response.json();
        const filtered = data.results.filter((p: any) =>
          p.name.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered.slice(0, 10));
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
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.url.split('/').slice(-2)[0]}.png`}
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

        {/* Pokemon Edit Modal */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Edit Pokemon</h2>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-96">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Sparkles size={16} />
                      Basic Info
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          defaultValue={selectedMember.level || 50}
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select
                          defaultValue={selectedMember.gender || 'male'}
                          className="w-full p-2 border border-gray-300 rounded"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="genderless">Genderless</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tera Type</label>
                        <select
                          defaultValue={selectedMember.tera_type || 'normal'}
                          className="w-full p-2 border border-gray-300 rounded"
                        >
                          <option value="normal">Normal</option>
                          <option value="fire">Fire</option>
                          <option value="water">Water</option>
                          <option value="electric">Electric</option>
                          <option value="grass">Grass</option>
                          <option value="ice">Ice</option>
                          <option value="fighting">Fighting</option>
                          <option value="poison">Poison</option>
                          <option value="ground">Ground</option>
                          <option value="flying">Flying</option>
                          <option value="psychic">Psychic</option>
                          <option value="bug">Bug</option>
                          <option value="rock">Rock</option>
                          <option value="ghost">Ghost</option>
                          <option value="dragon">Dragon</option>
                          <option value="dark">Dark</option>
                          <option value="steel">Steel</option>
                          <option value="fairy">Fairy</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Moves */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Zap size={16} />
                      Moves (4 max)
                    </h3>
                    <div className="space-y-2">
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Move {index + 1}
                          </label>
                          <input
                            type="text"
                            defaultValue={selectedMember.moves?.[index] || ''}
                            placeholder="Enter move name..."
                            className="w-full p-2 border border-gray-300 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded font-medium"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded font-medium">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamEditor;
