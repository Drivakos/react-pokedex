import React from 'react';

interface GameControlsProps {
  gameMode: 'daily' | 'historical';
  currentGridDate: Date;
  onGameModeChange: (mode: 'daily' | 'historical') => void;
  onGridDateChange: (date: Date) => void;
  onShowShare?: () => void;
  onShowStats?: () => void;
  onShowHint?: () => void;
  onShowLeaderboard?: () => void;
  onShowAchievements?: () => void;
  onNewGame?: () => void;
  gameCompleted: boolean;
  canAccessHistorical?: boolean;
  hintsRemaining?: number;
  canUseHint?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameMode,
  currentGridDate,
  onGameModeChange,
  onGridDateChange,
  onShowShare,
  onShowStats,
  onShowHint,
  onShowLeaderboard,
  onShowAchievements,
  onNewGame,
  gameCompleted,
  canAccessHistorical = false,
  hintsRemaining = 3,
  canUseHint = true
}) => {
  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getHistoricalDates = () => {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date);
    }

    return dates;
  };

  return (
    <div className="flex flex-wrap gap-4 justify-center sm:justify-between items-center">
      {/* Mode Toggle and Date Selector */}
      <div className="flex gap-2 items-center">
        {/* Mode Toggle - Hidden on mobile */}
        <div className="hidden sm:flex gap-2">
          {(['daily', 'historical'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                if (mode === 'historical' && !canAccessHistorical) {
                  alert('Please log in to access historical grids');
                  return;
                }
                onGameModeChange(mode);
              }}
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

        {/* Date Selector for Historical Mode */}
        {gameMode === 'historical' && (
          <div className="relative">
            <select
              value={currentGridDate.toISOString().split('T')[0]}
              onChange={(e) => onGridDateChange(new Date(e.target.value))}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {getHistoricalDates().map((date) => (
                <option key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Current Date Display for Daily Mode */}
        {gameMode === 'daily' && (
          <div className="text-sm font-medium text-gray-600 bg-white px-3 py-2 rounded-lg border">
            {formatDate(currentGridDate)}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {/* Stats Button */}
        {onShowStats && (
          <button
            onClick={onShowStats}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-1"
            title="View Statistics"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline">Stats</span>
          </button>
        )}

        {/* Hint Button */}
        {onShowHint && canUseHint && (
          <button
            onClick={onShowHint}
            disabled={hintsRemaining <= 0}
            className={`px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
              hintsRemaining > 0
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={`Get Hint (${hintsRemaining} remaining)`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="hidden sm:inline">Hint</span>
            <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{hintsRemaining}</span>
          </button>
        )}

        {/* New Game Button */}
        {onNewGame && gameMode !== 'daily' && (
          <button
            onClick={onNewGame}
            className="px-3 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors flex items-center gap-1"
            title="Start New Game"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">New Game</span>
          </button>
        )}

        {/* Leaderboard Button */}
        {onShowLeaderboard && (
          <button
            onClick={onShowLeaderboard}
            className="px-3 py-2 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 transition-colors flex items-center gap-1"
            title="View Leaderboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline">Leaderboard</span>
          </button>
        )}

        {/* Achievements Button */}
        {onShowAchievements && (
          <button
            onClick={onShowAchievements}
            className="px-3 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center gap-1"
            title="View Achievements"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="hidden sm:inline">Achievements</span>
          </button>
        )}

        {/* Share Button */}
        {gameCompleted && onShowShare && (
          <button
            onClick={onShowShare}
            className="px-3 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span className="hidden sm:inline">Share</span>
          </button>
        )}
      </div>
    </div>
  );
};
