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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Menu */}
      <div className="fixed top-0 right-0 h-full w-96 max-w-full bg-white shadow-lg z-50 lg:hidden transform transition-transform duration-300 ease-in-out">
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-0 h-full">
              <LeaderboardSidebar
                gridDate={gridDate.toISOString().split('T')[0]}
                onDateSelect={onDateSelect}
                onFriendsClick={onFriendsClick}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
