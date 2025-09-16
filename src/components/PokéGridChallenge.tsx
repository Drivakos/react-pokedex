import React, { useState, useEffect, useCallback } from 'react';
import { usePokemon } from '../hooks/usePokemon';
import { Pokemon } from '../types/pokemon';
import { 
  GameGrid, 
  GameStats, 
  GameControls, 
  PokemonSearchModal, 
  ShareResultsModal,
  GridCellData,
  GridConstraint
} from './pokegrid';

// Enhanced constraint types for authentic PokéGrid experience
export type ConstraintType = 
  | 'type' 
  | 'generation' 
  | 'evolution-stage'
  | 'stat-range'
  | 'height-weight'
  | 'move-category'
  | 'type-effectiveness'
  | 'type-count';

// Extend the imported GridCellData with additional properties for game logic
export interface GridCell extends GridCellData {
  rowConstraint: GridConstraint;
  colConstraint: GridConstraint;
}

export interface GridGame {
  id: string;
  date: string;
  size: 3;
  cells: GridCell[];
  constraints: {
    rows: GridConstraint[];
    cols: GridConstraint[];
  };
  score: number;
  completed: boolean;
  perfectGame: boolean;
  startTime: Date;
  endTime?: Date;
  totalGuesses: number;
  correctGuesses: number;
  streak: number;
}

