import React, { useState } from 'react';
import { LeaderboardSidebar } from './LeaderboardSidebar';
import { WeeklyStats } from './WeeklyStats';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  gridDate: Date;
  onDateSelect: (date: Date) => void;
  onFriendsClick?: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  gridDate,
  onDateSelect,
  onFriendsClick,
}) => {
  const [activeView, setActiveView] = useState<'leaderboard' | 'grid-selection'>('leaderboard');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Menu */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-50 lg:hidden transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveView('leaderboard')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeView === 'leaderboard'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => setActiveView('grid-selection')}
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
          <div className="flex-1 overflow-y-auto">
            {activeView === 'leaderboard' && (
              <div className="p-4">
                <LeaderboardSidebar
                  gridDate={gridDate.toISOString().split('T')[0]}
                  onFriendsClick={onFriendsClick}
                />
              </div>
            )}

            {activeView === 'grid-selection' && (
              <div className="p-4">
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
      </div>
    </>
  );
};
