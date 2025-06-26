import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Plus, Zap, Settings, Award, ChevronUp, ChevronDown, Copy } from 'lucide-react';
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
  nickname: string;
  teraType: string;
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

const EV_PRESETS = {
  'Physical Attacker': {
    hp: 4,
    attack: 252,
    defense: 0,
    'special-attack': 0,
    'special-defense': 0,
    speed: 252
  },
  'Special Attacker': {
    hp: 4,
    attack: 0,
    defense: 0,
    'special-attack': 252,
    'special-defense': 0,
    speed: 252
  },
  'Physical Tank': {
    hp: 252,
    attack: 0,
    defense: 252,
    'special-attack': 0,
    'special-defense': 4,
    speed: 0
  },
  'Special Tank': {
    hp: 252,
    attack: 0,
    defense: 4,
    'special-attack': 0,
    'special-defense': 252,
    speed: 0
  },
  'Mixed Tank': {
    hp: 252,
    attack: 0,
    defense: 128,
    'special-attack': 0,
    'special-defense': 128,
    speed: 0
  },
  'Fast Support': {
    hp: 252,
    attack: 0,
    defense: 4,
    'special-attack': 0,
    'special-defense': 0,
    speed: 252
  },
  'Balanced': {
    hp: 85,
    attack: 85,
    defense: 85,
    'special-attack': 85,
    'special-defense': 85,
    speed: 85
  }
};

const POKEMON_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

