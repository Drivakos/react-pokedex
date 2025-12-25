import React, { useState, useEffect, useCallback } from 'react';
import { usePokemon } from '../hooks/usePokemon';
import { usePokegridGame } from '../hooks/usePokegridGame';
import { usePokegridSearch } from '../hooks/usePokegridSearch';
import {
  GameGrid,
  GameStats,
  PokemonSearchModal,
  ShareResultsModal,
  GameSidebar,
  MobileMenu,
  WeeklyStats
} from './pokegrid';
import { FriendsModal } from './friends';
import { GAME_CONSTANTS } from './pokegrid/constants';


const PokéGridChallenge: React.FC = () => {
  const { displayedPokemon, loading } = usePokemon();

  // UI state
  const [currentGridDate, setCurrentGridDate] = useState<Date>(() => {
    const today = new Date();
    return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Custom hooks for game logic
  const gameState = usePokegridGame(displayedPokemon, 'daily');
  const searchState = usePokegridSearch();
  const { currentGame, selectedCell, isLoading } = gameState;

  // Reset search when modal opens (always call this hook)
  useEffect(() => {
    if (selectedCell && currentGame) {
      searchState.resetSearch();
    }
  }, [selectedCell, currentGame, searchState.resetSearch]);

  // Initialize game when Pokemon data is ready
  useEffect(() => {
    if (!loading && displayedPokemon.length > 0) {
      gameState.initializeGame(currentGridDate, 'daily');
    }
  }, [loading, displayedPokemon.length, currentGridDate, gameState.initializeGame]);

  // Handle grid date changes (only allow today and last 6 days)
  const handleGridDateChange = useCallback((date: Date) => {
    // Create normalized "today" in UTC to match input format from WeeklyStats
    // Get current local date components
    const now = new Date();
    const todayNormalized = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    
    // Calculate 6 days ago from the normalized today
    const sixDaysAgoNormalized = new Date(todayNormalized);
    sixDaysAgoNormalized.setUTCDate(todayNormalized.getUTCDate() - 6);

    // Simple timestamp comparison since both are normalized to UTC midnight
    if (date.getTime() >= sixDaysAgoNormalized.getTime() && date.getTime() <= todayNormalized.getTime()) {
      // Normalize the date to avoid time component issues - use UTC to prevent timezone shifts
      const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

      // Always update - let React handle optimization
      setCurrentGridDate(normalizedDate);
      gameState.initializeGame(normalizedDate, 'daily');
    }
  }, [gameState]);

  // Check if selected date is today
  const isToday = currentGridDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

  if (loading || !currentGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading Pokemon Grid Challenge...</p>
        </div>
      </div>
    );
  }

  // After the loading check, currentGame is guaranteed to be non-null
  const game = currentGame;

  return (
    <div className="min-h-screen bg-white py-8">
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading grid...</p>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="relative mb-4 md:mb-6">
          {/* Mobile Menu Button */}
          <div className="lg:hidden absolute left-0 top-0">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-red-400"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Pokemon Grid Challenge
            </h1>
            <p className="text-gray-600">
              {isToday
                ? `Today's Grid`
                : `${currentGridDate.getDate().toString().padStart(2, '0')}/${(currentGridDate.getMonth() + 1).toString().padStart(2, '0')}`}
            </p>
          </div>
        </div>

        {/* Main Layout: Grid + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left/Center: Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Stats */}
            <div className="flex justify-center">
              <GameStats
                score={game.score}
                totalGuesses={game.totalGuesses}
                maxTotalGuesses={GAME_CONSTANTS.MAX_TOTAL_GUESSES}
                bonusRetries={gameState.bonusRetries}
                perfectGame={game.perfectGame}
              />
            </div>

            {/* Game Grid */}
            <GameGrid
              cells={game.cells}
              rowConstraints={game.constraints.rows}
              colConstraints={game.constraints.cols}
              totalGuesses={game.totalGuesses}
              maxTotalGuesses={GAME_CONSTANTS.MAX_TOTAL_GUESSES}
              onCellClick={gameState.handleCellClick}
            />
          </div>

          {/* Right: Game Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-4">
              <GameSidebar
                gridDate={currentGridDate}
                onDateSelect={handleGridDateChange}
                onFriendsClick={() => setShowFriendsModal(true)}
              />
            </div>
          </div>
        </div>


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
            totalGuesses={game.totalGuesses}
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
            score: game.score,
            solvedCount: game.cells.filter((cell: any) => cell.isCorrect).length,
            totalCells: 9,
            accuracy: game.totalGuesses > 0
              ? Math.round((game.correctGuesses / game.totalGuesses) * 100)
              : 0,
            totalGuesses: game.totalGuesses,
            perfectGame: game.perfectGame,
            date: game.date
          }}
          gameMode="daily"
        />

        {/* Friends Modal */}
        <FriendsModal
          isOpen={showFriendsModal}
          onClose={() => setShowFriendsModal(false)}
        />

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={showMobileMenu}
          onClose={() => setShowMobileMenu(false)}
          gridDate={currentGridDate}
          onDateSelect={handleGridDateChange}
          onFriendsClick={() => setShowFriendsModal(true)}
        />

      </div>
    </div>
  );
};

export default PokéGridChallenge;