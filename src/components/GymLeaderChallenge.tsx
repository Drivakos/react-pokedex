import React, { useState, useEffect } from 'react';
import { fetchCachedPokemonData, fetchCachedPokemonById } from '../services/cached-api';
import { fetchPokemonData, fetchPokemonById } from '../services/api';
import BattleSimulator from './BattleSimulator';

interface GymPokemon {
  id: number;
  name: string;
  types: string[];
  sprites: {
    front_default: string;
    back_default: string;
  };
  stats: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
  moves: Array<{
    name: string;
    type: string;
    power: number;
    accuracy: number;
    pp: number;
    currentPP: number;
    damageClass: 'physical' | 'special' | 'status';
    description: string;
  }>;
  level: number;
  currentHp: number;
  maxHp: number;
}

interface ChallengerTeam {
  pokemon: GymPokemon[];
  name: string;
}

type GymType = 'fire' | 'water' | 'grass' | 'electric' | 'psychic' | 'ice' | 'dragon' | 'dark' | 'steel' | 'fairy' | 'fighting' | 'poison' | 'ground' | 'flying' | 'bug' | 'rock' | 'ghost' | 'normal';

type GamePhase = 'type-selection' | 'pokemon-selection' | 'team-building' | 'battling' | 'team-expansion' | 'pokemon-select-for-battle' | 'game-over';



const CHALLENGER_NAMES = [
  'Ash', 'Misty', 'Brock', 'Gary', 'May', 'Dawn', 'Paul', 'Barry', 'Cynthia', 'Lance',
  'Red', 'Blue', 'Silver', 'Ethan', 'Lyra', 'Brendan', 'Lucas', 'Pearl', 'Cheren', 'Bianca'
];

const TYPE_COLORS: Record<string, string> = {
  fire: '#F08030', water: '#6890F0', grass: '#78C850', electric: '#F8D030',
  psychic: '#F85888', ice: '#98D8D8', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', bug: '#A8B820', rock: '#B8A038',
  ghost: '#705898', normal: '#A8A878'
};

