import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Plus, Zap, Settings, Award, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatName, getOfficialArtwork } from '../../utils/helpers';
import MovesFilter from '../filters/MovesFilter';

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

interface MovesetEditorProps {
  pokemon: PokemonWithMoves;
  teamId: number;
  onBack: () => void;
}

interface PokemonMove {
  move: {
    name: string;
    url: string;
  };
}

interface MoveDetails {
  name: string;
  type: {
    name: string;
  };
  power: number | null;
  accuracy: number | null;
  pp: number;
  damage_class: {
    name: string;
  };
  effect_entries: {
    short_effect: string;
    language: {
      name: string;
    };
  }[];
  flavor_text_entries: {
    flavor_text: string;
    language: {
      name: string;
    };
  }[];
  target: {
    name: string;
  };
  priority: number;
}

interface Nature {
  name: string;
  description: string;
  increased_stat?: { name: string };
  decreased_stat?: { name: string };
}

interface PokemonBuild {
  moves: string[];
  nature: string;
  ability: string;
  gender: string | null;
  heldItem: string;
  ivs: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
  evs: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
}

const MovesetEditor: React.FC<MovesetEditorProps> = ({ pokemon, teamId, onBack }) => {
  const [selectedMoves, setSelectedMoves] = useState<string[]>([]);
  const [availableMoves, setAvailableMoves] = useState<string[]>([]);
  const [moveDetails, setMoveDetails] = useState<Record<string, MoveDetails>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMoveSelector, setShowMoveSelector] = useState(false);
  
  // New build customization states
  const [pokemonBuild, setPokemonBuild] = useState<PokemonBuild>({
    moves: [],
    nature: 'hardy',
    ability: '',
    gender: null,
    heldItem: '',
    ivs: {
      hp: 31,
      attack: 31,
      defense: 31,
      'special-attack': 31,
      'special-defense': 31,
      speed: 31
    },
    evs: {
      hp: 0,
      attack: 0,
      defense: 0,
      'special-attack': 0,
      'special-defense': 0,
      speed: 0
    }
  });
  
  const [availableNatures, setAvailableNatures] = useState<Nature[]>([]);
  const [availableAbilities, setAvailableAbilities] = useState<string[]>([]);
  const [availableItems, setAvailableItems] = useState<string[]>([]);
  const [hasGenderDifference, setHasGenderDifference] = useState(false);
  const [activeTab, setActiveTab] = useState<'moves' | 'stats' | 'details'>('moves');
  
  // Description states
  const [pokemonDescription, setPokemonDescription] = useState<string>('');
  const [abilityDescriptions, setAbilityDescriptions] = useState<Record<string, string>>({});
  const [itemDescriptions, setItemDescriptions] = useState<Record<string, string>>({});
  
  // Comprehensive competitive held items list
  const competitiveItems = [
    // Choice Items
    'choice-band', 'choice-scarf', 'choice-specs',
    // Life Orb & Damage Boosters
    'life-orb', 'expert-belt', 'muscle-band', 'wise-glasses', 'scope-lens',
    // Defensive Items
    'leftovers', 'rocky-helmet', 'assault-vest', 'eviolite', 'heavy-duty-boots',
    // Focus Items
    'focus-sash', 'focus-band',
    // Status & Utility
    'flame-orb', 'toxic-orb', 'black-sludge', 'shed-shell', 'air-balloon',
    'weakness-policy', 'bright-powder', 'kings-rock', 'razor-claw',
    // Common Berries
    'sitrus-berry', 'oran-berry', 'lum-berry', 'chesto-berry', 'pecha-berry',
    'rawst-berry', 'aspear-berry', 'persim-berry', 'cheri-berry',
    'liechi-berry', 'ganlon-berry', 'salac-berry', 'petaya-berry', 'apicot-berry',
    // Weather & Terrain
    'heat-rock', 'damp-rock', 'smooth-rock', 'icy-rock'
  ];

  const filteredItems = availableItems;

  // Common Pokemon natures with descriptions
  const commonNatures = [
    { name: 'hardy', description: 'Neutral nature (no stat changes)' },
    { name: 'lonely', description: '+Attack, -Defense' },
    { name: 'brave', description: '+Attack, -Speed' },
    { name: 'adamant', description: '+Attack, -Sp. Attack' },
    { name: 'naughty', description: '+Attack, -Sp. Defense' },
    { name: 'bold', description: '+Defense, -Attack' },
    { name: 'docile', description: 'Neutral nature (no stat changes)' },
    { name: 'relaxed', description: '+Defense, -Speed' },
    { name: 'impish', description: '+Defense, -Sp. Attack' },
    { name: 'lax', description: '+Defense, -Sp. Defense' },
    { name: 'timid', description: '+Speed, -Attack' },
    { name: 'hasty', description: '+Speed, -Defense' },
    { name: 'serious', description: 'Neutral nature (no stat changes)' },
    { name: 'jolly', description: '+Speed, -Sp. Attack' },
    { name: 'naive', description: '+Speed, -Sp. Defense' },
    { name: 'modest', description: '+Sp. Attack, -Attack' },
    { name: 'mild', description: '+Sp. Attack, -Defense' },
    { name: 'quiet', description: '+Sp. Attack, -Speed' },
    { name: 'bashful', description: 'Neutral nature (no stat changes)' },
    { name: 'rash', description: '+Sp. Attack, -Sp. Defense' },
    { name: 'calm', description: '+Sp. Defense, -Attack' },
    { name: 'gentle', description: '+Sp. Defense, -Defense' },
    { name: 'sassy', description: '+Sp. Defense, -Speed' },
    { name: 'careful', description: '+Sp. Defense, -Sp. Attack' },
    { name: 'quirky', description: 'Neutral nature (no stat changes)' }
  ];

  const [expandedMove, setExpandedMove] = useState('');

  useEffect(() => {
    const loadPokemonData = async () => {
      setLoading(true);
      try {
        // Fetch detailed Pokemon data
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}`);
        if (response.ok) {
          const pokemonData = await response.json();
          const moves = pokemonData.moves.map((move: PokemonMove) => move.move.name);
          setAvailableMoves(moves);
          
          // Get abilities and fetch their descriptions
          const abilities = pokemonData.abilities.map((ability: any) => ability.ability.name);
          setAvailableAbilities(abilities);
          
          // Fetch ability descriptions
          const abilityDescs: Record<string, string> = {};
          for (const ability of abilities) {
            try {
              const abilityResponse = await fetch(`https://pokeapi.co/api/v2/ability/${ability}`);
              if (abilityResponse.ok) {
                const abilityData = await abilityResponse.json();
                const englishEntry = abilityData.effect_entries.find((entry: any) => entry.language.name === 'en');
                abilityDescs[ability] = englishEntry?.short_effect || 'No description available';
              }
            } catch (error) {
              console.warn(`Failed to fetch description for ability: ${ability}`);
              abilityDescs[ability] = 'Description not available';
            }
          }
          setAbilityDescriptions(abilityDescs);
          
          // Check for gender differences
          setHasGenderDifference(pokemonData.species ? true : false);
          
          // Set default ability
          setPokemonBuild(prev => ({
            ...prev,
            ability: abilities[0] || ''
          }));

          // Fetch Pokemon species description
          try {
            const speciesResponse = await fetch(pokemonData.species.url);
            if (speciesResponse.ok) {
              const speciesData = await speciesResponse.json();
              const englishEntry = speciesData.flavor_text_entries.find((entry: any) => entry.language.name === 'en');
              setPokemonDescription(englishEntry?.flavor_text?.replace(/\f/g, ' ') || 'No description available');
            }
          } catch (error) {
            console.warn('Failed to fetch Pokemon species description');
            setPokemonDescription('Description not available');
          }
        }
        
        // Set available natures
        setAvailableNatures(commonNatures);
        
        // Set competitive items list and fetch descriptions
        setAvailableItems(competitiveItems);
        
        // Fetch item descriptions for competitive items
        const itemDescs: Record<string, string> = {};
        for (const item of competitiveItems) { // Fetch all items, not just first 20
          try {
            const itemResponse = await fetch(`https://pokeapi.co/api/v2/item/${item}`);
            if (itemResponse.ok) {
              const itemData = await itemResponse.json();
              const englishEntry = itemData.effect_entries.find((entry: any) => entry.language.name === 'en');
              itemDescs[item] = englishEntry?.short_effect || englishEntry?.effect || 'Competitive battle item';
            }
          } catch (error) {
            console.warn(`Failed to fetch description for item: ${item}`);
            // Provide fallback descriptions for common items
            const fallbackDescriptions: Record<string, string> = {
              'leftovers': 'Restores HP gradually each turn',
              'choice-band': 'Boosts Attack but locks you into one move',
              'choice-scarf': 'Boosts Speed but locks you into one move',
              'choice-specs': 'Boosts Sp. Attack but locks you into one move',
              'life-orb': 'Boosts move power but causes recoil damage',
              'focus-sash': 'Survives a KO hit with 1 HP when at full health',
              'assault-vest': 'Boosts Sp. Defense but prevents status moves',
              'rocky-helmet': 'Damages attackers who make contact',
              'sitrus-berry': 'Restores HP when health is low',
              'lum-berry': 'Cures any status condition',
              'flame-orb': 'Inflicts burn status after one turn',
              'toxic-orb': 'Inflicts poison status after one turn',
              'black-sludge': 'Restores HP for Poison-types, damages others',
              'eviolite': 'Boosts defenses of Pokémon that can still evolve',
              'air-balloon': 'Makes holder immune to Ground moves until popped'
            };
            itemDescs[item] = fallbackDescriptions[item] || 'Competitive battle item';
          }
        }
        setItemDescriptions(itemDescs);
        
        // Load saved build from localStorage
        const savedBuild = localStorage.getItem(`build_${teamId}_${pokemon.id}`);
        if (savedBuild) {
          const build = JSON.parse(savedBuild);
          setPokemonBuild(build);
          setSelectedMoves(build.moves || []);
        }
      } catch (error) {
        console.error('Error loading Pokemon data:', error);
        toast.error('Failed to load Pokemon data');
      } finally {
        setLoading(false);
      }
    };

    loadPokemonData();
  }, [pokemon.id, teamId]);

  const handleSaveBuild = () => {
    const completeBuild = {
      ...pokemonBuild,
      moves: selectedMoves
    };
    localStorage.setItem(`build_${teamId}_${pokemon.id}`, JSON.stringify(completeBuild));
    toast.success(`Complete build saved for ${formatName(pokemon.name)}!`);
  };

  const validateAndFormatInput = (value: string, min: number, max: number): number => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  };

  const handleIVChange = (stat: keyof PokemonBuild['ivs'], value: string) => {
    const formattedValue = validateAndFormatInput(value, 0, 31);
    // IVs can be 31 for all stats - no total limit needed
    if (formattedValue !== parseInt(value, 10) && value !== '') {
      toast.error('IVs must be between 0 and 31');
    }
    
    setPokemonBuild(prev => ({
      ...prev,
      ivs: {
        ...prev.ivs,
        [stat]: formattedValue
      }
    }));
  };

  const handleEVChange = (stat: keyof PokemonBuild['evs'], value: string) => {
    const newValue = validateAndFormatInput(value, 0, 252);
    const evs = { ...pokemonBuild.evs };
    const currentTotal = Object.values(evs).reduce((sum, ev) => sum + ev, 0);
    const remainingEVs = 510 - (currentTotal - evs[stat]);
    
    // Don't allow if it would exceed 510 total
    const finalValue = Math.min(newValue, remainingEVs);
    
    if (newValue > remainingEVs) {
      toast.error(`Only ${remainingEVs} EVs remaining (510 total limit)`);
    } else if (finalValue !== parseInt(value, 10) && value !== '') {
      toast.error('EVs must be between 0 and 252');
    }
    
    setPokemonBuild(prev => ({
      ...prev,
      evs: {
        ...prev.evs,
        [stat]: finalValue
      }
    }));
  };

  const formatStatName = (stat: string) => {
    return stat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const totalEVs = Object.values(pokemonBuild.evs).reduce((sum, ev) => sum + ev, 0);
  const remainingEVs = 510 - totalEVs;

  // Rest of existing code for move handling...
  const loadMoveDetails = async (moveName: string): Promise<MoveDetails | null> => {
    if (moveDetails[moveName]) {
      return moveDetails[moveName];
    }

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/move/${moveName}`);
      if (response.ok) {
        const move = await response.json();
        const details: MoveDetails = {
          name: move.name,
          type: move.type,
          power: move.power,
          accuracy: move.accuracy,
          pp: move.pp,
          damage_class: move.damage_class,
          effect_entries: move.effect_entries || [],
          flavor_text_entries: move.flavor_text_entries || [],
          target: move.target,
          priority: move.priority
        };
        
        setMoveDetails(prev => ({ ...prev, [moveName]: details }));
        return details;
      }
    } catch (error) {
      console.error(`Error loading move details for ${moveName}:`, error);
    }
    
    return null;
  };

  const handleMoveToggle = async (moveName: string) => {
    if (selectedMoves.includes(moveName)) {
      setSelectedMoves(prev => prev.filter(move => move !== moveName));
    } else {
      if (selectedMoves.length >= 4) {
        toast.error('A Pokémon can only learn 4 moves at a time');
        return;
      }
      
      setSelectedMoves(prev => [...prev, moveName]);
      await loadMoveDetails(moveName);
    }
  };

  const handleRemoveMove = (moveName: string) => {
    setSelectedMoves(prev => prev.filter(move => move !== moveName));
  };

  // Existing helper functions...
  const getTypeColor = (typeName: string) => {
    const typeColors: Record<string, string> = {
      normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
      grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
      ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
      rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
      steel: '#B8B8D0', fairy: '#EE99AC',
    };
    return typeColors[typeName] || '#68A090';
  };

  const formatMoveName = (move: string): string => {
    return move.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading moves...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Team
          </button>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-6">
              <img
                src={getOfficialArtwork(pokemon.sprites)}
                alt={formatName(pokemon.name)}
                className="w-20 h-20 object-contain"
                onError={(e) => {
                  // Fallback to regular sprite if official artwork fails
                  const target = e.target as HTMLImageElement;
                  target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
                }}
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  {formatName(pokemon.name)} Moveset
                </h1>
                <div className="flex gap-2 mb-3">
                  {pokemon.types.map((type) => (
                    <span
                      key={type.type.name}
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: getTypeColor(type.type.name) }}
                    >
                      {formatName(type.type.name)}
                    </span>
                  ))}
                </div>
                {pokemonDescription && (
                  <p className="text-gray-600 text-sm italic">
                    "{pokemonDescription}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Current Moveset */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Current Moveset ({selectedMoves.length}/4)</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMoveSelector(!showMoveSelector)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus size={16} />
                {showMoveSelector ? 'Hide' : 'Add'} Moves
              </button>
              <button
                onClick={handleSaveBuild}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Save size={16} />
                Save Build
              </button>
            </div>
          </div>

          {selectedMoves.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-lg">
              <Zap className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No moves selected</h3>
              <p className="text-gray-600">Add up to 4 moves to create this Pokémon's moveset.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedMoves.map((moveName) => {
                const move = moveDetails[moveName];
                return (
                  <div key={moveName} className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-blue-500">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{formatMoveName(moveName)}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setExpandedMove(expandedMove === moveName ? '' : moveName)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                          title={expandedMove === moveName ? 'Collapse details' : 'Expand details'}
                        >
                          {expandedMove === moveName ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button
                          onClick={() => handleRemoveMove(moveName)}
                          className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                          title="Remove move"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {move && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-1 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: getTypeColor(move.type.name) }}
                          >
                            {formatName(move.type.name)}
                          </span>
                          <span
                            className="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700"
                          >
                            {formatName(move.damage_class.name)}
                          </span>
                        </div>
                        
                        <div className="flex gap-4 text-gray-600">
                          {move.power && <span>Power: <strong>{move.power}</strong></span>}
                          {move.accuracy && <span>Accuracy: <strong>{move.accuracy}%</strong></span>}
                          <span>PP: <strong>{move.pp}</strong></span>
                        </div>
                        
                        {expandedMove === moveName && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                            {move.effect_entries.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-800 mb-1">Effect:</h4>
                                <p className="text-gray-600 text-xs leading-relaxed">
                                  {move.effect_entries.find(entry => entry.language.name === 'en')?.short_effect || 
                                   move.effect_entries[0]?.short_effect}
                                </p>
                              </div>
                            )}
                            {move.flavor_text_entries && move.flavor_text_entries.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-800 mb-1">Description:</h4>
                                <p className="text-gray-600 text-xs italic leading-relaxed">
                                  "{move.flavor_text_entries.find((entry: any) => entry.language.name === 'en')?.flavor_text || 
                                    move.flavor_text_entries[0]?.flavor_text}"
                                </p>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                              <div><strong>Target:</strong> {formatName(move.target?.name || 'unknown')}</div>
                              <div><strong>Priority:</strong> {move.priority || 0}</div>
                            </div>
                          </div>
                        )}
                        
                        {expandedMove !== moveName && move.effect_entries.length > 0 && (
                          <p className="text-gray-600 text-xs leading-relaxed">
                            {move.effect_entries.find(entry => entry.language.name === 'en')?.short_effect || 
                             move.effect_entries[0]?.short_effect}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Move Selector */}
        {showMoveSelector && (
          <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Available Moves</h2>
            <MovesFilter
              availableMoves={availableMoves}
              selectedMoves={selectedMoves}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onMoveToggle={handleMoveToggle}
            />
          </div>
        )}

        {/* Build Customization */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Build Customization</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('stats')}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'stats' ? 'bg-blue-700' : ''}`}
              >
                <Award size={16} />
                Stats
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'details' ? 'bg-blue-700' : ''}`}
              >
                <Settings size={16} />
                Details
              </button>
            </div>
          </div>

          {activeTab === 'stats' ? (
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">Individual Values (IVs)</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    0-31 per stat
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(pokemonBuild.ivs).map((stat) => (
                    <div key={stat} className="flex items-center gap-2">
                      <span className="text-gray-800 w-20">{formatStatName(stat)}:</span>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={pokemonBuild.ivs[stat as keyof PokemonBuild['ivs']]}
                        onChange={(e) => handleIVChange(stat as keyof PokemonBuild['ivs'], e.target.value)}
                        onBlur={(e) => handleIVChange(stat as keyof PokemonBuild['ivs'], e.target.value)}
                        className="w-16 p-1 border border-gray-300 rounded text-center"
                        title="Individual Values determine genetic potential (0-31, higher is better)"
                      />
                      <span className="text-xs text-gray-500">/31</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">IVs are like genetics - higher values mean better base stats</p>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">Effort Values (EVs)</h3>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {totalEVs}/510 total
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  {Object.keys(pokemonBuild.evs).map((stat) => (
                    <div key={stat} className="flex items-center gap-2">
                      <span className="text-gray-800 w-20">{formatStatName(stat)}:</span>
                      <input
                        type="number"
                        min="0"
                        max="252"
                        value={pokemonBuild.evs[stat as keyof PokemonBuild['evs']]}
                        onChange={(e) => handleEVChange(stat as keyof PokemonBuild['evs'], e.target.value)}
                        onBlur={(e) => handleEVChange(stat as keyof PokemonBuild['evs'], e.target.value)}
                        className="w-16 p-1 border border-gray-300 rounded text-center"
                        title="Effort Values from training (0-252 per stat, 510 total)"
                      />
                      <span className="text-xs text-gray-500">/252</span>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Total EVs:</strong> {totalEVs}/510 ({remainingEVs} remaining)
                    {remainingEVs === 0 && <span className="text-green-600 ml-2">Fully trained!</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Distribute 510 points to boost stats (max 252 per stat)</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-800">Nature</h3>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        +10% / -10%
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Affects stat growth</span>
                  </div>
                  <select
                    value={pokemonBuild.nature}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, nature: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded text-gray-800"
                    title="Nature boosts one stat by 10% and reduces another by 10%"
                  >
                    {availableNatures.map((nature) => (
                      <option key={nature.name} value={nature.name}>{formatName(nature.name)} - {nature.description}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-800">Ability</h3>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                        Battle effects
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Passive abilities</span>
                  </div>
                  <select
                    value={pokemonBuild.ability}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, ability: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded text-gray-800"
                    title="Abilities provide passive effects during battle"
                  >
                    {availableAbilities.map((ability) => (
                      <option key={ability} value={ability}>
                        {formatName(ability)}
                        {abilityDescriptions[ability] && ` - ${abilityDescriptions[ability]}`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-800">Gender</h3>
                      <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded-full">
                        Cosmetic
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Visual only</span>
                  </div>
                  {hasGenderDifference ? (
                    <select
                      value={pokemonBuild.gender || ''}
                      onChange={(e) => setPokemonBuild(prev => ({ ...prev, gender: e.target.value || null }))}
                      className="w-full p-2 border border-gray-300 rounded text-gray-800"
                      title="Some Pokémon have visual differences between genders"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  ) : (
                    <p className="text-gray-500 italic text-sm">This Pokémon has no gender differences</p>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-800">Held Item</h3>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Strategic
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Battle items</span>
                  </div>
                  <select
                    value={pokemonBuild.heldItem}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, heldItem: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded text-gray-800"
                    title="Held items provide various battle effects and advantages"
                  >
                    <option value="">No Item</option>
                    {filteredItems.map((item) => (
                      <option key={item} value={item}>
                        {formatName(item)}
                        {itemDescriptions[item] && ` - ${itemDescriptions[item]}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovesetEditor;
