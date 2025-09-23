import React, { useState, useEffect } from 'react';
import { usePokemon } from '../hooks/usePokemon';
import { usePokegridGame } from '../hooks/usePokegridGame';
import { usePokegridSearch } from '../hooks/usePokegridSearch';
import { 
  GameGrid, 
  GameStats, 
  GameControls, 
  PokemonSearchModal, 
  ShareResultsModal
} from './pokegrid';
import { GAME_CONSTANTS } from './pokegrid/constants';

const PokéGridChallenge: React.FC = () => {
  const { displayedPokemon, loading } = usePokemon();
  
  // UI state
  const [gameMode, setGameMode] = useState<'daily' | 'historical'>('daily');
  const [currentGridDate, setCurrentGridDate] = useState<Date>(new Date());
  const [showShareModal, setShowShareModal] = useState(false);

  // Custom hooks for game logic
  const gameState = usePokegridGame(displayedPokemon, gameMode);
  const searchState = usePokegridSearch();

  // Initialize game when Pokemon data is ready
  useEffect(() => {
    if (!loading && displayedPokemon.length > 0) {
      gameState.initializeGame(currentGridDate, gameMode);
    }
  }, [loading, displayedPokemon.length, gameMode, currentGridDate, gameState.initializeGame]);

  // Handle game mode changes
  const handleGameModeChange = (mode: 'daily' | 'historical') => {
    setGameMode(mode);
    if (mode === 'daily') {
      setCurrentGridDate(new Date());
    }
  };

  // Handle grid date changes
  const handleGridDateChange = (date: Date) => {
    setCurrentGridDate(date);
    gameState.initializeGame(date, gameMode);
  };

  // Handle share modal
  const handleShowShare = () => {
    setShowShareModal(true);
  };

  if (loading || !gameState.currentGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading PokéGrid Challenge...</p>
        </div>
      </div>
    );
  }

  const { currentGame, selectedCell } = gameState;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PokéGrid Challenge
          </h1>
          <p className="text-lg text-gray-600">
            {gameMode === 'daily' 
              ? `Daily Grid - ${currentGridDate.toLocaleDateString()}`
              : `Historical Grid - ${currentGridDate.toLocaleDateString()}`
            }
          </p>
        </div>

        {/* Game Controls */}
        <div className="flex justify-center mb-6">
          <GameControls
            gameMode={gameMode}
            currentGridDate={currentGridDate}
            onGameModeChange={handleGameModeChange}
            onGridDateChange={handleGridDateChange}
            onShowShare={handleShowShare}
            gameCompleted={currentGame.completed}
            canAccessHistorical={true} // Simplified for now
          />
        </div>

        {/* Game Stats */}
        <div className="flex justify-center mb-6">
          <GameStats
            score={currentGame.score}
            totalGuesses={currentGame.totalGuesses}
            maxTotalGuesses={GAME_CONSTANTS.MAX_TOTAL_GUESSES}
            bonusRetries={gameState.bonusRetries}
            perfectGame={currentGame.perfectGame}
          />
        </div>

        {/* Game Grid */}
        <GameGrid
          cells={currentGame.cells}
          rowConstraints={currentGame.constraints.rows}
          colConstraints={currentGame.constraints.cols}
          totalGuesses={currentGame.totalGuesses}
          maxTotalGuesses={GAME_CONSTANTS.MAX_TOTAL_GUESSES}
          onCellClick={gameState.handleCellClick}
        />

        {/* Pokemon Search Modal */}
        {selectedCell && (
          <PokemonSearchModal
            isOpen={true}
            onClose={() => gameState.setSelectedCell(null)}
            searchQuery={searchState.searchQuery}
            onSearchChange={searchState.setSearchQuery}
            searchResults={searchState.searchResults}
            onPokemonSelect={gameState.handlePokemonSelect}
            totalGuesses={currentGame.totalGuesses}
            maxTotalGuesses={GAME_CONSTANTS.MAX_TOTAL_GUESSES}
            selectedCell={{
              id: selectedCell.id,
              rowConstraint: selectedCell.rowConstraint,
              colConstraint: selectedCell.colConstraint
            }}
            onUndo={gameState.canUndo ? gameState.handleUndo : undefined}
            sessionUndos={gameState.sessionUndos}
            maxSessionUndos={GAME_CONSTANTS.MAX_UNDO_PER_SESSION}
            hasRecentMistake={gameState.hasRecentMistake}
            mistakePokemon={gameState.mistakePokemon}
            popularityData={gameState.popularityData}
            isSearching={searchState.isSearching}
          />
        )}

        {/* Share Results Modal */}
        <ShareResultsModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          gameResult={{
            score: currentGame.score,
            solvedCount: currentGame.cells.filter((cell: any) => cell.isCorrect).length,
            totalCells: 9,
            accuracy: currentGame.totalGuesses > 0 
              ? Math.round((currentGame.correctGuesses / currentGame.totalGuesses) * 100) 
              : 0,
            totalGuesses: currentGame.totalGuesses,
            perfectGame: currentGame.perfectGame,
            date: currentGame.date
          }}
          gameMode={gameMode}
        />
      </div>
    </div>
  );
};

export default PokéGridChallenge;
