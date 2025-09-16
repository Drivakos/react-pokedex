import React, { useState, useEffect, useCallback } from 'react';
import { usePokemon } from '../hooks/usePokemon';
import { useAuth } from '../contexts/AuthProvider';
import { Pokemon } from '../types/pokemon';
import { supabase } from '../lib/supabase';
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
  hasMistake?: boolean; // Track if this cell had a wrong guess
  mistakeCount?: number; // Number of wrong guesses on this cell
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
  const { user, session } = useAuth();
  const [currentGame, setCurrentGame] = useState<GridGame | null>(null);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pokemon[]>([]);
  const [gameMode, setGameMode] = useState<'daily' | 'historical'>('daily');
  const [currentGridDate, setCurrentGridDate] = useState<Date>(new Date());
  const [showShareModal, setShowShareModal] = useState(false);
  const [bonusRetries, setBonusRetries] = useState(0); // Available bonus retries
  const [sessionUndos, setSessionUndos] = useState(0); // Undos used in current session
  const [lastAction, setLastAction] = useState<any>(null); // For undo functionality
  const [hasRecentMistake, setHasRecentMistake] = useState(false); // Track if user just made a mistake
  const [mistakePokemon, setMistakePokemon] = useState<Pokemon | null>(null); // Track the specific wrong Pokemon
  
  // Game constants
  const MAX_TOTAL_GUESSES = 9; // Start with 9 guesses (one per cell)
  const BONUS_RETRIES = 3; // Bonus retries for perfect first-try completion
  const MAX_UNDO_PER_SESSION = 3; // Maximum undo actions per session

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

  // Get date seed for daily puzzles (works for any date)
  const getDateSeed = (date: Date): number => {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  const generateDailyGrid = useCallback((date?: Date): GridGame => {
    const targetDate = date || currentGridDate;
    const seed = getDateSeed(targetDate);
    const dateString = targetDate.toISOString().split('T')[0];

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
          hasMistake: false,
          mistakeCount: 0,
        });
      }
    }

    return {
      id: `daily-${dateString}`,
      date: dateString,
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
  }, [currentGridDate]);

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
          hasMistake: false,
          mistakeCount: 0,
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

  // Load user progress for a specific date
  const loadUserProgress = useCallback(async (date: Date) => {
    if (!user || !session) return null;

    try {
      const dateString = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .rpc('get_user_pokegrid_progress', {
          p_user_id: user.id,
          p_grid_date: dateString
        });

      if (error) {
        console.error('Error loading user progress:', error);
        return null;
      }

      if (data && data.length > 0) {
        const progress = data[0];
        return progress;
      }

      return null;
    } catch (error) {
      console.error('Error loading user progress:', error);
      return null;
    }
  }, [user, session]);

  // Save user progress
  const saveUserProgress = useCallback(async (game: GridGame) => {
    if (!user || !session) return;

    try {
      const dateString = game.date;
      const gameData = {
        cells: game.cells.map(cell => ({
          id: cell.id,
          row: cell.row,
          col: cell.col,
          pokemon: cell.pokemon,
          isCorrect: cell.isCorrect,
          attempts: cell.attempts,
          rarity: cell.rarity,
          isLocked: cell.isLocked,
          hasMistake: cell.hasMistake,
          mistakeCount: cell.mistakeCount
        })),
        constraints: game.constraints,
        score: game.score,
        completed: game.completed,
        perfectGame: game.perfectGame,
        startTime: game.startTime,
        endTime: game.endTime,
        totalGuesses: game.totalGuesses,
        correctGuesses: game.correctGuesses,
        streak: game.streak,
        bonusRetries: bonusRetries
      };

      const { error } = await supabase.rpc('save_pokegrid_progress', {
        p_user_id: user.id,
        p_grid_date: dateString,
        p_game_data: gameData,
        p_completed: game.completed,
        p_score: game.score,
        p_total_guesses: game.totalGuesses,
        p_correct_guesses: game.correctGuesses
      });

      if (error) {
        console.error('Error saving user progress:', error);
      }
    } catch (error) {
      console.error('Error saving user progress:', error);
    }
  }, [user, session]);

  // Check if user can access historical grids (requires login)
  const canAccessHistoricalGrids = useCallback(() => {
    return !!user && !!session;
  }, [user, session]);


  // Initialize game when component mounts or game mode/date changes
  useEffect(() => {
    const initializeGame = async () => {
      if (!loading && displayedPokemon.length > 0) {
        if (gameMode === 'daily') {
          const game = generateDailyGrid(currentGridDate);

          // Try to load existing user progress
          const progress = await loadUserProgress(currentGridDate);
          if (progress && progress.game_data) {
            // Restore game state from saved progress
            const restoredGame = {
              ...game,
              cells: game.cells.map(cell => {
                const savedCell = progress.game_data.cells.find((c: any) => c.id === cell.id);
                return savedCell ? {
                  ...cell,
                  pokemon: savedCell.pokemon,
                  isCorrect: savedCell.isCorrect,
                  attempts: savedCell.attempts,
                  rarity: savedCell.rarity,
                  isLocked: savedCell.isLocked,
                  hasMistake: savedCell.hasMistake || false,
                  mistakeCount: savedCell.mistakeCount || 0
                } : cell;
              }),
              score: progress.game_data.score || 0,
              completed: progress.completed || false,
              perfectGame: progress.game_data.perfectGame || false,
              totalGuesses: progress.total_guesses || 0,
              correctGuesses: progress.correct_guesses || 0,
              streak: progress.game_data.streak || 0
            };
            setCurrentGame(restoredGame);

            // Restore bonus retries if perfect game was achieved
            if (restoredGame.perfectGame) {
              setBonusRetries(BONUS_RETRIES);
            }
          } else {
            setCurrentGame(game);
          }
        } else {
          setCurrentGame(generateEndlessGrid());
        }
      }
    };

    initializeGame();
  }, [loading, displayedPokemon, gameMode, currentGridDate, generateDailyGrid, generateEndlessGrid, loadUserProgress]);

  // Handle search with prioritized filtering
  useEffect(() => {
    if (searchQuery.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      
      // Separate Pokemon into different priority groups
      const startsWithName: Pokemon[] = [];
      const startsWithId: Pokemon[] = [];
      const containsName: Pokemon[] = [];
      const containsId: Pokemon[] = [];
      
      displayedPokemon.forEach(pokemon => {
        const lowerName = pokemon.name.toLowerCase();
        const idString = pokemon.id.toString();
        
        // Highest priority: name starts with query
        if (lowerName.startsWith(query)) {
          startsWithName.push(pokemon);
        }
        // Second priority: ID starts with query
        else if (idString.startsWith(query)) {
          startsWithId.push(pokemon);
        }
        // Third priority: name contains query
        else if (lowerName.includes(query)) {
          containsName.push(pokemon);
        }
        // Lowest priority: ID contains query
        else if (idString.includes(query)) {
          containsId.push(pokemon);
        }
      });
      
      // Combine results in priority order and limit to 20
      const filtered = [
        ...startsWithName,
        ...startsWithId,
        ...containsName,
        ...containsId
      ].slice(0, 20);
      
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

  // Handle Pokemon selection with new mistake/retry system
  const handlePokemonSelect = (pokemon: Pokemon) => {
    if (!currentGame || !selectedCell || selectedCell.isLocked) return;

    const isValid = checkConstraint(pokemon, selectedCell.rowConstraint) &&
                   checkConstraint(pokemon, selectedCell.colConstraint);

    const rarity = calculateRarity(pokemon, selectedCell);

    // Save previous state for undo functionality
    const previousState = {
      cells: currentGame.cells.map(cell => ({ ...cell })),
      totalGuesses: currentGame.totalGuesses,
      score: currentGame.score,
      selectedCell: selectedCell.id
    };
    setLastAction(previousState);

    const updatedCells = currentGame.cells.map(cell => {
      if (cell.id === selectedCell.id) {
        if (isValid) {
          // Correct guess - lock the cell
          return {
            ...cell,
            pokemon,
            isCorrect: true,
            attempts: cell.attempts + 1,
            isLocked: true,
            rarity,
            hasMistake: false, // Clear any previous mistake
            mistakeCount: cell.mistakeCount || 0
          };
        } else {
          // Wrong guess - mark as mistake, use a guess
          return {
            ...cell,
            pokemon, // Still show the wrong pokemon
            isCorrect: false,
            attempts: cell.attempts + 1,
            hasMistake: true,
            mistakeCount: (cell.mistakeCount || 0) + 1
          };
        }
      }
      return cell;
    });

    // Calculate score (only for correct cells)
    const score = updatedCells.reduce((total, cell) => {
      if (cell.isCorrect && cell.pokemon) {
        const baseScore = 100;
        const rarityBonus = cell.rarity * 20;
        const attemptPenalty = Math.max(0, cell.attempts - 1) * 10;
        return total + baseScore + rarityBonus - attemptPenalty;
      }
      return total;
    }, 0);

    // Update game statistics - only count guesses for wrong attempts
    const totalGuesses = currentGame.totalGuesses + (isValid ? 0 : 1);
    const correctGuesses = currentGame.correctGuesses + (isValid ? 1 : 0);
    const newStreak = isValid ? currentGame.streak + 1 : 0;

    // Check completion
    const completed = updatedCells.every(cell => cell.pokemon && cell.isCorrect);
    const perfectGame = completed && updatedCells.every(cell => cell.attempts === 1);

    // Award bonus retries for perfect game
    if (perfectGame && bonusRetries === 0) {
      setBonusRetries(BONUS_RETRIES);
    }

    // Check if out of guesses (considering bonus retries)
    const effectiveTotalGuesses = totalGuesses;
    const maxEffectiveGuesses = MAX_TOTAL_GUESSES + (perfectGame ? BONUS_RETRIES : 0);
    const isOutOfGuesses = effectiveTotalGuesses >= maxEffectiveGuesses;

    const updatedGame = {
      ...currentGame,
      cells: updatedCells,
      score,
      completed: completed && !isOutOfGuesses,
      perfectGame,
      totalGuesses: effectiveTotalGuesses,
      correctGuesses,
      streak: newStreak,
      endTime: (completed && !isOutOfGuesses) ? new Date() : undefined
    };

    setCurrentGame(updatedGame);

    // Update mistake state
    if (isValid) {
      setHasRecentMistake(false); // Correct guess clears mistake state
      setMistakePokemon(null); // Clear the specific mistake Pokemon
    } else {
      setHasRecentMistake(true); // Wrong guess sets mistake state
      setMistakePokemon(pokemon); // Track the specific wrong Pokemon
    }

    // Save progress for daily mode
    if (gameMode === 'daily') {
      saveUserProgress(updatedGame);
    }

    // Only close modal and clear selection if correct OR out of guesses
    if (isValid || isOutOfGuesses) {
      setSelectedCell(null);
      setSearchQuery('');
      setHasRecentMistake(false); // Clear mistake state when modal closes
      setMistakePokemon(null); // Clear the specific mistake Pokemon
    }
    // If wrong guess, keep modal open for retry
  };

  // Handle cell click - allow clicking mistake cells for retry
  const handleCellClick = (cellData: GridCellData) => {
    // Find the full GridCell with constraints
    const fullCell = currentGame?.cells.find(c => c.id === cellData.id);
    if (!fullCell || !currentGame) return;

    // Allow clicking on:
    // 1. Empty cells (not locked)
    // 2. Cells with mistakes (hasMistake = true)
    const canClick = !fullCell.isLocked || fullCell.hasMistake;

    if (canClick) {
      setSelectedCell(fullCell);
      // Clear mistake state when switching to a different cell
      setHasRecentMistake(false);
      setMistakePokemon(null);
    }
  };

  // Handle undo functionality
  const handleUndo = () => {
    if (!lastAction || !currentGame || sessionUndos >= MAX_UNDO_PER_SESSION) return;

    // Restore previous state
    setCurrentGame({
      ...currentGame,
      cells: lastAction.cells,
      totalGuesses: lastAction.totalGuesses,
      score: lastAction.score
    });

    // Find and restore the selected cell
    const restoredCell = lastAction.cells.find((c: any) => c.id === lastAction.selectedCell);
    setSelectedCell(restoredCell || null);

    // Clear last action and increment undo count
    setLastAction(null);
    setSessionUndos(prev => prev + 1);

    // Clear mistake state since we're undoing the mistake
    setHasRecentMistake(false);
    setMistakePokemon(null);
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
          {gameMode === 'daily'
            ? `Daily Challenge - ${currentGame.date}`
            : gameMode === 'historical'
              ? `Historical Challenge - ${currentGame.date}`
              : 'Endless Mode'
          }
        </p>
      </div>

      {/* Game Controls */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex flex-col gap-4">
          {/* Mode Controls */}
          <GameControls
            gameMode={gameMode}
            currentGridDate={currentGridDate}
            onGameModeChange={setGameMode}
            onGridDateChange={setCurrentGridDate}
            onShowShare={currentGame.completed ? () => setShowShareModal(true) : undefined}
            gameCompleted={currentGame.completed}
            canAccessHistorical={canAccessHistoricalGrids()}
          />

          {/* Game Stats */}
          <div className="flex justify-center">
            <GameStats
              score={currentGame.score}
              totalGuesses={currentGame.totalGuesses}
              maxTotalGuesses={MAX_TOTAL_GUESSES}
              bonusRetries={bonusRetries}
              perfectGame={currentGame.perfectGame}
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
        </div>
      </div>

      {/* Pokemon Search Modal */}
      <PokemonSearchModal
        isOpen={!!selectedCell}
        onClose={() => {
          setSelectedCell(null);
          setHasRecentMistake(false); // Clear mistake state when modal closes
          setMistakePokemon(null); // Clear the specific mistake Pokemon
        }}
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
        onUndo={handleUndo}
        sessionUndos={sessionUndos}
        maxSessionUndos={MAX_UNDO_PER_SESSION}
        hasRecentMistake={hasRecentMistake}
        mistakePokemon={mistakePokemon}
      />


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