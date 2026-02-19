import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePokemon } from '../hooks/usePokemon';
import { usePokegridGame } from '../hooks/usePokegridGame';
import { usePokegridSearch } from '../hooks/usePokegridSearch';
import {
  GameGrid,
  GameStats,
  PokemonSearchModal,
  ShareResultsModal,
  GameSidebar,
  MobileMenu
} from './pokegrid';
import { FriendsModal } from './friends';
import { GAME_CONSTANTS } from './pokegrid/constants';

// Sub-components
import { GridHeader } from './pokegrid-page/GridHeader';
import { DailyGridSEO } from './pokegrid-page/DailyGridSEO';

const PokéGridChallenge: React.FC = () => {
  const { displayedPokemon, loading } = usePokemon({ skipFetch: true });

  // State
  const [currentGridDate, setCurrentGridDate] = useState<Date>(() => {
    const today = new Date();
    return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Hooks
  const gameState = usePokegridGame(displayedPokemon, 'daily');
  const searchState = usePokegridSearch();
  const { currentGame, selectedCell, isLoading } = gameState;

  // Effects
  useEffect(() => {
    if (selectedCell && currentGame) {
      searchState.resetSearch();
    }
  }, [selectedCell, currentGame, searchState.resetSearch]);

  useEffect(() => {
    // Initialize game on mount or date change, no longer waiting for displayedPokemon
    if (!loading) {
      gameState.initializeGame(currentGridDate, 'daily');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, currentGridDate, gameState.initializeGame]);

  // Handlers
  const handleGridDateChange = useCallback((date: Date) => {
    const now = new Date();
    const todayNormalized = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const sixDaysAgoNormalized = new Date(todayNormalized);
    sixDaysAgoNormalized.setUTCDate(todayNormalized.getUTCDate() - 6);

    if (date.getTime() >= sixDaysAgoNormalized.getTime() && date.getTime() <= todayNormalized.getTime()) {
      const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      setCurrentGridDate(normalizedDate);
      gameState.initializeGame(normalizedDate, 'daily');
    }
  }, [gameState]);

  const isToday = useMemo(() => 
    currentGridDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0],
  [currentGridDate]);

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
      <DailyGridSEO />

      <div className="max-w-7xl mx-auto px-4">
        <GridHeader 
          onMenuClick={() => setShowMobileMenu(true)} 
          currentGridDate={currentGridDate} 
          isToday={isToday} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-center">
              <GameStats
                score={game.score}
                totalGuesses={game.totalGuesses}
                maxTotalGuesses={GAME_CONSTANTS.MAX_TOTAL_GUESSES}
                bonusRetries={gameState.bonusRetries}
                perfectGame={game.perfectGame}
              />
            </div>

            <GameGrid
              cells={game.cells}
              rowConstraints={game.constraints.rows}
              colConstraints={game.constraints.cols}
              totalGuesses={game.totalGuesses}
              maxTotalGuesses={GAME_CONSTANTS.MAX_TOTAL_GUESSES}
              onCellClick={gameState.handleCellClick}
            />
          </div>

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

        <FriendsModal
          isOpen={showFriendsModal}
          onClose={() => setShowFriendsModal(false)}
        />

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
