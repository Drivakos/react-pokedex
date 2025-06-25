import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Plus, Zap, Settings, Award } from 'lucide-react';
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
}

interface Nature {
  name: string;
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

  // Common Pokemon natures
  const commonNatures = [
    'hardy', 'lonely', 'brave', 'adamant', 'naughty',
    'bold', 'docile', 'relaxed', 'impish', 'lax',
    'timid', 'hasty', 'serious', 'jolly', 'naive',
    'modest', 'mild', 'quiet', 'bashful', 'rash',
    'calm', 'gentle', 'sassy', 'careful', 'quirky'
  ];

  // Common held items
  const commonItems = [
    'leftovers', 'choice-band', 'choice-scarf', 'choice-specs',
    'life-orb', 'focus-sash', 'assault-vest', 'rocky-helmet',
    'heavy-duty-boots', 'eviolite', 'air-balloon', 'weakness-policy',
    'expert-belt', 'muscle-band', 'wise-glasses', 'scope-lens'
  ];

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
          
          // Get abilities
          const abilities = pokemonData.abilities.map((ability: any) => ability.ability.name);
          setAvailableAbilities(abilities);
          
          // Check for gender differences
          setHasGenderDifference(pokemonData.species ? true : false);
          
          // Set default ability
          setPokemonBuild(prev => ({
            ...prev,
            ability: abilities[0] || ''
          }));
        }
        
        // Set available natures and items
        setAvailableNatures(commonNatures.map(name => ({ name })));
        setAvailableItems(commonItems);
        
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

  const handleIVChange = (stat: keyof PokemonBuild['ivs'], value: number) => {
    setPokemonBuild(prev => ({
      ...prev,
      ivs: {
        ...prev.ivs,
        [stat]: Math.max(0, Math.min(31, value))
      }
    }));
  };

  const handleEVChange = (stat: keyof PokemonBuild['evs'], value: number) => {
    const currentEVTotal = Object.values(pokemonBuild.evs).reduce((sum, ev) => sum + ev, 0) - pokemonBuild.evs[stat];
    const maxAllowed = Math.min(252, 510 - currentEVTotal);
    
    setPokemonBuild(prev => ({
      ...prev,
      evs: {
        ...prev.evs,
        [stat]: Math.max(0, Math.min(maxAllowed, value))
      }
    }));
  };

  const formatStatName = (stat: string) => {
    return stat.split('-').map(word => 
      word === 'hp' ? 'HP' : word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getEVTotal = () => {
    return Object.values(pokemonBuild.evs).reduce((sum, ev) => sum + ev, 0);
  };

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
          effect_entries: move.effect_entries || []
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
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  {formatName(pokemon.name)} Moveset
                </h1>
                <div className="flex gap-2">
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
                      <h3 className="font-semibold text-gray-800">{formatMoveName(moveName)}</h3>
                      <button
                        onClick={() => handleRemoveMove(moveName)}
                        className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
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
                          {move.power && <span>Power: {move.power}</span>}
                          {move.accuracy && <span>Accuracy: {move.accuracy}%</span>}
                          <span>PP: {move.pp}</span>
                        </div>
                        
                        {move.effect_entries.length > 0 && (
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
              <h3 className="text-lg font-semibold text-gray-800 mb-2">IVs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(pokemonBuild.ivs).map((stat) => (
                  <div key={stat} className="flex items-center gap-2">
                    <span className="text-gray-800">{formatStatName(stat)}:</span>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      value={pokemonBuild.ivs[stat as keyof PokemonBuild['ivs']]}
                      onChange={(e) => handleIVChange(stat as keyof PokemonBuild['ivs'], parseInt(e.target.value, 10) || 0)}
                      className="w-16 p-1 border border-gray-300 rounded text-center"
                    />
                  </div>
                ))}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">EVs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(pokemonBuild.evs).map((stat) => (
                  <div key={stat} className="flex items-center gap-2">
                    <span className="text-gray-800">{formatStatName(stat)}:</span>
                    <input
                      type="number"
                      min="0"
                      max="252"
                      value={pokemonBuild.evs[stat as keyof PokemonBuild['evs']]}
                      onChange={(e) => handleEVChange(stat as keyof PokemonBuild['evs'], parseInt(e.target.value, 10) || 0)}
                      className="w-16 p-1 border border-gray-300 rounded text-center"
                    />
                  </div>
                ))}
              </div>
              <p className="text-gray-600 text-xs mt-2">Total EVs: {getEVTotal()}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Nature</h3>
              <select
                value={pokemonBuild.nature}
                onChange={(e) => setPokemonBuild(prev => ({ ...prev, nature: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded text-gray-800"
              >
                {availableNatures.map((nature) => (
                  <option key={nature.name} value={nature.name}>{formatName(nature.name)}</option>
                ))}
              </select>
              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Ability</h3>
              <select
                value={pokemonBuild.ability}
                onChange={(e) => setPokemonBuild(prev => ({ ...prev, ability: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded text-gray-800"
              >
                {availableAbilities.map((ability) => (
                  <option key={ability} value={ability}>{formatName(ability)}</option>
                ))}
              </select>
              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Gender</h3>
              {hasGenderDifference ? (
                <select
                  value={pokemonBuild.gender || ''}
                  onChange={(e) => setPokemonBuild(prev => ({ ...prev, gender: e.target.value || null }))}
                  className="w-full p-2 border border-gray-300 rounded text-gray-800"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              ) : (
                <p className="text-gray-600">No gender difference</p>
              )}
              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Held Item</h3>
              <select
                value={pokemonBuild.heldItem}
                onChange={(e) => setPokemonBuild(prev => ({ ...prev, heldItem: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded text-gray-800"
              >
                <option value="">No Item</option>
                {availableItems.map((item) => (
                  <option key={item} value={item}>{formatName(item)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Move Selector */}
        {showMoveSelector && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
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
      </div>
    </div>
  );
};

export default MovesetEditor;
