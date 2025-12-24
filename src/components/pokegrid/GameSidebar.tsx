import React, { useState } from 'react';
import { LeaderboardSidebar } from './LeaderboardSidebar';
import { WeeklyStats } from './WeeklyStats';

interface GameSidebarProps {
  gridDate: Date;
  onDateSelect: (date: Date) => void;
  onFriendsClick?: () => void;
  activeView: 'leaderboard' | 'grid-selection';
  onViewChange: (view: 'leaderboard' | 'grid-selection') => void;
}

export const GameSidebar: React.FC<GameSidebarProps> = ({
  gridDate,
  onDateSelect,
  onFriendsClick,
  activeView,
  onViewChange
}) => {

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => onViewChange('leaderboard')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeView === 'leaderboard'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => onViewChange('grid-selection')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeView === 'grid-selection'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Grid Selection
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeView === 'leaderboard' && (
          <LeaderboardSidebar
            gridDate={gridDate.toISOString().split('T')[0]}
            onFriendsClick={onFriendsClick}
          />
        )}

        {activeView === 'grid-selection' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Grid</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose a grid to play from the last 7 days
            </p>
            <WeeklyStats
              currentGridDate={gridDate}
              onDateSelect={onDateSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
};
