import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Heart, Shield, Zap, Swords, Award, Dumbbell } from 'lucide-react';
import { usePokemon } from '../hooks/usePokemon';
import { PokemonDetails } from '../types/pokemon';
import { TYPE_COLORS } from '../types/pokemon';

// No need for hardcoded mapping anymore as we get species_id from the API

const PokemonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getPokemonDetails } = usePokemon();
  const [pokemonDetails, setPokemonDetails] = useState<PokemonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'moves' | 'evolution'>('stats');
  const [selectedMoveCategory, setSelectedMoveCategory] = useState<'all' | 'level-up' | 'machine' | 'egg'>('all');
  const [error, setError] = useState<string | null>(null);
  
  // Helper function to get Pokémon ID from evolution data
  const getPokemonIdFromEvolution = (evo: any): number => {
    return evo.species_id;
  };

  useEffect(() => {
    const fetchPokemonData = async () => {
      if (id) {
        setLoading(true);
        setError(null);
        try {
          const detailedData = await getPokemonDetails(parseInt(id, 10));
          setPokemonDetails(detailedData);
        } catch (err) {
          console.error('Error fetching Pokemon details:', err);
          setError('Failed to load Pokémon data. Please try again later.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPokemonData();
  }, [id, getPokemonDetails]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading Pokémon data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link to="/" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
            Back to Pokédex
          </Link>
        </div>
      </div>
    );
  }

  if (!pokemonDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Pokémon Not Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find the Pokémon you're looking for.</p>
          <Link to="/" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
            Back to Pokédex
          </Link>
        </div>
      </div>
    );
  }

  // Format Pokemon ID with leading zeros
  const formattedId = String(pokemonDetails.id).padStart(3, '0');

  // Filter moves by category
  const filterMovesByCategory = () => {
    if (selectedMoveCategory === 'all') {
      return pokemonDetails.moves;
    }
    
    return pokemonDetails.moves.filter(move => {
      switch (selectedMoveCategory) {
        case 'level-up':
          return move.learn_method === 'level-up';
        case 'machine':
          return move.learn_method === 'machine';
        case 'egg':
          return move.learn_method === 'egg';
        default:
          return true;
      }
    });
  };

  const filteredMoves = filterMovesByCategory();
  
  // Format move name for display
  const formatMoveName = (name: string) => {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-600 text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-white hover:text-gray-200 transition-colors">
              <ArrowLeft size={20} className="mr-2" />
              <span className="font-medium">Back to Pokédex</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Pokemon Info Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Pokemon Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="flex-shrink-0 flex justify-center mb-4 md:mb-0 md:mr-8">
                <img
                  src={pokemonDetails.sprites.official_artwork || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonDetails.id}.png`}
                  alt={pokemonDetails.name}
                  className="w-48 h-48 object-contain"
                />
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <span className="text-sm font-semibold bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    #{formattedId}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold capitalize mb-2">
                  {pokemonDetails.name}
                </h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {pokemonDetails.types.map((type) => (
                    <span
                      key={type}
                      className={`${TYPE_COLORS[type]} text-white px-3 py-1 rounded-full text-sm capitalize`}
                    >
                      {type}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-white text-opacity-80">Height</p>
                    <p className="font-semibold">{(pokemonDetails.height / 10).toFixed(1)}m</p>
                  </div>
                  <div>
                    <p className="text-sm text-white text-opacity-80">Weight</p>
                    <p className="font-semibold">{(pokemonDetails.weight / 10).toFixed(1)}kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-white text-opacity-80">Generation</p>
                    <p className="font-semibold capitalize">{pokemonDetails.generation.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white text-opacity-80">Base Exp</p>
                    <p className="font-semibold">{pokemonDetails.base_experience}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="border-b">
            <div className="flex">
              <button
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'stats'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('stats')}
              >
                Stats & Info
              </button>
              <button
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'moves'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('moves')}
              >
                Moves
              </button>
              <button
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'evolution'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('evolution')}
              >
                Evolution
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Base Stats</h2>
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div>
                    <div className="flex items-center mb-1">
                      <Heart size={18} className="text-red-500 mr-2" />
                      <span className="text-gray-700 font-medium w-32">HP</span>
                      <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.hp}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-red-500 h-2.5 rounded-full"
                        style={{ width: `${(pokemonDetails.stats.hp / 150) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center mb-1">
                      <Swords size={18} className="text-orange-500 mr-2" />
                      <span className="text-gray-700 font-medium w-32">Attack</span>
                      <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.attack}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-orange-500 h-2.5 rounded-full"
                        style={{ width: `${(pokemonDetails.stats.attack / 150) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center mb-1">
                      <Shield size={18} className="text-blue-500 mr-2" />
                      <span className="text-gray-700 font-medium w-32">Defense</span>
                      <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.defense}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-500 h-2.5 rounded-full"
                        style={{ width: `${(pokemonDetails.stats.defense / 150) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center mb-1">
                      <Zap size={18} className="text-purple-500 mr-2" />
                      <span className="text-gray-700 font-medium w-32">Special Attack</span>
                      <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.special_attack}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-purple-500 h-2.5 rounded-full"
                        style={{ width: `${(pokemonDetails.stats.special_attack / 150) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center mb-1">
                      <Award size={18} className="text-green-500 mr-2" />
                      <span className="text-gray-700 font-medium w-32">Special Defense</span>
                      <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.special_defense}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-green-500 h-2.5 rounded-full"
                        style={{ width: `${(pokemonDetails.stats.special_defense / 150) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center mb-1">
                      <Dumbbell size={18} className="text-yellow-500 mr-2" />
                      <span className="text-gray-700 font-medium w-32">Speed</span>
                      <span className="text-gray-900 font-semibold ml-auto">{pokemonDetails.stats.speed}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-yellow-500 h-2.5 rounded-full"
                        style={{ width: `${(pokemonDetails.stats.speed / 150) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex flex-col gap-4 mb-6">
                    <h3 className="w-full text-xl font-bold mb-2">Abilities</h3>
                    {pokemonDetails.abilities.map((ability, index) => (
                      <div 
                        key={`ability-${index}`}
                        className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center mb-2">
                          <span className="font-medium capitalize text-lg">{ability.name}</span>
                          {ability.is_hidden && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                              Hidden
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700">{ability.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-12">
                  <h2 className="text-2xl font-bold mb-6">Pokédex Entry</h2>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <p className="text-gray-700 leading-relaxed">
                      {pokemonDetails.flavor_text || `${pokemonDetails.name.charAt(0).toUpperCase() + pokemonDetails.name.slice(1)} is a ${pokemonDetails.types.join('/')} type Pokémon introduced in ${pokemonDetails.generation.split('-')[1].toUpperCase()}. 
                      It stands at ${(pokemonDetails.height / 10).toFixed(1)}m tall and weighs ${(pokemonDetails.weight / 10).toFixed(1)}kg.
                      ${pokemonDetails.has_evolutions ? 
                        " This Pokémon is known to evolve under certain conditions." : 
                        " This Pokémon does not evolve."}`}
                    </p>
                    {pokemonDetails.genera && (
                      <p className="mt-4 text-gray-600 italic">
                        {pokemonDetails.genera}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Moves Tab */}
            {activeTab === 'moves' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Moves</h2>
                
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedMoveCategory('all')}
                      className={`px-4 py-2 rounded-lg ${
                        selectedMoveCategory === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All Moves
                    </button>
                    <button
                      onClick={() => setSelectedMoveCategory('level-up')}
                      className={`px-4 py-2 rounded-lg ${
                        selectedMoveCategory === 'level-up'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Level Up
                    </button>
                    <button
                      onClick={() => setSelectedMoveCategory('machine')}
                      className={`px-4 py-2 rounded-lg ${
                        selectedMoveCategory === 'machine'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      TM/HM
                    </button>
                    <button
                      onClick={() => setSelectedMoveCategory('egg')}
                      className={`px-4 py-2 rounded-lg ${
                        selectedMoveCategory === 'egg'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Egg Moves
                    </button>
                  </div>
                </div>
                
                {filteredMoves.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredMoves.map((move, index) => (
                      <div 
                        key={`move-${index}`}
                        className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium capitalize">{formatMoveName(move.name)}</span>
                          {move.learned_at_level > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Lv. {move.learned_at_level}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 capitalize">
                          {move.learn_method.replace('-', ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
                    <p className="text-gray-600">No moves found in this category.</p>
                  </div>
                )}
              </div>
            )}

            {/* Evolution Tab */}
            {activeTab === 'evolution' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Evolution Chain</h2>
                
                {pokemonDetails.has_evolutions ? (
                  <div>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 flex-wrap">
                      {pokemonDetails.evolution_chain.map((evo, index) => {
                        // Skip rendering if it's not the first and there's no evolution trigger
                        if (index > 0 && !evo.trigger_name && !evo.min_level) return null;
                        
                        return (
                          <div key={`evo-${index}`} className="flex flex-col items-center">
                            {/* Add placeholder for first evolution to maintain consistent height */}
                            {index === 0 ? (
                              <div className="text-center mb-4 text-gray-600 text-sm h-5">
                                <span>&nbsp;</span>
                              </div>
                            ) : (
                              <div className="text-center mb-4 text-gray-600 text-sm h-5">
                                {evo.trigger_name === 'level-up' && evo.min_level && (
                                  <span>Level {evo.min_level}</span>
                                )}
                                {evo.trigger_name === 'use-item' && evo.item && (
                                  <span>Use {evo.item.replace('-', ' ')}</span>
                                )}
                                {evo.trigger_name && !evo.min_level && !evo.item && (
                                  <span>{evo.trigger_name.replace('-', ' ')}</span>
                                )}
                                {!evo.trigger_name && (
                                  <span>Evolution</span>
                                )}
                              </div>
                            )}
                            <div className={`w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-2 ${evo.species_name === pokemonDetails.name ? 'ring-2 ring-blue-500' : ''}`}>
                              <Link 
                                to={`/pokemon/${getPokemonIdFromEvolution(evo)}`}
                                className="cursor-pointer transition-transform hover:scale-110"
                                title={`View ${evo.species_name} details`}
                              >
                                <img
                                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${getPokemonIdFromEvolution(evo)}.png`}
                                  alt={evo.species_name}
                                  className="w-24 h-24 object-contain"
                                  onError={(e) => {
                                    // Fallback if image doesn't load
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getPokemonIdFromEvolution(evo)}.png`;
                                  }}
                                />
                              </Link>
                            </div>
                            <p className="font-medium capitalize">{evo.species_name}</p>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">
                        Note: Evolution data is approximated. For exact evolution methods, please refer to official Pokémon resources.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center max-w-md">
                      <p className="text-gray-700">
                        This Pokémon does not evolve.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokemonPage;
