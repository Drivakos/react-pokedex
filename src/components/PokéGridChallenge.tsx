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
  const [currentGridDate, setCurrentGridDate] = useState<Date>(new Date());
  const [showShareModal, setShowShareModal] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Custom hooks for game logic
  const gameState = usePokegridGame(displayedPokemon, 'daily');
  const searchState = usePokegridSearch();
  const { currentGame, selectedCell } = gameState;

  // Reset search when modal opens (always call this hook)
  useEffect(() => {
    if (selectedCell && currentGame) {
      searchState.resetSearch();
    }
  }, [selectedCell, currentGame, searchState.resetSearch]);

  // Load available dates (today and last 6 days)
  useEffect(() => {
    const loadAvailableDates = () => {
      const dates = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }

      setAvailableDates(dates);
    };

    loadAvailableDates();
  }, []);

  // Initialize game when Pokemon data is ready
  useEffect(() => {
    if (!loading && displayedPokemon.length > 0) {
      gameState.initializeGame(currentGridDate, 'daily');
    }
  }, [loading, displayedPokemon.length, currentGridDate, gameState.initializeGame]);

  // Handle grid date changes (only allow today and last 6 days)
  const handleGridDateChange = (date: Date) => {
    const today = new Date();
    const sixDaysAgo = new Date(today);
    sixDaysAgo.setDate(today.getDate() - 6);

    // Only allow dates within the last 7 days
    if (date >= sixDaysAgo && date <= today) {
      setCurrentGridDate(date);
      gameState.initializeGame(date, 'daily');
    }
  };

  // Handle share modal
  const handleShowShare = () => {
    setShowShareModal(true);
  };

  // Check if selected date is today
  const isToday = currentGridDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PokéGrid Challenge
          </h1>
          <p className="text-lg text-gray-600">
            {isToday
              ? `Today's Grid - ${currentGridDate.toLocaleDateString()}`
              : `Past Grid - ${currentGridDate.toLocaleDateString()}`
            }
          </p>
        </div>

        {/* Date Selector (7-day history) */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {availableDates.map((dateString) => {
                const date = new Date(dateString);
                const isSelected = dateString === currentGridDate.toISOString().split('T')[0];
                const isCurrentDay = dateString === new Date().toISOString().split('T')[0];

                return (
                  <button
                    key={dateString}
                    onClick={() => handleGridDateChange(date)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : isCurrentDay
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isCurrentDay ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </button>
                );
              })}
            </div>
          </div>
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
            isSearching={searchState.isSearching}
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
          gameMode="daily"
        />
      </div>
    </div>
  );
};

export default PokéGridChallenge;