const GymLeaderChallenge: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('type-selection');
  const [selectedType, setSelectedType] = useState<GymType | null>(null);
  const [availablePokemon, setAvailablePokemon] = useState<any[]>([]);
  const [gymTeam, setGymTeam] = useState<GymPokemon[]>([]);
  const [currentChallenger, setCurrentChallenger] = useState<ChallengerTeam | null>(null);
  const [battleWins, setBattleWins] = useState<number>(0);
  const [isInBattle, setIsInBattle] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [allPokemon, setAllPokemon] = useState<any[]>([]);
  const [selectedBattlePokemon, setSelectedBattlePokemon] = useState<GymPokemon | null>(null);
  const [pokemonToReplace, setPokemonToReplace] = useState<GymPokemon | null>(null);
  const [comingFromLoss, setComingFromLoss] = useState<boolean>(false);

  // Generate a smart moveset for a Pokemon
  const generateMoveset = (pokemon: any, isRandomized: boolean = false) => {
    const pokemonMoves = pokemon.moves || [];
    const pokemonTypes = pokemon.types || ['normal'];
    
    // Create a pool of potential moves
    const movePool = [];
    
    // Add moves from Pokemon's actual moveset if available
    if (pokemonMoves.length > 0) {
      pokemonMoves.forEach((move: string) => {
        const moveName = move.replace(/-/g, ' ');
        movePool.push({
          name: move,
          type: pokemonTypes[0], // Default to first type
          power: getMovePowerByName(move),
          accuracy: 100,
          pp: getMovePPByName(move),
          damageClass: getMovePowerByName(move) > 0 ? 'physical' as const : 'status' as const,
          description: `${moveName} - A ${pokemonTypes[0]} type move`
        });
      });
    }
    
    // Add type-specific moves to ensure good coverage
    pokemonTypes.forEach(type => {
      movePool.push({
        name: `${type}-blast`,
        type: type,
        power: 90,
        accuracy: 100,
        pp: 15,
        damageClass: 'special' as const,
        description: `A powerful ${type} type attack`
      });
      
      movePool.push({
        name: `${type}-strike`,
        type: type,
        power: 70,
        accuracy: 100,
        pp: 20,
        damageClass: 'physical' as const,
        description: `A ${type} type physical attack`
      });
    });
    
    // Add some universal moves
    movePool.push(
      { name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, damageClass: 'physical' as const, description: 'A basic physical attack' },
      { name: 'quick-attack', type: 'normal', power: 40, accuracy: 100, pp: 30, damageClass: 'physical' as const, description: 'A priority attack' },
      { name: 'rest', type: 'psychic', power: 0, accuracy: 100, pp: 10, damageClass: 'status' as const, description: 'Restores HP completely and causes sleep' },
      { name: 'protect', type: 'normal', power: 0, accuracy: 100, pp: 10, damageClass: 'status' as const, description: 'Protects from attacks this turn' },
      { name: 'growl', type: 'normal', power: 0, accuracy: 100, pp: 40, damageClass: 'status' as const, description: 'Lowers the target\'s Attack' },
      { name: 'swords-dance', type: 'normal', power: 0, accuracy: 100, pp: 20, damageClass: 'status' as const, description: 'Sharply raises user\'s Attack' },
      { name: 'thunder-wave', type: 'electric', power: 0, accuracy: 90, pp: 20, damageClass: 'status' as const, description: 'Paralyzes the target' },
      { name: 'toxic', type: 'poison', power: 0, accuracy: 90, pp: 10, damageClass: 'status' as const, description: 'Badly poisons the target' },
      { name: 'will-o-wisp', type: 'fire', power: 0, accuracy: 85, pp: 15, damageClass: 'status' as const, description: 'Burns the target' },
      { name: 'recover', type: 'normal', power: 0, accuracy: 100, pp: 10, damageClass: 'status' as const, description: 'Restores 50% of max HP' }
    );
    
    // Shuffle and pick 4 moves, ensuring at least 2 attacking moves
    const shuffled = [...movePool].sort(() => Math.random() - 0.5);
    const attackingMoves = shuffled.filter(move => move.power > 0);
    const statusMoves = shuffled.filter(move => move.power === 0);
    
    const selectedMoves = [];
    
    // Ensure at least 2 attacking moves
    selectedMoves.push(...attackingMoves.slice(0, 3));
    
    // Add 1 status move if available
    if (statusMoves.length > 0) {
      selectedMoves.push(statusMoves[0]);
    } else if (attackingMoves.length > 3) {
      selectedMoves.push(attackingMoves[3]);
    }
    
    // Fill up to 4 moves
    while (selectedMoves.length < 4 && shuffled.length > selectedMoves.length) {
      const nextMove = shuffled.find(move => !selectedMoves.some(sm => sm.name === move.name));
      if (nextMove) selectedMoves.push(nextMove);
      else break;
    }
    
    // Add currentPP to each move
    return selectedMoves.slice(0, 4).map(move => ({
      ...move,
      currentPP: move.pp
    }));
  };
  
  // Helper functions for move data
  const getMovePowerByName = (moveName: string): number => {
    const powerMap: Record<string, number> = {
      'tackle': 40, 'scratch': 35, 'pound': 40, 'quick-attack': 40,
      'thunderbolt': 90, 'thunder': 110, 'thunder-shock': 40,
      'flamethrower': 90, 'fire-blast': 110, 'ember': 40,
      'surf': 90, 'hydro-pump': 110, 'water-gun': 40,
      'solar-beam': 120, 'petal-dance': 120, 'vine-whip': 45,
      'psychic': 90, 'confusion': 50, 'psybeam': 65,
      'ice-beam': 90, 'blizzard': 110, 'powder-snow': 40,
      'earthquake': 100, 'rock-slide': 75, 'stone-edge': 100,
      'aerial-ace': 60, 'air-slash': 75, 'fly': 90,
      'shadow-ball': 80, 'night-shade': 1, 'dark-pulse': 80,
      'iron-tail': 100, 'steel-wing': 70, 'metal-claw': 50,
      'moonblast': 95, 'dazzling-gleam': 80, 'play-rough': 90,
      'close-combat': 120, 'brick-break': 75, 'karate-chop': 50,
      'poison-jab': 80, 'sludge-bomb': 90, 'acid': 40,
      'bug-bite': 60, 'x-scissor': 80, 'pin-missile': 25
    };
    return powerMap[moveName] || (moveName.includes('blast') ? 90 : moveName.includes('strike') ? 70 : 60);
  };
  
  const getMovePPByName = (moveName: string): number => {
    const ppMap: Record<string, number> = {
      'tackle': 35, 'scratch': 35, 'pound': 35,
      'thunderbolt': 15, 'flamethrower': 15, 'surf': 15, 'psychic': 10,
      'earthquake': 10, 'blizzard': 5, 'fire-blast': 5, 'hydro-pump': 5,
      'solar-beam': 10, 'close-combat': 5, 'rest': 10, 'protect': 10
    };
    return ppMap[moveName] || 15;
  };

  // Create a gym Pokemon with stats and moves
  const createGymPokemon = (basePokemon: any, level: number, isRandomized: boolean = false): GymPokemon => {
    const baseStats = basePokemon.stats || {
      hp: 100, attack: 80, defense: 80,
      'special-attack': 80, 'special-defense': 80, speed: 80
    };

    // Calculate max HP
    const maxHp = Math.floor(((baseStats.hp * 2) * level) / 100) + level + 10;

    // Generate moves based on Pokemon's actual moveset
    const moves = generateMoveset(basePokemon, isRandomized);

    return {
      id: basePokemon.id,
      name: basePokemon.name,
      types: basePokemon.types || ['normal'],
      sprites: {
        front_default: basePokemon.sprites?.other?.['official-artwork']?.front_default || basePokemon.sprites?.front_default || '',
        back_default: basePokemon.sprites?.back_default || basePokemon.sprites?.front_default || ''
      },
      stats: baseStats,
      moves,
      level,
      currentHp: maxHp,
      maxHp: maxHp
    };
  };

  // Generate random challenger team
  const generateChallenger = (): ChallengerTeam => {
    const teamSize = Math.min(1 + Math.floor(battleWins / 3), 4); // Progressively larger teams
    const challengerName = CHALLENGER_NAMES[Math.floor(Math.random() * CHALLENGER_NAMES.length)];
    const team: GymPokemon[] = [];

    if (!allPokemon || allPokemon.length === 0) {
      console.warn('No Pokemon data available for challenger team generation');
      return { pokemon: team, name: challengerName };
    }

    // Get random types for diversity
    const availableTypes = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
    
    for (let i = 0; i < teamSize; i++) {
      // Get random type for this Pokemon
      const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      
      // Get random Pokemon of that type
      const randomTypePokemon = getRandomPokemonOfType(randomType, 50); // Get up to 50 options
      
      let selectedPokemon;
      if (randomTypePokemon.length > 0) {
        selectedPokemon = randomTypePokemon[Math.floor(Math.random() * randomTypePokemon.length)];
      } else {
        // Fallback to any random Pokemon if no Pokemon of that type found
        selectedPokemon = allPokemon[Math.floor(Math.random() * allPokemon.length)];
      }
      
      if (selectedPokemon) {
        // Challenger Pokemon levels scale with battle wins
        const level = Math.max(15, Math.min(60, 25 + battleWins * 3 + Math.floor(Math.random() * 15)));
        team.push(createGymPokemon(selectedPokemon, level, true));
      }
    }

    console.log(`Generated challenger ${challengerName} with ${team.length} Pokemon (battle #${battleWins + 1}):`, 
      team.map(p => `${p.name} (Lv.${p.level}, ${p.types.join('/')})`));

    return { pokemon: team, name: challengerName };
  };

  // Load Pokemon data on component mount
  useEffect(() => {
    const loadRequiredPokemon = async () => {
      setLoading(true);
      try {
        // Try to fetch from cached API first, fall back to direct API
        let pokemonData = [];
        
        try {
          // Fetch first 200 Pokemon using cached API (covers all we need)
          pokemonData = await fetchCachedPokemonData(200, 0, '', {
            types: [],
            moves: [],
            generation: '',
            weight: { min: 0, max: 0 },
            height: { min: 0, max: 0 },
            hasEvolutions: null,
          });
          console.log('Successfully fetched Pokemon from cached API');
        } catch (cachedError) {
          console.warn('Cached API not available, using direct API:', cachedError);
          // Fallback to direct API - fetch in smaller batches to avoid rate limits
          pokemonData = await fetchPokemonData(200, 0, '', {
            types: [],
            moves: [],
            generation: '',
            weight: { min: 0, max: 0 },
            height: { min: 0, max: 0 },
            hasEvolutions: null,
          });
        }
        
        setAllPokemon(pokemonData);
      } catch (error) {
        console.error('Error loading Pokemon data:', error);
        // If both fail, create minimal fallback data for testing
        setAllPokemon([]);
      } finally {
        setLoading(false);
      }
    };

    loadRequiredPokemon();
  }, []);

  // Get random Pokemon of selected type
  const getRandomPokemonOfType = (type: string, count: number = 3) => {
    if (!allPokemon || allPokemon.length === 0) return [];
    
    // Filter Pokemon that have the selected type (primary or secondary)
    const typePokemon = allPokemon.filter(pokemon => 
      pokemon.types && pokemon.types.includes(type)
    );
    
    if (typePokemon.length === 0) return [];
    
    // Shuffle the array and take the requested count
    const shuffled = [...typePokemon].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  };

  // Load available Pokemon for selected type
  useEffect(() => {
    if (selectedType && allPokemon && allPokemon.length > 0) {
      const available = getRandomPokemonOfType(selectedType, 3);
      setAvailablePokemon(available);
      console.log(`Found ${available.length} ${selectedType} type Pokemon:`, available.map(p => p.name));
    }
  }, [selectedType, allPokemon]);

  const handleTypeSelection = (type: GymType) => {
    setSelectedType(type);
    setComingFromLoss(false);
    const options = getRandomPokemonOfType(type, 3);
    setAvailablePokemon(options);
    setGamePhase('pokemon-selection');
  };

  const handlePokemonSelection = (pokemon: any) => {
    const gymPokemon = createGymPokemon(pokemon, 50);
    setGymTeam([gymPokemon]);
    setGamePhase('pokemon-select-for-battle');
  };

  const startNewBattle = () => {
    const challenger = generateChallenger();
    setCurrentChallenger(challenger);
    setIsInBattle(true);
  };

  const handleBattleComplete = (won: boolean) => {
    setIsInBattle(false);
    
    if (won) {
      setBattleWins(prev => prev + 1);
      setComingFromLoss(false);
      
      // After every win, allow team expansion or swapping
      setGamePhase('team-expansion');
    } else {
      // Check if there are still Pokemon with HP > 0
      const availablePokemon = gymTeam.filter(p => p.currentHp > 0);
      
      if (availablePokemon.length > 0) {
        // Still have Pokemon left, let user choose next one
        setComingFromLoss(true);
        setGamePhase('pokemon-select-for-battle');
      } else {
        // All Pokemon fainted, game over
        setGamePhase('game-over');
      }
    }
  };

  const handleBattlePokemonSelection = (pokemon: GymPokemon) => {
    setSelectedBattlePokemon(pokemon);
    setComingFromLoss(false);
    setGamePhase('battling');
    startNewBattle();
  };

  const handlePokemonSwitch = (newPokemon: any) => {
    // Find the Pokemon in the gym team and update the selected battle Pokemon
    const teamPokemon = gymTeam.find(p => p.id === newPokemon.id);
    if (teamPokemon) {
      setSelectedBattlePokemon(teamPokemon);
    }
  };

  const handleTeamExpansion = (pokemon: any) => {
    const newGymPokemon = createGymPokemon(pokemon, 50);
    
    if (pokemonToReplace) {
      // Replace the selected Pokemon
      setGymTeam(prev => prev.map(p => p.id === pokemonToReplace.id ? newGymPokemon : p));
      setPokemonToReplace(null);
    } else {
      // Add new Pokemon to team
      setGymTeam(prev => [...prev, newGymPokemon]);
    }
    
    setGamePhase('pokemon-select-for-battle');
  };

  const handlePokemonReplacement = (pokemonToReplace: GymPokemon) => {
    setPokemonToReplace(pokemonToReplace);
    // Stay in team-expansion phase but now in replacement mode
  };

  if (loading || !allPokemon || allPokemon.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading Pokémon data...</div>
      </div>
    );
  }

  // Battle phase
  if (isInBattle && currentChallenger && selectedBattlePokemon) {
    return (
      <div className="fixed inset-0 z-50">
        <BattleSimulator
          playerPokemon={selectedBattlePokemon}
          opponentPokemon={currentChallenger.pokemon[0]} // Use first Pokemon of challenger
          onBack={() => handleBattleComplete(false)} // Forfeit = loss
          onBattleEnd={(playerWon) => handleBattleComplete(playerWon)}
          playerTeam={gymTeam}
          onSwitchPokemon={handlePokemonSwitch}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Gym Leader Challenge</h1>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Exit Challenge
            </button>
          </div>
          {battleWins > 0 && (
            <div className="mt-2 text-lg font-semibold text-green-600">
              Victories: {battleWins} | Team Size: {gymTeam.length}/6
            </div>
          )}
        </div>

        {/* Type Selection Phase */}
        {gamePhase === 'type-selection' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Choose Your Gym Type</h2>
            <p className="text-gray-600 mb-6">
              Select the type specialization for your gym. You'll get 3 strong Pokémon options to choose from.
            </p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {(['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'steel', 'fairy', 'fighting', 'poison', 'ground', 'flying', 'bug', 'rock', 'ghost', 'normal'] as GymType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelection(type as GymType)}
                  className="p-4 rounded-lg border-2 border-gray-300 hover:border-gray-500 transition-colors"
                  style={{ backgroundColor: TYPE_COLORS[type] + '20' }}
                >
                  <div className="text-center">
                    <div 
                      className="w-8 h-8 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: TYPE_COLORS[type] }}
                    ></div>
                    <div className="font-bold capitalize text-sm">{type}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pokemon Selection Phase */}
        {gamePhase === 'pokemon-selection' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Choose Your Ace Pokémon</h2>
              <button
                onClick={() => {
                  const newOptions = getRandomPokemonOfType(selectedType!, 3);
                  setAvailablePokemon(newOptions);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                🎲 Get New Options
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Select your starter Pokémon for the {selectedType} type gym. Don't like these options? Click "Get New Options" for different choices!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {availablePokemon.map((pokemon) => (
                <div
                  key={pokemon.id}
                  className="border-2 border-gray-300 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                  onClick={() => handlePokemonSelection(pokemon)}
                >
                  <img
                    src={pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default}
                    alt={pokemon.name}
                    className="w-32 h-32 mx-auto mb-4 object-contain"
                  />
                  <h3 className="text-xl font-bold text-center capitalize">{pokemon.name}</h3>
                  <div className="flex justify-center gap-2 mt-2">
                    {pokemon.types?.map((type: string) => (
                      <span
                        key={type}
                        className="px-2 py-1 rounded text-white text-xs font-bold"
                        style={{ backgroundColor: TYPE_COLORS[type] }}
                      >
                        {type.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pokemon Selection for Battle */}
        {gamePhase === 'pokemon-select-for-battle' && (
          <div className={`${comingFromLoss ? 'bg-red-50 border-2 border-red-200' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <h2 className={`text-2xl font-bold mb-4 ${comingFromLoss ? 'text-red-700' : ''}`}>
              {comingFromLoss ? 'Pokemon Defeated!' : 'Choose Your Pokemon for Battle'}
            </h2>
            <p className="text-gray-600 mb-6">
              {comingFromLoss ? 
                "Your Pokemon was defeated! Choose your next Pokemon to continue the challenge:" :
                "Select which Pokemon from your gym team will fight:"
              }
            </p>
            
            {/* Debug info */}
            <div className="mb-4 p-2 bg-gray-100 text-sm">
              <div>Gym Team Size: {gymTeam.length}</div>
              <div>Available Pokemon: {gymTeam.filter(p => p.currentHp > 0).length}</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {gymTeam.length === 0 ? (
                <div className="col-span-full text-center text-gray-500">
                  No Pokemon in your gym team. This might be a bug.
                </div>
              ) : gymTeam.filter(p => p.currentHp > 0).length === 0 ? (
                <div className="col-span-full text-center text-gray-500">
                  All your Pokemon have fainted!
                </div>
              ) : (
                gymTeam.filter(p => p.currentHp > 0).map((pokemon) => (
                  <div
                    key={pokemon.id}
                    className="border-2 border-gray-300 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                    onClick={() => handleBattlePokemonSelection(pokemon)}
                  >
                    {pokemon.sprites?.front_default ? (
                      <img
                        src={pokemon.sprites.front_default}
                        alt={pokemon.name}
                        className="w-32 h-32 mx-auto mb-4 object-contain"
                        onError={(e) => {
                          console.log('Failed to load sprite for', pokemon.name, pokemon.sprites.front_default);
                          (e.target as HTMLImageElement).src = '/images/pokedex.svg';
                        }}
                      />
                    ) : (
                      <div className="w-32 h-32 mx-auto mb-4 bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-xs">No Image</span>
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-center capitalize">{pokemon.name}</h3>
                    <div className="text-center mt-2">
                      <div className="text-sm text-gray-600">Level {pokemon.level}</div>
                      <div className="text-sm font-semibold">HP: {pokemon.currentHp}/{pokemon.maxHp}</div>
                    </div>
                    <div className="flex justify-center gap-2 mt-2">
                      {pokemon.types?.map((type: string) => (
                        <span
                          key={type}
                          className="px-2 py-1 rounded text-white text-xs font-bold"
                          style={{ backgroundColor: TYPE_COLORS[type] }}
                        >
                          {type.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Team Expansion Phase */}
        {gamePhase === 'team-expansion' && selectedType && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {gymTeam.length < 6 ? 'Expand Your Team!' : pokemonToReplace ? 'Replace Pokemon' : 'Team Management'}
              </h2>
              <div className="flex gap-2">
                {pokemonToReplace && (
                  <button
                    onClick={() => setPokemonToReplace(null)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    Cancel Replacement
                  </button>
                )}
                <button
                  onClick={() => {
                    // Trigger a re-render to get new random Pokemon
                    setGamePhase('team-expansion');
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                >
                  🎲 Get New Options
                </button>
                {gymTeam.length === 6 && !pokemonToReplace && (
                  <button
                    onClick={() => setGamePhase('pokemon-select-for-battle')}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    Skip & Continue
                  </button>
                )}
              </div>
            </div>
            
            {pokemonToReplace ? (
              <p className="text-gray-600 mb-6">
                You're replacing <strong>{pokemonToReplace.name}</strong>. Choose a new {selectedType} type Pokémon:
              </p>
            ) : gymTeam.length < 6 ? (
              <p className="text-gray-600 mb-6">
                Great job! Choose a new {selectedType} type Pokémon to add to your gym team:
              </p>
            ) : (
              <p className="text-gray-600 mb-6">
                Your team is full! You can replace a Pokemon or skip to continue battling:
              </p>
            )}
            
            {/* New Pokemon Options */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">Available {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Pokemon:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(() => {
                  // Get random Pokemon of the selected type, excluding those already in team
                  const typeOptions = getRandomPokemonOfType(selectedType, 20);
                  const availableOptions = typeOptions.filter(p => !gymTeam.some(gp => gp.id === p.id));
                  return availableOptions.slice(0, 3).map((pokemon) => (
                  <div
                    key={pokemon.id}
                    className="border-2 border-gray-300 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                    onClick={() => handleTeamExpansion(pokemon)}
                  >
                    <img
                      src={pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default}
                      alt={pokemon.name}
                      className="w-32 h-32 mx-auto mb-4 object-contain"
                    />
                    <h3 className="text-xl font-bold text-center capitalize">{pokemon.name}</h3>
                    <div className="flex justify-center gap-2 mt-2">
                      {pokemon.types?.map((type: string) => (
                        <span
                          key={type}
                          className="px-2 py-1 rounded text-white text-xs font-bold"
                          style={{ backgroundColor: TYPE_COLORS[type] }}
                        >
                          {type.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  ));
                })()}
              </div>
            </div>
            
            {/* Current Team (when team is full) */}
            {gymTeam.length === 6 && !pokemonToReplace && (
              <div>
                <h3 className="text-xl font-bold mb-4">Your Current Team (Click to Replace):</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {gymTeam.map((pokemon) => (
                    <div
                      key={pokemon.id}
                      className="border-2 border-red-300 rounded-lg p-4 hover:border-red-500 cursor-pointer transition-colors bg-red-50"
                      onClick={() => handlePokemonReplacement(pokemon)}
                    >
                      <img
                        src={pokemon.sprites?.front_default}
                        alt={pokemon.name}
                        className="w-32 h-32 mx-auto mb-4 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/pokedex.svg';
                        }}
                      />
                      <h3 className="text-xl font-bold text-center capitalize">{pokemon.name}</h3>
                      <div className="text-center mt-2">
                        <div className="text-sm text-gray-600">Level {pokemon.level}</div>
                        <div className="text-sm font-semibold">HP: {pokemon.currentHp}/{pokemon.maxHp}</div>
                      </div>
                      <div className="flex justify-center gap-2 mt-2">
                        {pokemon.types?.map((type: string) => (
                          <span
                            key={type}
                            className="px-2 py-1 rounded text-white text-xs font-bold"
                            style={{ backgroundColor: TYPE_COLORS[type] }}
                          >
                            {type.toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <div className="text-center mt-2">
                        <span className="text-xs text-red-600 font-semibold">Click to Replace</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game Over Phase */}
        {gamePhase === 'game-over' && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-3xl font-bold mb-4 text-red-600">Challenge Complete!</h2>
            <p className="text-xl mb-6">
              You defended your gym for {battleWins} victories with a team of {gymTeam.length} Pokémon!
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setGamePhase('type-selection');
                  setSelectedType(null);
                  setGymTeam([]);
                  setBattleWins(0);
                  setComingFromLoss(false);
                  setPokemonToReplace(null);
                }}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Return to Pokédex
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GymLeaderChallenge; 