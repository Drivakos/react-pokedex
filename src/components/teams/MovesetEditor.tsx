import React, { useState, useEffect } from 'react';
import { Save, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatName } from '../../utils/helpers';
import { fetchMoveDetails, fetchPokemonAbilities, fetchCompetitiveItems, fetchPokemonById, fetchPokemonMoves } from '../../services/api';
import PokemonImage from '../PokemonImage';
import './ShowdownStyles.css';

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
  initialBuild?: PokemonBuild;
  onSave?: (buildData: PokemonBuild) => void;
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
  isShiny: boolean;
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
    hp: 6,
    attack: 252,
    defense: 0,
    'special-attack': 0,
    'special-defense': 0,
    speed: 252
  },
  'Special Attacker': {
    hp: 6,
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
    'special-defense': 6,
    speed: 0
  },
  'Special Tank': {
    hp: 252,
    attack: 0,
    defense: 6,
    'special-attack': 0,
    'special-defense': 252,
    speed: 0
  },
  'Mixed Tank': {
    hp: 252,
    attack: 0,
    defense: 130,
    'special-attack': 0,
    'special-defense': 128,
    speed: 0
  },
  'Fast Support': {
    hp: 252,
    attack: 0,
    defense: 6,
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

// Module-level in-memory cache for move details (persists across re-mounts)
const moveDetailsCache: Record<string, MoveDetails> = {};

const MovesetEditorContent: React.FC<MovesetEditorProps> = ({ pokemon, teamId, initialBuild, onSave }) => {
  const [selectedMoves, setSelectedMoves] = useState<string[]>([]);
  const [availableMoves, setAvailableMoves] = useState<string[]>([]);
  const [moveDetails, setMoveDetails] = useState<Record<string, MoveDetails>>(moveDetailsCache);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);


  // New build customization states
  const [pokemonBuild, setPokemonBuild] = useState<PokemonBuild>(
    initialBuild || {
      moves: [],
      nature: 'hardy',
      ability: '',
      gender: null,
      heldItem: '',
      nickname: '',
      isShiny: false,
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
    }
  );

  const [availableNatures] = useState<Nature[]>([
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
  const [availableAbilities, setAvailableAbilities] = useState<string[]>([]);
  const [hasGenderDifference] = useState(false);


  // Description states
  const [abilityDescriptions, setAbilityDescriptions] = useState<Record<string, string>>({});
  const [itemDescriptions, setItemDescriptions] = useState<Record<string, string>>({});



  useEffect(() => {
    const loadPokemonData = async () => {
      setLoading(true);
      try {
        // Fetch detailed Pokemon data and moves in parallel
        const [, movesData, abilitiesData, itemsData] = await Promise.all([
          fetchPokemonById(pokemon.id),
          fetchPokemonMoves(pokemon.id),
          fetchPokemonAbilities(pokemon.id),
          fetchCompetitiveItems().catch(() => [])
        ]);

        // Process moves
        const moveNames = movesData.map((m: any) => m.move.name);
        setAvailableMoves(moveNames);

        const newMoveDetails: Record<string, MoveDetails> = { ...moveDetailsCache };
        movesData.forEach((m: any) => {
          const move = m.move;
          if (!newMoveDetails[move.name]) {
            newMoveDetails[move.name] = {
              name: move.name,
              type: move.type,
              power: move.power,
              accuracy: move.accuracy,
              pp: move.pp,
              damage_class: move.damage_class,
              target: move.target,
              priority: move.priority,
              effect_entries: move.effect?.effect_text?.map((et: any) => ({
                short_effect: et.short_effect,
                language: { name: 'en' }
              })) || [],
              flavor_text_entries: move.flavor_text?.map((ft: any) => ({
                flavor_text: ft.flavor_text,
                language: { name: 'en' }
              })) || []
            };
            // Also update module-level cache
            moveDetailsCache[move.name] = newMoveDetails[move.name];
          }
        });
        setMoveDetails(newMoveDetails);

        // Process abilities
        const abilities = abilitiesData
          .filter((abilityData: any) => abilityData?.ability?.name)
          .map((abilityData: any) => abilityData.ability.name);

        setAvailableAbilities([...new Set(abilities)]);

        const abilityDescs: Record<string, string> = {};
        abilitiesData.forEach((abilityData: any) => {
          if (abilityData?.ability?.name) {
            const abilityName = abilityData.ability.name;
            const englishEntry = abilityData.ability.effect_entries?.find((entry: any) => entry?.language?.name === 'en');
            abilityDescs[abilityName] = englishEntry?.short_effect || englishEntry?.effect || 'No description available';
          }
        });
        setAbilityDescriptions(abilityDescs);

        // Process item descriptions
        const itemDescs: Record<string, string> = {};
        if (itemsData.length > 0) {
          itemsData.forEach((itemData: any) => {
            if (itemData?.name) {
              const itemName = itemData.name;
              const englishEntry = itemData.effect_entries?.find((entry: any) => entry?.language?.name === 'en');
              itemDescs[itemName] = englishEntry?.short_effect || englishEntry?.effect || 'Competitive battle item';
            }
          });
        } else {
          // Fallback items
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
            'air-balloon': 'Makes holder immune to Ground moves until popped'
          };
          Object.assign(itemDescs, fallbackDescriptions);
        }
        setItemDescriptions(itemDescs);

        // Set default ability
        setPokemonBuild(prev => ({
          ...prev,
          ability: prev.ability || abilities[0] || ''
        }));

        // Load saved build
        if (initialBuild) {
          setPokemonBuild(initialBuild);
          setSelectedMoves(initialBuild.moves || []);
        } else {
          const savedBuild = localStorage.getItem(`build_${teamId}_${pokemon.id}`);
          if (savedBuild) {
            const build = JSON.parse(savedBuild);
            setPokemonBuild(build);
            setSelectedMoves(build.moves || []);
          }
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

    if (onSave) {
      onSave(completeBuild);
    } else {
      // Fallback to localStorage for standalone usage
      localStorage.setItem(`build_${teamId}_${pokemon.id}`, JSON.stringify(completeBuild));
      toast.success(`Complete build saved for ${formatName(pokemon.name)}!`);
    }
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
  const handleIVChange = (stat: keyof PokemonBuild['ivs'], value: string) => {
    const newValue = validateAndFormatInput(value, 0, 31);
    setPokemonBuild(prev => ({
      ...prev,
      ivs: {
        ...prev.ivs,
        [stat]: newValue
      }
    }));
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
    // Check module-level cache first
    if (moveDetailsCache[moveName]) {
      if (!moveDetails[moveName]) {
        setMoveDetails(prev => ({ ...prev, [moveName]: moveDetailsCache[moveName] }));
      }
      return moveDetailsCache[moveName];
    }

    // Use api.service which now uses Supabase
    try {
      const moveData = await fetchMoveDetails(moveName);
      if (moveData) {
        const details: MoveDetails = {
          name: moveData.name,
          type: moveData.type,
          power: moveData.power,
          accuracy: moveData.accuracy,
          pp: moveData.pp,
          damage_class: moveData.damage_class,
          effect_entries: moveData.effect_entries || [],
          flavor_text_entries: moveData.flavor_text_entries || [],
          target: moveData.target,
          priority: moveData.priority
        };

        moveDetailsCache[moveName] = details;
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

  const filteredMoves = availableMoves.filter(move =>
    move.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryLabel = (cat: string) => {
    if (cat === 'physical') return 'Phys';
    if (cat === 'special') return 'Spec';
    return 'Stat';
  };

  const getCategoryClass = (cat: string) => {
    if (cat === 'physical') return 'sd-cat-icon--physical';
    if (cat === 'special') return 'sd-cat-icon--special';
    return 'sd-cat-icon--status';
  };

  const statBarClass = (stat: string) => {
    const map: Record<string, string> = {
      hp: 'sd-stat-bar--hp', attack: 'sd-stat-bar--atk', defense: 'sd-stat-bar--def',
      'special-attack': 'sd-stat-bar--spa', 'special-defense': 'sd-stat-bar--spd', speed: 'sd-stat-bar--spe',
    };
    return map[stat] || '';
  };

  const statLabelShort = (stat: string) => {
    const map: Record<string, string> = {
      hp: 'HP', attack: 'Atk', defense: 'Def',
      'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe',
    };
    return map[stat] || stat;
  };

  if (loading) {
    return (
      <div className="sd-panel" style={{ padding: 40, textAlign: 'center' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p style={{ marginTop: 12, color: '#666' }}>Loading moves...</p>
      </div>
    );
  }

  return (
    <>
      {/* Compact Build Summary Card */}
      <div className="sd-panel">
        {/* Action bar */}
        <div className="sd-actions" style={{ borderTop: 'none', borderBottom: '1px solid #ddd' }}>
          <button className="sd-action-btn" onClick={exportCurrentPokemon}>
            <Copy size={12} /> Copy
          </button>
          <button className="sd-action-btn" onClick={exportCurrentPokemon}>
            ⬆ Import/Export
          </button>
          <button className="sd-action-btn" onClick={handleSaveBuild} style={{ color: '#2a8c2a', fontWeight: 'bold' }}>
            <Save size={12} /> Save
          </button>
        </div>

        <div className="sd-build-card">
          {/* Sprite */}
          <div className="sd-build-sprite">
            <PokemonImage pokemonId={pokemon.id} alt={formatName(pokemon.name)} className="w-20 h-20" />
          </div>

          {/* Top row: Nickname/Details | Moves | Stats */}
          <div className="sd-build-top">
            <div>
              <div className="sd-field-group">
                <span className="sd-field-label">Nickname</span>
                <input
                  className="sd-field-input"
                  value={pokemonBuild.nickname}
                  onChange={(e) => setPokemonBuild(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder={formatName(pokemon.name)}
                />
              </div>
              <div className="sd-details-row" style={{ marginTop: 4 }}>
                <div><label>Level</label> <strong>100</strong></div>
                <div><label>Gender</label> <strong>{pokemonBuild.gender === 'male' ? '♂' : pokemonBuild.gender === 'female' ? '♀' : '—'}</strong></div>
                <div>
                  <label>Shiny</label>
                  <input
                    type="checkbox"
                    checked={pokemonBuild.isShiny}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, isShiny: e.target.checked }))}
                    style={{ marginLeft: 2 }}
                  />
                </div>
                <div>
                  <label>Tera Type</label>
                  <select
                    className="sd-field-select"
                    style={{ width: 'auto', marginLeft: 2 }}
                    value={pokemonBuild.teraType}
                    onChange={(e) => setPokemonBuild(prev => ({ ...prev, teraType: e.target.value }))}
                  >
                    <option value="">—</option>
                    {POKEMON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {/* Type badges */}
              <div style={{ marginTop: 4, display: 'flex', gap: 3 }}>
                {pokemon.types.map((type) => (
                  <span key={type.type.name} className="sd-type-badge" style={{ backgroundColor: getTypeColor(type.type.name) }}>
                    {type.type.name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="sd-field-group">
                <span className="sd-field-label">Moves</span>
                <div className="sd-moves-list">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="sd-move-slot">
                      <span className="sd-move-slot-input" style={{ background: selectedMoves[i] ? '#fff' : '#f8f8f8' }}>
                        {selectedMoves[i] ? formatMoveName(selectedMoves[i]) : ''}
                      </span>
                      {selectedMoves[i] && (
                        <button
                          className="sd-move-slot-remove"
                          onClick={() => handleRemoveMove(selectedMoves[i])}
                          title="Remove move"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="sd-stats-grid sd-stats-grid--with-ivs">
                <span></span>
                <span></span>
                <span className="sd-ev-header">EV</span>
                <span className="sd-iv-header">IV</span>
                {Object.entries(pokemonBuild.evs).map(([stat, value]) => (
                  <React.Fragment key={stat}>
                    <span className="sd-stat-label">{statLabelShort(stat)}</span>
                    <div className="sd-stat-bar-container">
                      <div
                        className={`sd-stat-bar ${statBarClass(stat)}`}
                        style={{ width: `${Math.min(100, (value / 252) * 100)}%` }}
                      />
                    </div>
                    <span className="sd-stat-value">{value || ''}</span>
                    <span className="sd-iv-value" style={{ color: pokemonBuild.ivs[stat as keyof PokemonBuild['ivs']] < 31 ? '#e53e3e' : '#888' }}>
                      {pokemonBuild.ivs[stat as keyof PokemonBuild['ivs']]}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row: Pokemon, Item, Ability */}
          <div className="sd-build-bottom">
            <div className="sd-field-group">
              <span className="sd-field-label">Pokémon</span>
              <span className="sd-field-input" style={{ background: '#f8f8f8', fontWeight: 'bold' }}>
                {formatName(pokemon.name)}
              </span>
            </div>
            <div className="sd-field-group">
              <span className="sd-field-label">Item</span>
              <select
                className="sd-field-select"
                value={pokemonBuild.heldItem}
                onChange={(e) => setPokemonBuild(prev => ({ ...prev, heldItem: e.target.value }))}
              >
                <option value="">None</option>
                {HELD_ITEMS.map((item) => (
                  <option key={item} value={item}>
                    {formatName(item)}
                    {itemDescriptions[item] && ` - ${itemDescriptions[item]}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="sd-field-group">
              <span className="sd-field-label">Ability</span>
              <select
                className="sd-field-select"
                value={pokemonBuild.ability}
                onChange={(e) => setPokemonBuild(prev => ({ ...prev, ability: e.target.value }))}
              >
                <option value="">Select</option>
                {availableAbilities.map((ability) => (
                  <option key={ability} value={ability}>
                    {formatName(ability)}
                    {abilityDescriptions[ability] && ` - ${abilityDescriptions[ability]}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Nature + Gender row */}
        <div style={{ padding: '4px 8px', borderTop: '1px solid #ddd', display: 'flex', gap: 12, alignItems: 'center', fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="sd-field-label">Nature</span>
            <select
              className="sd-field-select"
              style={{ width: 'auto' }}
              value={pokemonBuild.nature}
              onChange={(e) => setPokemonBuild(prev => ({ ...prev, nature: e.target.value }))}
            >
              {availableNatures.map((nature) => (
                <option key={nature.name} value={nature.name}>
                  {formatName(nature.name)} - {nature.description}
                </option>
              ))}
            </select>
          </div>
          {hasGenderDifference && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="sd-field-label">Gender</span>
              <select
                className="sd-field-select"
                style={{ width: 'auto' }}
                value={pokemonBuild.gender || ''}
                onChange={(e) => setPokemonBuild(prev => ({ ...prev, gender: e.target.value || null }))}
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          )}
        </div>

        {/* EVs / IVs Panel */}
        <div style={{ borderTop: '1px solid #ddd' }}>
          <div className="sd-eviv-row">
            <div className="sd-ev-panel" style={{ borderRight: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 'bold', color: '#555' }}>EVs ({totalEVs}/510)</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Object.entries(EV_PRESETS).slice(0, 4).map(([name, evs]) => (
                    <button
                      key={name}
                      className="sd-preset-btn"
                      onClick={() => setPokemonBuild(prev => ({ ...prev, evs }))}
                      title={name}
                    >
                      {name.replace(' Attacker', '').replace(' Wall', '')}
                    </button>
                  ))}
                </div>
              </div>
              {Object.entries(pokemonBuild.evs).map(([stat, value]) => (
                <div key={stat} className="sd-ev-row">
                  <label>{statLabelShort(stat)}</label>
                  <input
                    type="number"
                    min="0"
                    max="252"
                    value={value}
                    onChange={(e) => handleEVChange(stat as keyof PokemonBuild['evs'], e.target.value)}
                  />
                  <div className="sd-ev-bar-bg">
                    <div
                      className={`sd-stat-bar ${statBarClass(stat)}`}
                      style={{ width: `${Math.min(100, (value / 252) * 100)}%`, height: '100%', borderRadius: 2 }}
                    />
                  </div>
                </div>
              ))}
              <div className="sd-ev-total">
                {remainingEVs} remaining
                {remainingEVs === 0 && <span style={{ color: '#2a8c2a', marginLeft: 6 }}>✓ Fully trained</span>}
              </div>
            </div>

            {/* IVs Panel */}
            <div className="sd-ev-panel" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 'bold', color: '#555' }}>IVs</span>
                <button
                  className="sd-preset-btn"
                  onClick={() => setPokemonBuild(prev => ({
                    ...prev,
                    ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }
                  }))}
                >
                  Max All
                </button>
              </div>
              {Object.entries(pokemonBuild.ivs).map(([stat, value]) => (
                <div key={stat} className="sd-ev-row">
                  <label>{statLabelShort(stat)}</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={value}
                    onChange={(e) => handleIVChange(stat as keyof PokemonBuild['ivs'], e.target.value)}
                  />
                  <div className="sd-ev-bar-bg">
                    <div
                      className={`sd-stat-bar ${statBarClass(stat)}`}
                      style={{ width: `${Math.min(100, (value / 31) * 100)}%`, height: '100%', borderRadius: 2 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Moves Table */}
      <div className="sd-panel">
        <div className="sd-search-bar">
          <input
            className="sd-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search moves..."
          />
        </div>
        <div className="sd-section-header">
          Moves
        </div>
        <div className="sd-moves-scroll">
          <table className="sd-moves-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Cat</th>
                <th>Pow</th>
                <th>Acc</th>
                <th>PP</th>
                <th>Effect</th>
              </tr>
            </thead>
            <tbody>
              {filteredMoves.map((moveName) => {
                const move = moveDetails[moveName];
                const isSelected = selectedMoves.includes(moveName);
                return (
                  <tr
                    key={moveName}
                    className={isSelected ? 'sd-move-selected' : ''}
                    onClick={() => handleMoveToggle(moveName)}
                  >
                    <td className="sd-move-name">{formatMoveName(moveName)}</td>
                    <td>
                      {move && (
                        <span className="sd-type-badge" style={{ backgroundColor: getTypeColor(move.type.name) }}>
                          {move.type.name}
                        </span>
                      )}
                    </td>
                    <td>
                      {move && (
                        <span className={`sd-cat-icon ${getCategoryClass(move.damage_class.name)}`}>
                          {getCategoryLabel(move.damage_class.name)}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>{move?.power || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{move?.accuracy ? `${move.accuracy}%` : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{move?.pp || '—'}</td>
                    <td className="sd-move-effect">
                      {move?.flavor_text_entries?.find((e: any) => e.language.name === 'en')?.flavor_text?.replace(/\n/g, ' ') || ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// Error boundary wrapper for MovesetEditor component
const MovesetEditor: React.FC<MovesetEditorProps> = ({ pokemon, teamId, onBack, initialBuild, onSave }) => {
  try {
    return <MovesetEditorContent pokemon={pokemon} teamId={teamId} onBack={onBack} initialBuild={initialBuild} onSave={onSave} />;
  } catch (error) {
    console.error('MovesetEditor component error:', error);
    toast.error(`Error loading moveset editor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Moveset Editor</h1>
            <p className="text-gray-600 mb-4">
              Failed to load the moveset editor. Please try again.
            </p>
            <button
              onClick={onBack}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default MovesetEditor;