const HELD_ITEMS = [
  // Choice Items
  'Choice Band',
  'Choice Specs', 
  'Choice Scarf',
  // Defensive Items
  'Leftovers',
  'Heavy-Duty Boots',
  'Assault Vest',
  'Rocky Helmet',
  'Black Sludge',
  // Offensive Items
  'Life Orb',
  'Expert Belt',
  'Muscle Band',
  'Wise Glasses',
  // Focus Items
  'Focus Sash',
  'Focus Band',
  // Berries - Popular
  'Sitrus Berry',
  'Lum Berry',
  'Chesto Berry',
  'Leppa Berry',
  // Berries - Stat Boost
  'Liechi Berry',
  'Ganlon Berry',
  'Salac Berry',
  'Petaya Berry',
  'Apicot Berry',
  // Berries - Type Resist
  'Occa Berry',
  'Passho Berry',
  'Wacan Berry',
  'Rindo Berry',
  'Yache Berry',
  'Chople Berry',
  'Kebia Berry',
  'Shuca Berry',
  'Coba Berry',
  'Payapa Berry',
  'Tanga Berry',
  'Charti Berry',
  'Kasib Berry',
  'Haban Berry',
  'Colbur Berry',
  'Babiri Berry',
  'Chilan Berry',
  'Roseli Berry',
  // Utility Items
  'Air Balloon',
  'Mental Herb',
  'Power Herb',
  'Quick Claw',
  'King\'s Rock',
  'Razor Claw',
  'Scope Lens',
  'Wide Lens',
  'Zoom Lens',
  // Status Orbs
  'Flame Orb',
  'Toxic Orb',
  // Terrain Seeds
  'Electric Seed',
  'Grassy Seed',
  'Misty Seed',
  'Psychic Seed',
  // Weather Items
  'Heat Rock',
  'Damp Rock',
  'Smooth Rock',
  'Icy Rock',
  // Competitive Items
  'Eject Button',
  'Red Card',
  'Shed Shell',
  'Safety Goggles',
  'Protective Pads',
  'Clear Amulet',
  'Covert Cloak',
  'Loaded Dice',
  'Booster Energy',
  'Mirror Herb',
  'Punching Glove',
  // Type Enhancing Items
  'Black Belt',
  'Black Glasses',
  'Charcoal',
  'Dragon Fang',
  'Hard Stone',
  'Magnet',
  'Metal Coat',
  'Miracle Seed',
  'Mystic Water',
  'Never-Melt Ice',
  'Poison Barb',
  'Sharp Beak',
  'Silk Scarf',
  'Silver Powder',
  'Soft Sand',
  'Spell Tag',
  'Twisted Spoon',
  'Fairy Feather'
];

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
    nickname: '',
    teraType: '',
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
  const [hasGenderDifference, setHasGenderDifference] = useState(false);
  const [activeTab, setActiveTab] = useState<'moves' | 'stats' | 'details'>('moves');
  
  // Description states
  const [pokemonDescription, setPokemonDescription] = useState<string>('');
  const [abilityDescriptions, setAbilityDescriptions] = useState<Record<string, string>>({});
  const [itemDescriptions, setItemDescriptions] = useState<Record<string, string>>({});
  
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
        setAvailableNatures([
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
        ]);

        // Fetch item descriptions for competitive items
        const itemDescs: Record<string, string> = {};
        for (const item of HELD_ITEMS) { // Fetch all items, not just first 20
          try {
            const itemResponse = await fetch(`https://pokeapi.co/api/v2/item/${item.toLowerCase().replace(' ', '-')}`);
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
            itemDescs[item] = fallbackDescriptions[item.toLowerCase().replace(' ', '-')] || 'Competitive battle item';
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

  // Load move details when selectedMoves changes (including from saved builds)
  useEffect(() => {
    const loadDetailsForSelectedMoves = async () => {
      for (const moveName of selectedMoves) {
        if (!moveDetails[moveName]) {
          await loadMoveDetails(moveName);
        }
      }
    };

    if (selectedMoves.length > 0) {
      loadDetailsForSelectedMoves();
    }
  }, [selectedMoves]); // Only depend on selectedMoves, not moveDetails to avoid infinite loop

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

  const exportCurrentPokemon = async () => {
    try {
      // Default values
      const pokemonName = formatName(pokemon.name);
      const heldItem = pokemonBuild.heldItem ? formatName(pokemonBuild.heldItem) : '';
      const ability = pokemonBuild.ability ? formatName(pokemonBuild.ability) : '';
      const nature = pokemonBuild.nature ? formatName(pokemonBuild.nature) : 'Hardy';
      const moves = selectedMoves || [];

      // Format EVs (only show non-zero values)
      const evs = pokemonBuild.evs || {};
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
      if (pokemonBuild.nickname) {
        if (heldItem) {
          pokemonExport += `${pokemonBuild.nickname} (${pokemonName}) @ ${heldItem}\n`;
        } else {
          pokemonExport += `${pokemonBuild.nickname} (${pokemonName})\n`;
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
      if (pokemonBuild.teraType) {
        pokemonExport += `Tera Type: ${pokemonBuild.teraType}\n`;
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
      toast.success(`${pokemonName} build exported to clipboard!`);
      
    } catch (error) {
      console.error('Error exporting Pokemon build:', error);
      toast.error('Failed to export Pokemon build');
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Team
          </button>
          
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <img
                src={getOfficialArtwork(pokemon.sprites)}
                alt={formatName(pokemon.name)}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto sm:mx-0"
                onError={(e) => {
                  // Fallback to regular sprite if official artwork fails
                  const target = e.target as HTMLImageElement;
                  target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
                }}
              />
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                  {formatName(pokemon.name)} Moveset
                </h1>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-3">
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
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Current Moveset ({selectedMoves.length}/4)</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowMoveSelector(!showMoveSelector)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Plus size={16} />
                {showMoveSelector ? 'Hide Moves' : 'Add Moves'}
              </button>
              <button
                onClick={handleSaveBuild}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Save size={16} />
                Save Build
              </button>
              <button
                onClick={exportCurrentPokemon}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Copy size={16} />
                Export Build
              </button>
            </div>
          </div>

          {selectedMoves.length === 0 ? (
            <div className="bg-white rounded-xl p-6 sm:p-8 text-center shadow-lg">
              <Zap className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No moves selected</h3>
              <p className="text-gray-600 text-sm sm:text-base">Add up to 4 moves to create this Pokémon's moveset.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {selectedMoves.map((moveName) => {
                const move = moveDetails[moveName];
                return (
                  <div key={moveName} className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-blue-500">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{formatMoveName(moveName)}</h3>
                      </div>
                      <div className="flex gap-2 ml-2">
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
                        <div className="flex flex-wrap items-center gap-2">
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
                        
                        <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          {move.power && <span>Power: <strong>{move.power}</strong></span>}
                          {move.accuracy && <span>Acc: <strong>{move.accuracy}%</strong></span>}
                          <span>PP: <strong>{move.pp}</strong></span>
                        </div>
                        
                        {/* Always show short effect/description */}
                        {move.effect_entries.length > 0 && (
                          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mt-2 italic">
                            {move.effect_entries.find(entry => entry.language.name === 'en')?.short_effect || 
                             move.effect_entries[0]?.short_effect}
                          </p>
                        )}
                        
                        {expandedMove === moveName && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                            {move.flavor_text_entries && move.flavor_text_entries.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-800 mb-1 text-xs sm:text-sm">Game Description:</h4>
                                <p className="text-gray-600 text-xs leading-relaxed italic">
                                  "{move.flavor_text_entries.find((entry: any) => entry.language.name === 'en')?.flavor_text || 
                                    move.flavor_text_entries[0]?.flavor_text}"
                                </p>
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                              <div><strong>Target:</strong> {formatName(move.target?.name || 'unknown')}</div>
                              <div><strong>Priority:</strong> {move.priority || 0}</div>
                            </div>
                          </div>
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
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Available Moves</h2>
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
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Build Customization</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ${
                  activeTab === 'stats' 
                    ? 'bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Award size={16} />
                Stats & EVs
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ${
                  activeTab === 'details' 
                    ? 'bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Settings size={16} />
                Nature & Items
              </button>
            </div>
          </div>

          {activeTab === 'stats' ? (
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg space-y-6">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">Individual Values (IVs)</h3>
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full w-fit">
                      Max 31 each
                    </span>
                  </div>
                  <button
                    onClick={() => setPokemonBuild(prev => ({ 
                      ...prev, 
                      ivs: {
                        hp: 31,
                        attack: 31,
                        defense: 31,
                        'special-attack': 31,
                        'special-defense': 31,
                        speed: 31
                      }
                    }))}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-xs transition-colors w-fit"
                  >
                    Max All IVs
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {Object.entries(pokemonBuild.ivs).map(([stat, value]) => (
                    <div key={stat} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                      <label className="text-xs sm:text-sm font-medium text-gray-700 capitalize">
                        {stat.replace('-', ' ')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={value}
                        onChange={(e) => {
                          const newValue = Math.min(31, Math.max(0, parseInt(e.target.value) || 0));
                          setPokemonBuild(prev => ({
                            ...prev,
                            ivs: { ...prev.ivs, [stat]: newValue }
                          }));
                        }}
                        className="w-full sm:w-16 p-2 border border-gray-300 rounded text-center text-gray-800 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Higher IVs mean stronger stats (0-31 range)</p>
              </div>
              
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">Effort Values (EVs)</h3>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full w-fit">
                    {totalEVs}/510 total
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {Object.keys(pokemonBuild.evs).map((stat) => (
                    <div key={stat} className="flex items-center gap-2">
                      <span className="text-gray-800 text-sm w-16 sm:w-20 flex-shrink-0">{formatStatName(stat)}:</span>
                      <input
                        type="number"
                        min="0"
                        max="252"
                        value={pokemonBuild.evs[stat as keyof PokemonBuild['evs']]}
                        onChange={(e) => handleEVChange(stat as keyof PokemonBuild['evs'], e.target.value)}
                        onBlur={(e) => handleEVChange(stat as keyof PokemonBuild['evs'], e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded text-center text-sm"
                        title="Effort Values from training (0-252 per stat, 510 total)"
                      />
                      <span className="text-xs text-gray-500 w-8 flex-shrink-0">/252</span>
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
                <div className="mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">EV Presets</h3>
                    <span className="text-xs text-gray-500">Quick competitive spreads</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Object.entries(EV_PRESETS).map(([preset, evs]) => (
                      <button
                        key={preset}
                        onClick={() => setPokemonBuild(prev => ({ ...prev, evs }))}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-2 rounded-md text-xs font-medium transition-colors text-center"
                        title={`Set EVs for ${preset}`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
              <div className="space-y-6">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800">Nature</h3>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full w-fit">
                        +10% / -10%
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Affects stat growth</span>
                  </div>
                  <select
                    value={pokemonBuild.nature}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, nature: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded text-gray-800 text-sm"
                    title="Nature boosts one stat by 10% and reduces another by 10%"
                  >
                    {availableNatures.map((nature) => (
                      <option key={nature.name} value={nature.name}>{formatName(nature.name)} - {nature.description}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800">Ability</h3>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full w-fit">
                        Battle effects
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Passive abilities</span>
                  </div>
                  <select
                    value={pokemonBuild.ability}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, ability: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded text-gray-800 text-sm"
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800">Gender</h3>
                      <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded-full w-fit">
                        Cosmetic
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Visual only</span>
                  </div>
                  {hasGenderDifference ? (
                    <select
                      value={pokemonBuild.gender || ''}
                      onChange={(e) => setPokemonBuild(prev => ({ ...prev, gender: e.target.value || null }))}
                      className="w-full p-3 border border-gray-300 rounded text-gray-800 text-sm"
                      title="Some Pokémon have visual differences between genders"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  ) : (
                    <p className="text-gray-500 italic text-sm bg-gray-50 p-3 rounded">This Pokémon has no gender differences</p>
                  )}
                </div>
                
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800">Nickname</h3>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full w-fit">
                        Custom name
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Give your Pokémon a nickname</span>
                  </div>
                  <input
                    type="text"
                    value={pokemonBuild.nickname}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, nickname: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded text-gray-800 text-sm"
                    placeholder="Enter a nickname..."
                    title="Give your Pokémon a custom nickname"
                  />
                </div>
                
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800">Tera Type</h3>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full w-fit">
                        Tera Raid
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Tera Raid type</span>
                  </div>
                  <select
                    value={pokemonBuild.teraType}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, teraType: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded text-gray-800 text-sm"
                    title="Select a Tera Raid type"
                  >
                    <option value="">Select Tera Type</option>
                    {POKEMON_TYPES.map((type) => (
                      <option key={type} value={type}>{formatName(type)}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800">Held Item</h3>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full w-fit">
                        Strategic
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Battle items</span>
                  </div>
                  <select
                    value={pokemonBuild.heldItem}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, heldItem: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded text-gray-800 text-sm"
                    title="Held items provide various battle effects and advantages"
                  >
                    <option value="">No Item</option>
                    {HELD_ITEMS.map((item) => (
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
