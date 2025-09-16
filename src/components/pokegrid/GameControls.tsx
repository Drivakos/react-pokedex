import React from 'react';

interface GameControlsProps {
  gameMode: 'daily' | 'historical';
  currentGridDate: Date;
  onGameModeChange: (mode: 'daily' | 'historical') => void;
  onGridDateChange: (date: Date) => void;
  onShowShare?: () => void;
  gameCompleted: boolean;
  canAccessHistorical?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameMode,
  currentGridDate,
  onGameModeChange,
  onGridDateChange,
  onShowShare,
  gameCompleted,
  canAccessHistorical = false
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
      <div className="flex gap-2">
        {gameCompleted && onShowShare && (
          <button
            onClick={onShowShare}
            className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
};
