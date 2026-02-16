import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Heart, Shield, Zap, Swords, Award, Dumbbell } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { usePokemon } from '../hooks/usePokemon';
import { PokemonDetails } from '../types/pokemon';
import { TYPE_COLORS, TYPE_BACKGROUNDS } from '../types/pokemon';
import PokemonCards from './PokemonCards';
import Footer from './Footer';
import PokemonSeoContent from './PokemonSeoContent';
import RelatedPokemon from './RelatedPokemon';
import FavoritePokemon from './FavoritePokemon';
import PokemonImage from './PokemonImage';

// No need for hardcoded mapping anymore as we get species_id from the API

const PokemonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getPokemonDetails } = usePokemon();
  const [pokemonDetails, setPokemonDetails] = useState<PokemonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'moves' | 'evolution'>('stats');
  const [selectedMoveCategory, setSelectedMoveCategory] = useState<'all' | 'level-up' | 'machine' | 'egg' | 'tutor'>('all');
  const [error, setError] = useState<string | null>(null);
  


  useEffect(() => {
    const fetchPokemonData = async () => {
      if (id) {
        setLoading(true);
        setError(null);
        try {
          const detailedData = await getPokemonDetails(parseInt(id, 10));
          setPokemonDetails(detailedData);
        } catch (err) {
          console.error('Error fetching Pokémon details:', err);
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

  // Format Pokémon ID with leading zeros
  const formattedId = String(pokemonDetails.id).padStart(3, '0');
  
  // Determine the primary type for background styling
  const getPrimaryType = () => {
    if (!pokemonDetails || !pokemonDetails.types || pokemonDetails.types.length === 0) {
      return 'normal'; // Default fallback
    }
    
    // Some types are more visually distinctive, so we prioritize them
    const priorityTypes = ['dragon', 'fire', 'water', 'electric', 'grass', 'ice', 'ghost', 'psychic'];
    
    // Check if the Pokémon has any of the priority types
    for (const priorityType of priorityTypes) {
      if (pokemonDetails.types.includes(priorityType)) {
        return priorityType;
      }
    }
    
    // Otherwise, use the first type
    return pokemonDetails.types[0];
  };
  
  const primaryType = getPrimaryType();
  const backgroundStyle = TYPE_BACKGROUNDS[primaryType] || TYPE_BACKGROUNDS.normal;

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
        case 'tutor':
          return move.learn_method === 'tutor';
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
      <Helmet>
        <title>{`${pokemonDetails.name} | Pokémon #${formattedId} | Complete Pokédex Guide`}</title>
        <meta name="description" content={`Complete guide to ${pokemonDetails.name}, a ${pokemonDetails.types.join('/')} type Pokémon. Learn about its biology, habitat, training tips, evolution methods, competitive strategies, and more.`} />
        <meta name="keywords" content={`${pokemonDetails.name}, Pokémon ${formattedId}, ${pokemonDetails.types.join(', ')} type, Pokédex, Pokémon guide, Pokémon evolution, Pokémon stats, ${pokemonDetails.name} moves, ${pokemonDetails.name} abilities`} />
        <link rel="canonical" href={`${window.location.origin}/pokemon/${pokemonDetails.id}`} />
        <meta property="article:published_time" content="2025-04-01T00:00:00Z" />
        <meta property="article:modified_time" content="2025-04-07T00:00:00Z" />
        <meta property="og:title" content={`${pokemonDetails.name} | Pokémon #${formattedId} | Complete Pokédex Guide`} />
        <meta property="og:description" content={`Complete guide to ${pokemonDetails.name}, a ${pokemonDetails.types.join('/')} type Pokémon.`} />
        <meta property="og:url" content={`${window.location.origin}/pokemon/${pokemonDetails.id}`} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={`/images/pokemon/thumbnails/${String(pokemonDetails.id).padStart(3, '0')}.png`} />
        <meta property="og:site_name" content="Pokédex" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@pokedex" />
        <meta name="twitter:title" content={`${pokemonDetails.name.charAt(0).toUpperCase() + pokemonDetails.name.slice(1)} (#${formattedId}) | Pokédex`} />
        <meta name="twitter:description" content={`${pokemonDetails.name.charAt(0).toUpperCase() + pokemonDetails.name.slice(1)} is a ${pokemonDetails.types.join('/')} type Pokémon. Learn about its stats, abilities, evolutions, and more.`} />
        <meta name="twitter:image" content={`/images/pokemon/thumbnails/${String(pokemonDetails.id).padStart(3, '0')}.png`} />
        <script type="application/ld+json">
          {(() => {
            // Format the Pokémon name once to reuse it
            const formattedName = pokemonDetails.name.charAt(0).toUpperCase() + pokemonDetails.name.slice(1);
            
            // Create the description with fallback
            const description = pokemonDetails.flavor_text || 
              `A ${pokemonDetails.types.join('/')} type Pokémon with a base experience of ${pokemonDetails.base_experience}.`;
            
            // Image URL
            const imageUrl = `/images/pokemon/thumbnails/${String(pokemonDetails.id).padStart(3, '0')}.png`;
            
            // Base URL for this Pokémon
            const pokemonUrl = `${window.location.origin}/pokemon/${pokemonDetails.id}`;
            
            // Create the structured data object
            const structuredData = {
              "@context": "https://schema.org",
              "@type": "VideoGame",
              "name": "Pokémon",
              "datePublished": "2025-04-01T00:00:00Z",
              "dateModified": "2025-04-07T00:00:00Z",
              "character": {
                "@type": "Character",
                "name": formattedName,
                "image": imageUrl,
                "description": description,
                "identifier": `#${formattedId}`,
                "subjectOf": [
                  {
                    "@type": "CreativeWork",
                    "name": `${formattedName} Trading Card Game Cards`,
                    "description": `Collection of official Pokémon Trading Card Game cards featuring ${formattedName}`,
                    "url": `${pokemonUrl}#cards`
                  }
                ]
              },
              "applicationCategory": "Game",
              "genre": "Role-playing game",
              "gamePlatform": ["Nintendo Switch", "Nintendo 3DS", "Game Boy"],
              "url": pokemonUrl,
              "associatedMedia": {
                "@type": "CollectionPage",
                "name": `${formattedName} Trading Cards`,
                "description": `Official Pokémon Trading Card Game cards featuring ${formattedName}`,
                "url": `${pokemonUrl}#cards`
              }
            };
            
            
            // Return the stringified data
            return JSON.stringify(structuredData);
          })()}
        </script>
      </Helmet>
      {/* Header */}
      <header className="bg-red-600 text-white py-4">
        <div className="container mx-auto px-4">
            <div className="flex items-center space-x-4 mb-4">
              <Link to="/" className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-100 transition-colors">
                <ArrowLeft className="h-6 w-6 text-gray-700" />
              </Link>
              <h1 className="text-3xl font-bold text-white capitalize">{pokemonDetails.name}</h1>
              <span className="text-xl font-semibold text-white opacity-80">#{formattedId}</span>
              <div className="ml-auto">
                <FavoritePokemon pokemonId={pokemonDetails.id} />
              </div>
            </div>
        </div>
      </header>

      {/* Pokémon Info Section */}
      {/* Pokemon Info Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Pokemon Header with Type-based Background */}
          <div className={`bg-gradient-to-r ${backgroundStyle.gradient} text-white p-6 relative overflow-hidden`}>
            {/* Background Pattern Overlay */}
            {backgroundStyle.pattern && (
              <div className={`absolute inset-0 ${backgroundStyle.pattern}`}></div>
            )}
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="flex-shrink-0 flex justify-center mb-4 md:mb-0 md:mr-8">
                <PokemonImage
                  pokemonId={pokemonDetails.id}
                  alt={pokemonDetails.name}
                  title={`${pokemonDetails.name.charAt(0).toUpperCase() + pokemonDetails.name.slice(1)} - #${formattedId} - ${pokemonDetails.types.join('/')} Type Pokémon`}
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
                    <p className="font-semibold capitalize">{pokemonDetails.generation?.replace('-', ' ') || 'Unknown'}</p>
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
                
                {/* Trading Cards section moved to bottom */}
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
                      Egg
                    </button>
                    <button
                      onClick={() => setSelectedMoveCategory('tutor')}
                      className={`px-4 py-2 rounded-lg ${
                        selectedMoveCategory === 'tutor'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Tutor
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
                          {move.learn_method?.replace('-', ' ') || 'Unknown'}
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
                    {/* Visual Evolution Tree */}
                    <div className="relative py-8 px-4 overflow-x-auto">
                      <div className="min-w-max">
                        {/* Process evolution data */}
                        {(() => {
                          // Organize evolutions into a tree structure using evolves_from_id
                          // Find the base form (the one that doesn't evolve from anything in this chain)
                          const baseForm = pokemonDetails.evolution_chain.find(evo => !evo.evolves_from_id) || pokemonDetails.evolution_chain[0];
                          if (!baseForm) return null;
                          
                          // Helper to get all species that evolve from a given species
                          const getChildren = (speciesId: number) => 
                            pokemonDetails.evolution_chain.filter(evo => evo.evolves_from_id === speciesId);
                            
                          // Get all direct evolutions from base form
                          const directEvolutions = getChildren(baseForm.species_id);
                          
                          // Build the tree (supporting up to 3 stages which is the Pokémon limit)
                          const evolutionTree = {
                            base: baseForm,
                            branches: directEvolutions.map(directEvo => ({
                              evolution: directEvo,
                              furtherEvolutions: getChildren(directEvo.species_id)
                            }))
                          };
                          
                          // Check if this is a branching evolution (multiple stage 1 evolutions)
                          const hasBranchingEvolution = evolutionTree.branches.length > 1;
                          
                          return (
                            <div className="flex flex-col items-center">
                              {/* Base Form */}
                              <div className="flex flex-col items-center">
                                <div className={`w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-2 ${baseForm.species_id === pokemonDetails.id ? 'ring-2 ring-blue-500' : ''}`}>
                                  <Link 
                                    to={`/pokemon/${baseForm.species_id}`}
                                    className="cursor-pointer transition-transform hover:scale-110"
                                    title={`View ${baseForm.species_name} details`}
                                  >
                                    <PokemonImage
                                      pokemonId={baseForm.species_id}
                                      alt={baseForm.species_name}
                                      title={`${baseForm.species_name.charAt(0).toUpperCase() + baseForm.species_name.slice(1)} - #${String(baseForm.species_id).padStart(3, '0')} - Base Form`}
                                      className="w-24 h-24 object-contain"
                                    />
                                  </Link>
                                </div>
                                <div className="text-center">
                                  <p className="font-medium capitalize">{baseForm.species_name}</p>
                                  {/* Show final evolution badge if there are no evolutions */}
                                  {evolutionTree.branches.length === 0 && (
                                    <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                                      Final Evolution
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Evolution Tree */}
                              {evolutionTree.branches.length > 0 && (
                                <div className="mt-6 relative w-full">
                                  {/* Vertical line from base to branches */}
                                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-gray-300 z-10"></div>
                                  
                                  {/* Horizontal line for branches */}
                                  {hasBranchingEvolution && (
                                    <div className="absolute top-12 left-0 right-0 h-0.5 bg-gray-300 z-10 mx-auto" 
                                         style={{ width: `${Math.min(100, (evolutionTree.branches.length - 1) * 33)}%` }}>
                                    </div>
                                  )}
                                  
                                  {/* Branches */}
                                  <div className="flex justify-center mt-12 relative w-full gap-4">
                                    {evolutionTree.branches.map((branch, branchIndex) => (
                                      <div key={`branch-${branchIndex}`} className="flex flex-col items-center relative min-w-[150px]">
                                        {/* Vertical line from horizontal branch to evolution */}
                                        {hasBranchingEvolution && (
                                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-gray-300 z-10"></div>
                                        )}
                                        
                                        {/* Evolution Method */}
                                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs mb-4 mt-12 whitespace-nowrap">
                                          {branch.evolution.trigger_name === 'level-up' && branch.evolution.min_level && (
                                            <span>Level {branch.evolution.min_level}</span>
                                          )}
                                          {branch.evolution.trigger_name === 'use-item' && branch.evolution.item && (
                                            <span>Use {branch.evolution.item?.replace('-', ' ') || 'item'}</span>
                                          )}
                                          {branch.evolution.trigger_name === 'trade' && (
                                            <span>Trade</span>
                                          )}
                                          {branch.evolution.trigger_name && !branch.evolution.min_level && !branch.evolution.item && branch.evolution.trigger_name !== 'trade' && (
                                            <span>{branch.evolution.trigger_name?.replace('-', ' ') || 'Unknown'}</span>
                                          )}
                                          {!branch.evolution.trigger_name && (
                                            <span>Evolution</span>
                                          )}
                                        </div>
                                        
                                        {/* Evolution Pokemon */}
                                        <div className={`w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-2 ${branch.evolution.species_id === pokemonDetails.id ? 'ring-2 ring-blue-500' : ''}`}>
                                          <Link 
                                            to={`/pokemon/${branch.evolution.species_id}`}
                                            className="cursor-pointer transition-transform hover:scale-110"
                                            title={`View ${branch.evolution.species_name} details`}
                                          >
                                            <PokemonImage
                                              pokemonId={branch.evolution.species_id}
                                              alt={branch.evolution.species_name}
                                              title={`${branch.evolution.species_name.charAt(0).toUpperCase() + branch.evolution.species_name.slice(1)} - #${String(branch.evolution.species_id).padStart(3, '0')} - Evolution`}
                                              className="w-24 h-24 object-contain"
                                            />
                                          </Link>
                                        </div>
                                        <div className="text-center">
                                          <p className="font-medium capitalize">{branch.evolution.species_name}</p>
                                          {/* Show final evolution badge if there are no further evolutions */}
                                          {branch.furtherEvolutions.length === 0 && (
                                            <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                                              Final Evolution
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* Further Evolutions */}
                                        {branch.furtherEvolutions.length > 0 && (
                                          <div className="mt-6 relative w-full">
                                            {/* Vertical line to further evolutions */}
                                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-gray-300 z-10"></div>
                                            
                                            {/* Horizontal line connecting all further evolutions */}
                                            {branch.furtherEvolutions.length > 1 && (
                                              <div className="absolute top-12 left-0 right-0 h-0.5 bg-gray-300 z-10 mx-auto"
                                                   style={{ width: `${Math.min(100, (branch.furtherEvolutions.length - 1) * 50)}%` }}>
                                              </div>
                                            )}
                                            
                                            {/* Further evolution branches */}
                                            <div className="flex justify-center mt-12 relative w-full gap-4">
                                              {branch.furtherEvolutions.map((furtherEvo, furtherIndex) => (
                                                <div key={`further-${branchIndex}-${furtherIndex}`} className="flex flex-col items-center relative min-w-[120px]">
                                                  {/* Vertical line from horizontal branch to further evolution */}
                                                  {branch.furtherEvolutions.length > 1 && (
                                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-gray-300 z-10"></div>
                                                  )}
                                                  
                                                  {/* Evolution Method */}
                                                  <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs mb-4 mt-12 whitespace-nowrap">
                                                    {furtherEvo.trigger_name === 'level-up' && furtherEvo.min_level && (
                                                      <span>Level {furtherEvo.min_level}</span>
                                                    )}
                                                    {furtherEvo.trigger_name === 'use-item' && furtherEvo.item && (
                                                      <span>Use {furtherEvo.item?.replace('-', ' ') || 'item'}</span>
                                                    )}
                                                    {furtherEvo.trigger_name === 'trade' && (
                                                      <span>Trade</span>
                                                    )}
                                                    {furtherEvo.trigger_name && !furtherEvo.min_level && !furtherEvo.item && furtherEvo.trigger_name !== 'trade' && (
                                                      <span>{furtherEvo.trigger_name?.replace('-', ' ') || 'Unknown'}</span>
                                                    )}
                                                    {!furtherEvo.trigger_name && (
                                                      <span>Evolution</span>
                                                    )}
                                                  </div>
                                                  
                                                  {/* Further Evolution Pokemon */}
                                                  <div className={`w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-2 ${furtherEvo.species_id === pokemonDetails.id ? 'ring-2 ring-blue-500' : ''}`}>
                                                    <Link 
                                                      to={`/pokemon/${furtherEvo.species_id}`}
                                                      className="cursor-pointer transition-transform hover:scale-110"
                                                      title={`View ${furtherEvo.species_name} details`}
                                                    >
                                                      <PokemonImage
                                                        pokemonId={furtherEvo.species_id}
                                                        alt={furtherEvo.species_name}
                                                        className="w-24 h-24 object-contain"
                                                      />
                                                    </Link>
                                                  </div>
                                                  <div className="text-center">
                                                    <p className="font-medium capitalize">{furtherEvo.species_name}</p>
                                                    {/* All further evolutions are final */}
                                                    <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                                                      Final Evolution
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Evolution Details Information */}
                    <div className="mt-8">
                      <h3 className="text-xl font-bold mb-4">Evolution Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pokemonDetails.evolution_chain.map((evo, index) => (
                          <div key={`evo-detail-${index}`} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center mb-3">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                                <PokemonImage
                                  pokemonId={evo.species_id}
                                  alt={evo.species_name}
                                  className="w-12 h-12 object-contain"
                                />
                              </div>
                              <div>
                                <h4 className="font-bold capitalize text-lg">{evo.species_name}</h4>
                                <p className="text-xs text-gray-500">#{String(evo.species_id).padStart(3, '0')}</p>
                              </div>
                            </div>
                            
                            <div className="text-sm">
                              {index === 0 ? (
                                <p className="text-gray-600">Base form</p>
                              ) : (
                                <div>
                                  <p className="font-medium mb-1">Evolution Trigger:</p>
                                  <ul className="list-disc pl-5 text-gray-600 space-y-1">
                                    {evo.min_level && (
                                      <li>Evolves at level {evo.min_level}</li>
                                    )}
                                    {evo.trigger_name && (
                                      <li>Trigger: {evo.trigger_name?.replace('-', ' ') || 'Unknown'}</li>
                                    )}
                                    {evo.item && (
                                      <li>Requires item: {evo.item?.replace('-', ' ') || 'Unknown'}</li>
                                    )}
                                    {!evo.min_level && !evo.item && evo.trigger_name !== 'level-up' && (
                                      <li>Special evolution method</li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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
      <div className="container mx-auto px-4 py-8">
        {pokemonDetails && <PokemonSeoContent pokemon={pokemonDetails} />}
        
        <div className="text-sm text-gray-500 flex justify-between mt-6 mb-2">
          <div>
            <span className="font-medium">Published:</span> April 1, 2025
          </div>
          <div>
            <span className="font-medium">Last Modified:</span> April 7, 2025
          </div>
        </div>
        
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Pokémon Trading Cards</h2>
          {pokemonDetails && <PokemonCards pokemonName={pokemonDetails.name} pokemonId={pokemonDetails.id} />}
        </div>
        
        {pokemonDetails && pokemonDetails.types && pokemonDetails.types.length > 0 && (
          <RelatedPokemon 
            pokemonId={pokemonDetails.id}
            pokemonType={pokemonDetails.types[0]}
            limit={12}
            title={`Other ${pokemonDetails.types[0].charAt(0).toUpperCase() + pokemonDetails.types[0].slice(1)}-type Pokémon`}
          />
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default PokemonPage;
