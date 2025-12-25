import React, { useState } from 'react';
import { LeaderboardSidebar } from './LeaderboardSidebar';
import { WeeklyStats } from './WeeklyStats';

interface GameSidebarProps {
  gridDate: Date;
  onDateSelect: (date: Date) => void;
  onFriendsClick?: () => void;
}

export const GameSidebar: React.FC<GameSidebarProps> = ({
  gridDate,
  onDateSelect,
  onFriendsClick,
}) => {

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Content */}
      <div className="p-0">
        <LeaderboardSidebar
          gridDate={gridDate.toISOString().split('T')[0]}
          onDateSelect={onDateSelect}
          onFriendsClick={onFriendsClick}
        />
      </div>
    </div>
  );
};
