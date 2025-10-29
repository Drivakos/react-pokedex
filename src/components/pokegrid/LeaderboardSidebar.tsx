import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { pokegridService, type LeaderboardEntry } from '../../services/pokegrid.service';
import { friendsService } from '../../services/friends.service';

interface LeaderboardSidebarProps {
  gridDate: string;
  onFriendsClick?: () => void;
}

type LeaderboardTab = 'worldwide' | 'friends';
type TimeframeType = 'daily' | 'weekly' | 'all-time';

export const LeaderboardSidebar: React.FC<LeaderboardSidebarProps> = ({
  gridDate,
  onFriendsClick
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('worldwide');
  const [timeframe, setTimeframe] = useState<TimeframeType>('daily');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFriends, setHasFriends] = useState(false);

  // Check if user has friends to determine default tab
  useEffect(() => {
    const checkFriends = async () => {
      if (user) {
        const friendsCount = await friendsService.getFriendsCount(user.id);
        setHasFriends(friendsCount > 0);
        
        // Default to friends tab if user has friends
        if (friendsCount > 0) {
          setActiveTab('friends');
        }
      }
    };

    checkFriends();
  }, [user]);

  // Load leaderboard data
  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!user) {
        setLeaderboardData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let data: LeaderboardEntry[] = [];

        if (activeTab === 'worldwide') {
          data = await pokegridService.getLeaderboard(timeframe, timeframe === 'daily' ? gridDate : undefined);
        } else {
          data = await pokegridService.getFriendsLeaderboard(
            user.id,
            timeframe,
            timeframe === 'daily' ? gridDate : undefined
          );
        }

        setLeaderboardData(data);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [user, activeTab, timeframe, gridDate]);

  const handleTabChange = (tab: LeaderboardTab) => {
    setActiveTab(tab);
  };

  const handleTimeframeChange = (tf: TimeframeType) => {
    setTimeframe(tf);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🏆</span>
            <span>Leaderboard</span>
          </h2>
          {onFriendsClick && (
            <button
              onClick={onFriendsClick}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage Friends
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => handleTabChange('worldwide')}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-colors text-sm ${
              activeTab === 'worldwide'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Worldwide
          </button>
          <button
            onClick={() => handleTabChange('friends')}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-colors text-sm ${
              activeTab === 'friends'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Friends {hasFriends && <span className="ml-1">✓</span>}
          </button>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-1 text-xs">
          {(['daily', 'weekly', 'all-time'] as TimeframeType[]).map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`flex-1 py-1.5 px-2 rounded transition-colors ${
                timeframe === tf
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tf === 'all-time' ? 'All Time' : tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-sm text-gray-600">Loading rankings...</p>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {activeTab === 'friends' ? (
              <>
                <span className="text-4xl mb-3">👥</span>
                <p className="text-gray-600 mb-2">No friends yet</p>
                <p className="text-sm text-gray-500 mb-3">
                  Add friends to compete with them!
                </p>
                {onFriendsClick && (
                  <button
                    onClick={onFriendsClick}
                    className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add Friends
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="text-4xl mb-3">📊</span>
                <p className="text-gray-600">No entries yet</p>
                <p className="text-sm text-gray-500">Be the first to complete!</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboardData.map((entry) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  entry.is_current_user || entry.user_id === user?.id
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {/* Rank Badge */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    entry.rank === 1
                      ? 'bg-yellow-400 text-yellow-900'
                      : entry.rank === 2
                      ? 'bg-gray-300 text-gray-700'
                      : entry.rank === 3
                      ? 'bg-orange-400 text-orange-900'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {entry.rank}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate text-sm">
                    {entry.username}
                    {(entry.is_current_user || entry.user_id === user?.id) && (
                      <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {entry.perfect_game ? (
                      <span className="text-green-600 font-semibold">⭐ Perfect!</span>
                    ) : (
                      <span>{entry.total_guesses} wrong</span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="font-bold text-gray-900 text-sm">
                    {entry.score.toLocaleString()}
                  </div>
                  {entry.completed_at && (
                    <div className="text-xs text-gray-500">
                      {new Date(entry.completed_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>

                {/* Perfect Badge */}
                {entry.perfect_game && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600 text-center">
          {activeTab === 'worldwide' ? (
            <>Showing top {Math.min(leaderboardData.length, 50)} players</>
          ) : (
            <>Showing all friends</>
          )}
        </p>
      </div>
    </div>
  );
};

