import React from 'react';

interface GameControlsProps {
  gameMode: 'daily' | 'endless';
  onGameModeChange: (mode: 'daily' | 'endless') => void;
  onShowStats: () => void;
  onShowShare?: () => void;
  onShowLeaderboard: () => void;
  gameCompleted: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameMode,
  onGameModeChange,
  onShowStats,
  onShowShare,
  onShowLeaderboard,
  gameCompleted
}) => {
  return (
    <div className="flex flex-wrap gap-4 justify-center sm:justify-between items-center">
      {/* Mode Toggle - Hidden on mobile */}
      <div className="hidden sm:flex gap-2">
        {(['daily', 'endless'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onGameModeChange(mode)}
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

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onShowStats}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
        >
          Stats
        </button>
        {gameCompleted && onShowShare && (
          <button
            onClick={onShowShare}
            className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
          >
            Share
          </button>
        )}
        <button
          onClick={onShowLeaderboard}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
        >
          Leaderboard
        </button>
      </div>
    </div>
  );
};
