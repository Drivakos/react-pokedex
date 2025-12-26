import React, { useState, useEffect, useCallback } from 'react';
import { Pokemon } from '../types/pokemon';
import { MemoryCard } from './PokemonCard';
import { GAME_CONSTANTS } from './game-constants';
import '../styles/card-animations.css';

interface GameCard {
  id: string;
  pokemon: Pokemon;
  isFlipped: boolean;
  isMatched: boolean;
}

interface GameStats {
  moves: number;
  matches: number;
  time: number;
  score: number;
}

interface PokemonMemoryMatchProps {
  pokemonList: Pokemon[];
  onGameComplete?: (stats: GameStats) => void;
}

const DIFFICULTY_LEVELS = GAME_CONSTANTS.DIFFICULTY_LEVELS;

export const PokemonMemoryMatch: React.FC<PokemonMemoryMatchProps> = ({
  pokemonList,
  onGameComplete
}) => {
  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTY_LEVELS>('medium');
  const [gameCards, setGameCards] = useState<GameCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<GameCard[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [moves, setMoves] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [wrongMatch, setWrongMatch] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<keyof typeof DIFFICULTY_LEVELS | null>(null);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [completionHandled, setCompletionHandled] = useState<boolean>(false);

  // Initialize game
  const initializeGame = useCallback(() => {
    const { pairs } = DIFFICULTY_LEVELS[difficulty];

    /**
     * UNIQUE POKEMON SELECTION ALGORITHM:
     * 1. Start with all available Pokemon
     * 2. Use Fisher-Yates shuffle for true randomness
     * 3. Select unique Pokemon by ID to ensure no duplicates
     * 4. If not enough unique Pokemon, fill with remaining ones
     * 5. As last resort, allow duplicates but log warning
     */

    // Validate Pokemon data and create a copy to avoid mutating the original
    if (!pokemonList || pokemonList.length === 0) {
      return;
    }

    // Filter out any invalid Pokemon (missing id or name)
    const validPokemon = pokemonList.filter(pokemon =>
      pokemon && typeof pokemon.id === 'number' && pokemon.name
    );

    if (validPokemon.length === 0) {
      return;
    }

    // Group Pokemon by generation to ensure diverse selection
    const pokemonByGeneration: { [key: string]: Pokemon[] } = {};
    validPokemon.forEach(pokemon => {
      const gen = pokemon.generation || 'unknown';
      if (!pokemonByGeneration[gen]) {
        pokemonByGeneration[gen] = [];
      }
      pokemonByGeneration[gen].push(pokemon);
    });

    const selectedPokemon: Pokemon[] = [];
    const availablePokemon = [...validPokemon];

    // Fisher-Yates shuffle for cryptographically strong randomization
    for (let i = availablePokemon.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePokemon[i], availablePokemon[j]] = [availablePokemon[j], availablePokemon[i]];
    }


    // Phase 1: Select unique Pokemon by ID with generation diversity
    const uniquePokemon = new Set<number>();
    const generations = Object.keys(pokemonByGeneration).filter(gen => gen !== 'unknown');
    const pokemonPerGeneration = Math.max(1, Math.floor(pairs / generations.length));
    const remainder = pairs % generations.length;

    // First, try to get Pokemon from each generation to ensure diversity
    generations.forEach((gen, index) => {
      const targetCount = pokemonPerGeneration + (index < remainder ? 1 : 0);
      const genPokemon = pokemonByGeneration[gen];
      let selectedFromGen = 0;

      // Shuffle this generation's Pokemon
      const shuffledGenPokemon = [...genPokemon];
      for (let i = shuffledGenPokemon.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledGenPokemon[i], shuffledGenPokemon[j]] = [shuffledGenPokemon[j], shuffledGenPokemon[i]];
      }

      // Select from this generation
      for (const pokemon of shuffledGenPokemon) {
        if (selectedFromGen < targetCount && !uniquePokemon.has(pokemon.id)) {
          uniquePokemon.add(pokemon.id);
          selectedPokemon.push(pokemon);
          selectedFromGen++;
        }
        if (uniquePokemon.size >= pairs) break;
      }
    });

    // If we still need more, fill from any remaining Pokemon
    if (uniquePokemon.size < pairs) {
      for (const pokemon of availablePokemon) {
        if (uniquePokemon.size < pairs && !uniquePokemon.has(pokemon.id)) {
          uniquePokemon.add(pokemon.id);
          selectedPokemon.push(pokemon);
        }
        if (uniquePokemon.size >= pairs) break;
      }
    }


    // Phase 3: Emergency fallback - allow duplicates if absolutely necessary
    if (selectedPokemon.length < pairs) {
      // Fill remaining slots with random Pokemon from the available list
      while (selectedPokemon.length < pairs) {
        const randomPokemon = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
        selectedPokemon.push(randomPokemon);
      }
    }

    // Create pairs of cards with unique Pokemon
    const cards: GameCard[] = [];
    selectedPokemon.forEach((pokemon) => {
      // Create two cards for each unique Pokemon
      cards.push({
        id: `${pokemon.id}-1`,
        pokemon,
        isFlipped: false,
        isMatched: false
      });
      cards.push({
        id: `${pokemon.id}-2`,
        pokemon,
        isFlipped: false,
        isMatched: false
      });
    });

    // Advanced shuffle for final card arrangement
    const shuffledCards = [...cards];
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }


    setGameCards(shuffledCards);
    setFlippedCards([]);
    setMatchedPairs(0);
    setMoves(0);
    setTime(0);
    setGameStarted(false);
    setGameCompleted(false);
    setIsChecking(false);
    setWrongMatch(false);
    setShowConfirmModal(false);
    setPendingDifficulty(null);
    setIsTimerPaused(false);
    setCompletionHandled(false);
  }, [pokemonList, difficulty]);

  // Timer effect
  useEffect(() => {
    let interval: number;
    if (gameStarted && !gameCompleted && !isTimerPaused) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, GAME_CONSTANTS.TIMER_INTERVAL);
    }
    return () => clearInterval(interval);
  }, [gameStarted, gameCompleted, isTimerPaused]);

  // Check for matches
  useEffect(() => {
    if (flippedCards.length === 2 && !isChecking) {
      setIsChecking(true);
      setMoves(prev => prev + 1);

      const [firstCard, secondCard] = flippedCards;

      if (firstCard.pokemon.id === secondCard.pokemon.id) {
        // Match found
        setTimeout(() => {
          setGameCards(prev =>
            prev.map(card =>
              card.id === firstCard.id || card.id === secondCard.id
                ? { ...card, isMatched: true }
                : card
            )
          );
          setMatchedPairs(prev => prev + 1);
          setFlippedCards([]);
          setIsChecking(false);
        }, GAME_CONSTANTS.MATCH_ANIMATION_DELAY);
      } else {
        // No match
        setWrongMatch(true);
        setTimeout(() => {
          setGameCards(prev =>
            prev.map(card =>
              card.id === firstCard.id || card.id === secondCard.id
                ? { ...card, isFlipped: false }
                : card
            )
          );
          setFlippedCards([]);
          setIsChecking(false);
          setWrongMatch(false);
        }, GAME_CONSTANTS.MISMATCH_ANIMATION_DELAY);
      }
    }
  }, [flippedCards, isChecking]);

  // Check for game completion
  useEffect(() => {
    const totalPairs = DIFFICULTY_LEVELS[difficulty].pairs;
    if (matchedPairs === totalPairs && totalPairs > 0 && !completionHandled) {
      setCompletionHandled(true);
      setGameCompleted(true);
      const score = Math.max(
        GAME_CONSTANTS.BASE_SCORE -
        (moves * GAME_CONSTANTS.MOVE_PENALTY) -
        (time * GAME_CONSTANTS.TIME_PENALTY),
        GAME_CONSTANTS.MINIMUM_SCORE
      );
      if (onGameComplete) {
        onGameComplete({
          moves,
          matches: matchedPairs,
          time,
          score
        });
      }
    }
  }, [matchedPairs, difficulty, moves, time, onGameComplete, completionHandled]);

  // Handle difficulty change
  const handleDifficultyChange = (newDifficulty: keyof typeof DIFFICULTY_LEVELS) => {
    if (gameStarted && !gameCompleted) {
      setPendingDifficulty(newDifficulty);
      setShowConfirmModal(true);
      setIsTimerPaused(true);
    } else {
      setDifficulty(newDifficulty);
    }
  };

  // Handle new game
  const handleNewGame = () => {
    if (gameStarted && !gameCompleted) {
      setPendingDifficulty(null);
      setShowConfirmModal(true);
      setIsTimerPaused(true);
    } else {
      initializeGame();
    }
  };

  // Confirm action
  const confirmAction = () => {
    setShowConfirmModal(false);
    setIsTimerPaused(false);

    if (pendingDifficulty) {
      setDifficulty(pendingDifficulty);
      setPendingDifficulty(null);
    } else {
      initializeGame();
    }
  };

  // Cancel action
  const cancelAction = () => {
    setShowConfirmModal(false);
    setIsTimerPaused(false);
    setPendingDifficulty(null);
  };

  // Handle card click
  const handleCardClick = (card: GameCard) => {
    if (!gameStarted) {
      setGameStarted(true);
    }

    if (isChecking || card.isFlipped || card.isMatched || flippedCards.length >= GAME_CONSTANTS.MAX_FLIPPED_CARDS) {
      return;
    }

    const updatedCard = { ...card, isFlipped: true };
    setGameCards(prev =>
      prev.map(c => c.id === card.id ? updatedCard : c)
    );
    setFlippedCards(prev => [...prev, updatedCard]);
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get grid classes based on difficulty
  const getGridClasses = (): string => {
    const { grid } = DIFFICULTY_LEVELS[difficulty];
    switch (grid) {
      case '3x4':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      case '4x4':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      case '4x6':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
    }
  };

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        handleNewGame();
      }
      if (event.code === 'Escape' && gameCompleted) {
        event.preventDefault();
        setGameCompleted(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleNewGame, gameCompleted]);

  // Mobile stats toggle keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (window.innerWidth < 640 && e.key === 's' && !gameCompleted) {
        setShowStats(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameCompleted]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 py-4 px-3 sm:px-6 relative">
      {/* Mobile Stats Overlay */}
      {showStats && (
        <div
          className="sm:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-35"
          onClick={() => setShowStats(false)}
        />
      )}

      {/* Fixed Stats Panel - Desktop only or mobile when shown */}
      <div className={`fixed top-18 left-3 right-3 sm:left-6 sm:right-auto z-40 bg-white/60 backdrop-blur-sm rounded-lg p-3 sm:p-4 shadow-lg border border-gray-200/30 transition-all duration-300 ${
        showStats ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      } sm:opacity-100 sm:scale-100 sm:pointer-events-auto`}
           style={{ minWidth: '160px' }}>
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-semibold text-gray-800">Game Stats</h4>
          <button
            onClick={() => setShowStats(false)}
            className="sm:hidden text-gray-500 hover:text-gray-700 p-1"
            aria-label="Close stats"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Moves</span>
            <span className="text-lg font-bold text-blue-600">{moves}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Matches</span>
            <span className="text-lg font-bold text-green-600">{matchedPairs}/{DIFFICULTY_LEVELS[difficulty].pairs}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Time</span>
            <span className="text-lg font-bold text-purple-600">{formatTime(time)}</span>
          </div>
        </div>
      </div>

      {/* Floating Stats Button - Mobile only */}
      <button
        onClick={() => setShowStats(true)}
        className={`sm:hidden fixed top-4 right-4 z-30 bg-blue-500 text-white rounded-full p-3 shadow-lg hover:bg-blue-600 transition-all duration-200 hover:scale-105 relative ${
          showStats ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Show game stats"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {/* Progress indicator */}
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {moves}
        </div>
      </button>

      {/* Game Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="mb-3 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2 hidden">
            Pokémon Memory Match
          </h1>
        </div>
        <p className="text-gray-700 text-base sm:text-lg font-medium mb-2">
          Find matching pairs of Pokémon cards!
        </p>
        <p className="text-gray-600 text-xs sm:text-sm mb-2">
          Test your memory and Pokémon knowledge
        </p>

        {/* Game Controls */}
        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center items-center">
          {/* Difficulty Buttons */}
          {Object.entries(DIFFICULTY_LEVELS).map(([key, { pairs }]) => (
            <button
              key={key}
              onClick={() => handleDifficultyChange(key as keyof typeof DIFFICULTY_LEVELS)}
              className={`px-4 py-3 sm:px-6 sm:py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation ${
                difficulty === key
                  ? 'bg-red-500 text-white shadow-lg ring-2 ring-red-300'
                  : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white shadow-md border border-gray-200/50'
              }`}
            >
              <span className="text-sm sm:text-base">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              <span className="text-xs sm:text-sm ml-1">({pairs})</span>
            </button>
          ))}

          {/* New Game Button */}
          <button
            onClick={handleNewGame}
            className="px-4 py-3 sm:px-6 sm:py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[44px] touch-manipulation"
          >
            New Game
          </button>
        </div>


      {/* Progress Bar - Fixed at bottom */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 px-3 sm:px-0 sm:min-w-[600px]">
        <div className="w-full bg-white/60 backdrop-blur-sm rounded-xl p-4 sm:p-4 shadow-lg border border-gray-200/30 w-4/5 sm:min-w-[600px] sm:max-w-lg">
          <div className={`flex justify-between text-sm sm:text-sm mb-3 sm:mb-3 ${
            (gameCompleted || completionHandled) ? 'text-green-700' : 'text-gray-700'
          }`}>
            <span className="font-semibold">Progress</span>
            <span className="font-bold">{Math.round((matchedPairs / DIFFICULTY_LEVELS[difficulty].pairs) * 100)}%</span>
          </div>
          <div className={`w-full bg-gray-200/70 rounded-full overflow-hidden backdrop-blur-sm`}
               style={{ height: `${GAME_CONSTANTS.PROGRESS_BAR_HEIGHT + 6}px` }}>
            <div
              className={`rounded-full transition-all duration-500 shadow-sm ${
                (gameCompleted || completionHandled)
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-red-500 to-red-600'
              }`}
              style={{
                width: `${(matchedPairs / DIFFICULTY_LEVELS[difficulty].pairs) * 100}%`,
                height: `${GAME_CONSTANTS.PROGRESS_BAR_HEIGHT + 6}px`
              }}
            ></div>
          </div>
        </div>
      </div>

        {/* Game Completion Notification */}
        {gameCompleted && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setGameCompleted(false)}
          >
            <div
              className="bg-white/90 backdrop-blur-sm border border-gray-200/30 rounded-xl p-4 sm:p-8 shadow-2xl max-w-md w-full mx-3 sm:mx-4 transform animate-in fade-in-0 zoom-in-95 duration-300 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setGameCompleted(false)}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full p-1.5 sm:p-2 transition-colors duration-200"
                aria-label="Close notification"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center">
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🏆</div>
                <h2 className="text-xl sm:text-2xl font-bold text-green-800 mb-3">
                  Congratulations!
                </h2>
                <p className="text-green-700 mb-4 text-lg">
                  You completed the <strong className="text-green-800">{difficulty}</strong> level!
                </p>
                <div className="bg-white/70 rounded-lg p-4 mb-4">
                  <p className="text-green-600 font-medium mb-2">
                    Moves: <span className="font-bold text-green-800">{moves}</span>
                  </p>
                  <p className="text-green-600 font-medium mb-2">
                    Time: <span className="font-bold text-green-800">{formatTime(time)}</span>
                  </p>
                  <p className="text-green-800 font-bold text-xl">
                    Final Score: {Math.max(1000 - (moves * 10) - (time * 2), 100)}
                  </p>
                </div>
                <button
                  onClick={() => setGameCompleted(false)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
                >
                  Play Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Game Area */}
      <div className="max-w-4xl mx-auto pb-20 sm:pb-24">
        {/* Game Board */}
        <div className={`grid gap-2 sm:gap-3 lg:gap-4 max-w-4xl mx-auto transition-transform duration-300 px-2 sm:px-4 lg:px-0 ${wrongMatch ? 'memory-shake' : ''} ${getGridClasses()}`}>
        {gameCards.map((card) => (
          <MemoryCard
            key={card.id}
            pokemon={card.pokemon}
            isFlipped={card.isFlipped}
            isMatched={card.isMatched}
            onClick={() => handleCardClick(card)}
            disabled={isChecking}
          />
        ))}
        </div>

        {/* Instructions */}
        <div className="mt-6 sm:mt-8 text-center text-gray-600 px-3 sm:px-0">
          <p className="mb-2 text-xs sm:text-sm lg:text-base">
            <strong>How to play:</strong> Tap cards to flip them and find matching pairs.
          </p>
          <p className="mb-2 text-xs sm:text-sm lg:text-base">
            Match all {DIFFICULTY_LEVELS[difficulty].pairs} pairs quickly with fewest moves!
          </p>
          <p className="text-xs text-gray-500">
            <strong>Tip:</strong> Press <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">Space</kbd> for new game
            <span className="sm:hidden"> • Press <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">S</kbd> for stats</span>
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-3 sm:mx-4">
            <div className="text-center p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Lose Current Progress?
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                You're in the middle of a game! Changing difficulty or starting a new game will reset your progress.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelAction}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Keep Playing
                </button>
                <button
                  onClick={confirmAction}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  {pendingDifficulty ? 'Change Difficulty' : 'New Game'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
