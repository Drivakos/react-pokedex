import React, { useState, useEffect, useRef } from 'react';
import { usePokemon } from '../hooks/usePokemon';
import { usePokegridGame } from '../hooks/usePokegridGame';
import { usePokegridSearch } from '../hooks/usePokegridSearch';
import {
  GameGrid,
  GameStats,
  PokemonSearchModal,
  ShareResultsModal,
  LeaderboardSidebar,
  WeeklyStats
} from './pokegrid';
import { FriendsModal } from './friends';
import { GAME_CONSTANTS } from './pokegrid/constants';
import { ChevronDown, Trophy, Users, Calendar, Settings } from 'lucide-react';

const PokéGridChallenge: React.FC = () => {
  const { displayedPokemon, loading } = usePokemon();

  // UI state
  const [currentGridDate, setCurrentGridDate] = useState<Date>(new Date());
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

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
    <div className="min-h-screen bg-gradient-to-br from-white-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6 relative">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-gray-900">
              Pokemon Grid Challenge
            </h1>
            
            {/* Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="text-gray-700 hover:bg-gray-200 active:bg-gray-300 px-3 py-2 rounded-full text-sm font-medium flex items-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Options menu"
                aria-expanded={showDropdown}
                aria-haspopup="true"
              >
                <Settings className="h-4 w-4 mr-1" />
                Options
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                  <button
                    onClick={() => {
                      setShowFriendsModal(true);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                  >
                    <Users className="h-4 w-4 mr-2 text-blue-600" />
                    Manage Friends
                  </button>
                  
                  <button
                    onClick={() => {
                      handleGridDateChange(new Date());
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                  >
                    <Calendar className="h-4 w-4 mr-2 text-green-600" />
                    Jump to Today
                  </button>
                  
                  <button
                    onClick={() => {
                      handleShowShare();
                      setShowDropdown(false);
                    }}
                    disabled={!game.completed}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trophy className="h-4 w-4 mr-2 text-yellow-600" />
                    Share Results
                  </button>

                  <div className="border-t border-gray-200 my-1"></div>
                  
                  <div className="px-4 py-2">
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold">Stats:</span> {game.cells.filter((c: any) => c.isCorrect).length}/9 correct
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-semibold">Score:</span> {game.score.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <p className="text-lg text-gray-600">
            {isToday
              ? `Today's Grid - ${currentGridDate.toLocaleDateString()}`
              : `Past Grid - ${currentGridDate.toLocaleDateString()}`
            }
          </p>
        </div>

        {/* Weekly Stats */}
        <div className="mb-6">
          <WeeklyStats
            currentGridDate={currentGridDate}
            onDateSelect={handleGridDateChange}
          />
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

          {/* Right: Leaderboard Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <LeaderboardSidebar
                gridDate={currentGridDate.toISOString().split('T')[0]}
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
      </div>
    </div>
  );
};

export default PokéGridChallenge;