const PokéGridChallenge: React.FC = () => {
  const { displayedPokemon, loading } = usePokemon();
  const [currentGame, setCurrentGame] = useState<GridGame | null>(null);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pokemon[]>([]);
  const [gameMode, setGameMode] = useState<'daily' | 'endless'>('daily');
  const [showStats, setShowStats] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Game constants
  const MAX_TOTAL_GUESSES = 3;

  // Authentic PokéGrid constraint definitions
  // ROWS: Always Pokémon Types with SVG Icons
  const typeConstraints: GridConstraint[] = [
    { id: 'fire-type', type: 'type', value: 'fire', label: 'Fire', description: 'Fire-type Pokémon', icon: '', svgIcon: '/icons/types/fire.svg' },
    { id: 'water-type', type: 'type', value: 'water', label: 'Water', description: 'Water-type Pokémon', icon: '', svgIcon: '/icons/types/water.svg' },
    { id: 'grass-type', type: 'type', value: 'grass', label: 'Grass', description: 'Grass-type Pokémon', icon: '', svgIcon: '/icons/types/grass.svg' },
    { id: 'electric-type', type: 'type', value: 'electric', label: 'Electric', description: 'Electric-type Pokémon', icon: '', svgIcon: '/icons/types/electric.svg' },
    { id: 'psychic-type', type: 'type', value: 'psychic', label: 'Psychic', description: 'Psychic-type Pokémon', icon: '', svgIcon: '/icons/types/psychic.svg' },
    { id: 'ice-type', type: 'type', value: 'ice', label: 'Ice', description: 'Ice-type Pokémon', icon: '', svgIcon: '/icons/types/ice.svg' },
    { id: 'dragon-type', type: 'type', value: 'dragon', label: 'Dragon', description: 'Dragon-type Pokémon', icon: '', svgIcon: '/icons/types/dragon.svg' },
    { id: 'flying-type', type: 'type', value: 'flying', label: 'Flying', description: 'Flying-type Pokémon', icon: '', svgIcon: '/icons/types/flying.svg' },
    { id: 'normal-type', type: 'type', value: 'normal', label: 'Normal', description: 'Normal-type Pokémon', icon: '', svgIcon: '/icons/types/normal.svg' },
    { id: 'fighting-type', type: 'type', value: 'fighting', label: 'Fighting', description: 'Fighting-type Pokémon', icon: '', svgIcon: '/icons/types/fighting.svg' },
    { id: 'poison-type', type: 'type', value: 'poison', label: 'Poison', description: 'Poison-type Pokémon', icon: '', svgIcon: '/icons/types/poison.svg' },
    { id: 'ground-type', type: 'type', value: 'ground', label: 'Ground', description: 'Ground-type Pokémon', icon: '', svgIcon: '/icons/types/ground.svg' },
    { id: 'rock-type', type: 'type', value: 'rock', label: 'Rock', description: 'Rock-type Pokémon', icon: '', svgIcon: '/icons/types/rock.svg' },
    { id: 'bug-type', type: 'type', value: 'bug', label: 'Bug', description: 'Bug-type Pokémon', icon: '', svgIcon: '/icons/types/bug.svg' },
    { id: 'ghost-type', type: 'type', value: 'ghost', label: 'Ghost', description: 'Ghost-type Pokémon', icon: '', svgIcon: '/icons/types/ghost.svg' },
    { id: 'steel-type', type: 'type', value: 'steel', label: 'Steel', description: 'Steel-type Pokémon', icon: '', svgIcon: '/icons/types/steel.svg' },
    { id: 'dark-type', type: 'type', value: 'dark', label: 'Dark', description: 'Dark-type Pokémon', icon: '', svgIcon: '/icons/types/dark.svg' },
    { id: 'fairy-type', type: 'type', value: 'fairy', label: 'Fairy', description: 'Fairy-type Pokémon', icon: '', svgIcon: '/icons/types/fairy.svg' },
  ];

  // COLUMNS: Various other constraints
  const otherConstraints: GridConstraint[] = [
    // Move-based constraints
    { id: 'learns-brave-bird', type: 'move-category', value: 'brave-bird', label: 'Can Learn\nBrave Bird', description: 'Can learn Brave Bird', icon: 'BB' },
    { id: 'learns-earthquake', type: 'move-category', value: 'earthquake', label: 'Can Learn\nEarthquake', description: 'Can learn Earthquake', icon: 'EQ' },
    { id: 'learns-surf', type: 'move-category', value: 'surf', label: 'Can Learn\nSurf', description: 'Can learn Surf', icon: 'SF' },
    { id: 'learns-flamethrower', type: 'move-category', value: 'flamethrower', label: 'Can Learn\nFlamethrower', description: 'Can learn Flamethrower', icon: 'FT' },
    
    // Type effectiveness constraints
    { id: 'neutral-electric', type: 'type-effectiveness', value: 'neutral-electric', label: 'Neutral to\nElectric', description: 'Takes neutral damage from Electric', icon: '1x' },
    { id: 'weak-ice', type: 'type-effectiveness', value: 'weak-ice', label: 'Weak to\nIce', description: 'Takes super effective damage from Ice', icon: '2x' },
    { id: 'resist-fire', type: 'type-effectiveness', value: 'resist-fire', label: 'Resists\nFire', description: 'Takes reduced damage from Fire', icon: '½x' },
    { id: 'weak-rock', type: 'type-effectiveness', value: 'weak-rock', label: 'Weak to\nRock', description: 'Takes super effective damage from Rock', icon: '2x' },
    
    // Generation/Region constraints
    { id: 'gen-1-kanto', type: 'generation', value: '1', label: 'Gen I\nKanto', description: 'Generation I Pokémon', icon: 'I' },
    { id: 'gen-2-johto', type: 'generation', value: '2', label: 'Gen II\nJohto', description: 'Generation II Pokémon', icon: 'II' },
    { id: 'gen-3-hoenn', type: 'generation', value: '3', label: 'Gen III\nHoenn', description: 'Generation III Pokémon', icon: 'III' },
    { id: 'gen-4-sinnoh', type: 'generation', value: '4', label: 'Gen IV\nSinnoh', description: 'Generation IV Pokémon', icon: 'IV' },
    
    // Type count constraints
    { id: 'mono-type', type: 'type-count', value: 'mono', label: 'Mono-Type', description: 'Has only one type', icon: '1' },
    { id: 'dual-type', type: 'type-count', value: 'dual', label: 'Dual-Type', description: 'Has two types', icon: '2' },
    
    // Evolution constraints
    { id: 'no-evo-line', type: 'evolution-stage', value: 'no-evolution', label: 'No Evolution\nLine', description: 'Standalone Pokémon', icon: '◯' },
    { id: 'first-evo', type: 'evolution-stage', value: 'first-stage', label: 'First\nEvolution', description: 'First stage that can evolve', icon: '①' },
    { id: 'final-evo', type: 'evolution-stage', value: 'final-stage', label: 'Final\nEvolution', description: 'Final evolution stage', icon: '③' },
    
    // Stat-based constraints
    { id: 'high-hp', type: 'stat-range', value: 'hp-100', label: 'High HP\n(≥100)', description: 'HP stat 100 or higher', icon: 'HP' },
    { id: 'high-attack', type: 'stat-range', value: 'attack-100', label: 'High Attack\n(≥100)', description: 'Attack stat 100 or higher', icon: 'ATK' },
    { id: 'high-speed', type: 'stat-range', value: 'speed-100', label: 'High Speed\n(≥100)', description: 'Speed stat 100 or higher', icon: 'SPD' },
  ];

  // Get today's date seed for daily puzzles
  const getTodaySeed = (): number => {
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateString.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  };

  // Seeded random function for consistent daily grids
  const seededRandom = (seed: number, index: number = 0) => {
    const x = Math.sin(seed + index * 0.618033988749) * 10000;
    return x - Math.floor(x);
  };

  // Check if Pokemon satisfies constraint (authentic PokéGrid logic)
  const checkConstraint = (pokemon: Pokemon, constraint: GridConstraint): boolean => {
    switch (constraint.type) {
      case 'type':
        return pokemon.types.includes(constraint.value as string);

      case 'generation':
        return pokemon.generation === constraint.value;

      case 'move-category':
        // Move learning logic (simplified - would need move data for perfect accuracy)
        if (constraint.value === 'brave-bird') {
          return pokemon.types.includes('flying') || pokemon.types.includes('normal');
        }
        if (constraint.value === 'earthquake') {
          return pokemon.types.includes('ground') || pokemon.types.includes('rock') || 
                 pokemon.types.includes('fighting') || pokemon.base_experience > 150;
        }
        if (constraint.value === 'surf') {
          return pokemon.types.includes('water') || pokemon.types.includes('psychic');
        }
        if (constraint.value === 'flamethrower') {
          return pokemon.types.includes('fire') || pokemon.types.includes('dragon');
        }
        return false;

      case 'type-effectiveness':
        // Type effectiveness logic
        if (constraint.value === 'neutral-electric') {
          return !pokemon.types.includes('flying') && !pokemon.types.includes('water') && 
                 !pokemon.types.includes('ground') && !pokemon.types.includes('grass');
        }
        if (constraint.value === 'weak-ice') {
          return pokemon.types.includes('flying') || pokemon.types.includes('ground') || 
                 pokemon.types.includes('grass') || pokemon.types.includes('dragon');
        }
        if (constraint.value === 'resist-fire') {
          return pokemon.types.includes('fire') || pokemon.types.includes('water') || 
                 pokemon.types.includes('rock') || pokemon.types.includes('dragon');
        }
        if (constraint.value === 'weak-rock') {
          return pokemon.types.includes('flying') || pokemon.types.includes('bug') || 
                 pokemon.types.includes('fire') || pokemon.types.includes('ice');
        }
        return false;

      case 'type-count':
        if (constraint.value === 'mono') return pokemon.types.length === 1;
        if (constraint.value === 'dual') return pokemon.types.length === 2;
        return false;

      case 'evolution-stage':
        if (constraint.value === 'no-evolution') return !pokemon.has_evolutions && pokemon.base_experience < 120;
        if (constraint.value === 'first-stage') return pokemon.has_evolutions && pokemon.base_experience < 100;
        if (constraint.value === 'final-stage') return pokemon.base_experience > 200;
        return false;

      case 'stat-range':
        // Using base_experience as a proxy for stats
        const baseExp = pokemon.base_experience;
        if (constraint.value === 'hp-100') return baseExp > 150; // Higher exp usually means higher HP
        if (constraint.value === 'attack-100') return baseExp > 120 && (pokemon.types.includes('fighting') || pokemon.types.includes('normal'));
        if (constraint.value === 'speed-100') return baseExp > 110 && pokemon.weight < 500; // Light = fast
        return false;

      default:
        return false;
    }
  };

  // Generate daily grid
  const generateDailyGrid = useCallback((): GridGame => {
    const seed = getTodaySeed();
    const today = new Date().toISOString().split('T')[0];
    
    // ROWS: Always 3 random Pokémon types
    const shuffledTypes = [...typeConstraints].sort(() => seededRandom(seed) - 0.5);
    const rowConstraints = shuffledTypes.slice(0, 3);
    
    // COLUMNS: 3 random other constraints
    const shuffledOthers = [...otherConstraints].sort(() => seededRandom(seed + 1000) - 0.5);
    const colConstraints = shuffledOthers.slice(0, 3);
    
    // Create 3x3 grid
    const cells: GridCell[] = [];
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        cells.push({
          id: `cell-${row}-${col}`,
          row,
          col,
          rowConstraint: rowConstraints[row],
          colConstraint: colConstraints[col],
          pokemon: null,
          isCorrect: false,
          attempts: 0,
          rarity: 0,
          isLocked: false,
        });
      }
    }

    return {
      id: `daily-${today}`,
      date: today,
      size: 3,
      cells,
      constraints: {
        rows: rowConstraints,
        cols: colConstraints
      },
      score: 0,
      completed: false,
      perfectGame: false,
      startTime: new Date(),
      totalGuesses: 0,
      correctGuesses: 0,
      streak: 0
    };
  }, []);

  // Generate endless grid
  const generateEndlessGrid = useCallback((): GridGame => {
    const seed = Date.now();
    
    // ROWS: Always 3 random Pokémon types
    const shuffledTypes = [...typeConstraints].sort(() => Math.random() - 0.5);
    const rowConstraints = shuffledTypes.slice(0, 3);
    
    // COLUMNS: 3 random other constraints
    const shuffledOthers = [...otherConstraints].sort(() => Math.random() - 0.5);
    const colConstraints = shuffledOthers.slice(0, 3);
    
    const cells: GridCell[] = [];
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        cells.push({
          id: `cell-${row}-${col}`,
          row,
          col,
          rowConstraint: rowConstraints[row],
          colConstraint: colConstraints[col],
          pokemon: null,
          isCorrect: false,
          attempts: 0,
          rarity: 0,
          isLocked: false,
        });
      }
    }

    return {
      id: `endless-${seed}`,
      date: new Date().toISOString().split('T')[0],
      size: 3,
      cells,
      constraints: {
        rows: rowConstraints,
        cols: colConstraints
      },
      score: 0,
      completed: false,
      perfectGame: false,
      startTime: new Date(),
      totalGuesses: 0,
      correctGuesses: 0,
      streak: 0
    };
  }, []);

  // Initialize game when component mounts or game mode changes
  useEffect(() => {
    if (!loading && displayedPokemon.length > 0) {
      if (gameMode === 'daily') {
        setCurrentGame(generateDailyGrid());
      } else {
        setCurrentGame(generateEndlessGrid());
      }
    }
  }, [loading, displayedPokemon, gameMode, generateDailyGrid, generateEndlessGrid]);

  // Handle search
  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = displayedPokemon.filter(pokemon =>
        pokemon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pokemon.id.toString().includes(searchQuery)
      ).slice(0, 20);
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, displayedPokemon]);

  // Calculate rarity score
  const calculateRarity = (pokemon: Pokemon, cell: GridCell): number => {
    let rarity = 1;
    
    // Base rarity from experience
    rarity += Math.floor(pokemon.base_experience / 50);
    
    // Constraint satisfaction rarity
    const validPokemon = displayedPokemon.filter(p => 
      checkConstraint(p, cell.rowConstraint) && checkConstraint(p, cell.colConstraint)
    );
    
    if (validPokemon.length < 10) rarity += 5; // Very rare combination
    else if (validPokemon.length < 50) rarity += 3; // Rare combination
    else if (validPokemon.length < 100) rarity += 1; // Uncommon combination
    
    return rarity;
  };

  // Handle Pokemon selection with guess limits
  const handlePokemonSelect = (pokemon: Pokemon) => {
    if (!currentGame || !selectedCell || selectedCell.isLocked || currentGame.totalGuesses >= MAX_TOTAL_GUESSES) return;

    const isValid = checkConstraint(pokemon, selectedCell.rowConstraint) && 
                   checkConstraint(pokemon, selectedCell.colConstraint);
    
    const rarity = calculateRarity(pokemon, selectedCell);
    
    const updatedCells = currentGame.cells.map(cell => {
      if (cell.id === selectedCell.id) {
        return {
          ...cell,
          pokemon: isValid ? pokemon : cell.pokemon, // Only update if correct
          isCorrect: isValid,
          attempts: cell.attempts + 1,
          isLocked: isValid, // Lock only if correct
          rarity: isValid ? rarity : 0
        };
      }
      return cell;
    });

    // Calculate score
    const score = updatedCells.reduce((total, cell) => {
      if (cell.isCorrect && cell.pokemon) {
        const baseScore = 100;
        const rarityBonus = cell.rarity * 20;
        const attemptPenalty = Math.max(0, cell.attempts - 1) * 10;
        return total + baseScore + rarityBonus - attemptPenalty;
      }
      return total;
    }, 0);

    // Update game statistics
    const totalGuesses = currentGame.totalGuesses + 1;
    const correctGuesses = currentGame.correctGuesses + (isValid ? 1 : 0);
    const newStreak = isValid ? currentGame.streak + 1 : 0;
    
    // Check completion
    const completed = updatedCells.every(cell => cell.pokemon && cell.isCorrect);
    const perfectGame = completed && updatedCells.every(cell => cell.attempts === 1);

    setCurrentGame({
      ...currentGame,
      cells: updatedCells,
      score,
      completed,
      perfectGame,
      totalGuesses,
      correctGuesses,
      streak: newStreak,
      endTime: completed ? new Date() : undefined
    });

    setSelectedCell(null);
    setSearchQuery('');
  };

  // Handle cell click
  const handleCellClick = (cellData: GridCellData) => {
    // Find the full GridCell with constraints
    const fullCell = currentGame?.cells.find(c => c.id === cellData.id);
    if (fullCell && !fullCell.isLocked && currentGame && currentGame.totalGuesses < MAX_TOTAL_GUESSES) {
      setSelectedCell(fullCell);
    }
  };

  if (loading || !currentGame) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PokéGrid Challenge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 py-4 px-3 sm:px-6">
      {/* Header - Authentic PokéGrid Style */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            Poké<span className="text-blue-600">Grid</span>
          </h1>
        </div>
        <p className="text-gray-600 text-lg font-medium">
          The daily Pokémon grid game
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {gameMode === 'daily' ? `Daily Challenge - ${currentGame.date}` : 'Endless Mode'}
        </p>
      </div>

      {/* Game Controls */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200/30">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              {(['daily', 'endless'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setGameMode(mode)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    gameMode === mode
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Game Stats */}
            <GameStats
              score={currentGame.score}
              solvedCount={currentGame.cells.filter(cell => cell.isCorrect).length}
              totalCells={9}
              accuracy={currentGame.totalGuesses > 0 ? Math.round((currentGame.correctGuesses / currentGame.totalGuesses) * 100) : 0}
              streak={currentGame.streak}
            />

            {/* Game Controls */}
            <GameControls
              gameMode={gameMode}
              onGameModeChange={setGameMode}
              onShowStats={() => setShowStats(true)}
              onShowShare={currentGame.completed ? () => setShowShareModal(true) : undefined}
              onShowLeaderboard={() => setShowLeaderboard(true)}
              gameCompleted={currentGame.completed}
            />
          </div>
        </div>
      </div>

      {/* Main Grid - Modular Component */}
      <div className="max-w-4xl mx-auto px-4">
        <GameGrid
          cells={currentGame.cells}
          rowConstraints={currentGame.constraints.rows}
          colConstraints={currentGame.constraints.cols}
          totalGuesses={currentGame.totalGuesses}
          maxTotalGuesses={MAX_TOTAL_GUESSES}
          onCellClick={handleCellClick}
        />

        {/* Grid Instructions */}
        <div className="mt-6 text-center text-gray-600">
          <p className="text-sm">
            Click a cell to find a Pokémon that matches both the row and column constraints.
          </p>
          <p className="text-xs mt-1 text-orange-600 font-medium">
            {MAX_TOTAL_GUESSES - currentGame.totalGuesses} total guesses remaining
          </p>
        </div>
      </div>

      {/* Pokemon Search Modal */}
      <PokemonSearchModal
        isOpen={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResults={searchResults}
        onPokemonSelect={handlePokemonSelect}
        totalGuesses={currentGame.totalGuesses}
        maxTotalGuesses={MAX_TOTAL_GUESSES}
        selectedCell={selectedCell ? {
          rowConstraint: {
            ...selectedCell.rowConstraint,
            type: selectedCell.rowConstraint.type,
            value: selectedCell.rowConstraint.value
          },
          colConstraint: {
            ...selectedCell.colConstraint,
            type: selectedCell.colConstraint.type,
            value: selectedCell.colConstraint.value
          }
        } : null}
      />

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-800">Game Statistics</h2>
                <button
                  onClick={() => setShowStats(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-center text-gray-600">
                <div className="text-lg font-bold mb-4 text-gray-700">Game Statistics</div>
                <p>Detailed statistics and analytics coming soon!</p>
                <p className="text-sm mt-2">Track your progress and improvement over time!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-800">Leaderboard</h2>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-center text-gray-600">
                <div className="text-lg font-bold mb-4 text-gray-700">Leaderboard</div>
                <p>Leaderboards and competitive features coming soon!</p>
                <p className="text-sm mt-2">Challenge your friends and climb the ranks!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Results Modal */}
      <ShareResultsModal
        isOpen={showShareModal && currentGame.completed}
        onClose={() => setShowShareModal(false)}
        gameResult={{
          score: currentGame.score,
          solvedCount: currentGame.cells.filter(cell => cell.isCorrect).length,
          totalCells: 9,
          accuracy: currentGame.totalGuesses > 0 ? Math.round((currentGame.correctGuesses / currentGame.totalGuesses) * 100) : 0,
          totalGuesses: currentGame.totalGuesses,
          perfectGame: currentGame.perfectGame,
          date: currentGame.date
        }}
        gameMode={gameMode}
      />
    </div>
  );
};

export default PokéGridChallenge;