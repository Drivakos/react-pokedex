import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthProvider';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  score: number;
  completed_at: string;
  perfect_game: boolean;
  total_guesses: number;
  rank: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  gridDate: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  gridDate
}) => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'all-time'>('daily');

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
    }
  }, [isOpen, timeframe, gridDate]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // This would need to be implemented in the service
      // const data = await pokegridService.getLeaderboard(timeframe, gridDate);
      // setLeaderboard(data);
      
      // Mock data for now
      setLeaderboard([
        {
          user_id: '1',
          username: 'PokeMaster',
          score: 2700,
          completed_at: '2024-01-15T10:30:00Z',
          perfect_game: true,
          total_guesses: 0,
          rank: 1
        },
        {
          user_id: '2',
          username: 'GridGuru',
          score: 2450,
          completed_at: '2024-01-15T11:15:00Z',
          perfect_game: false,
          total_guesses: 2,
          rank: 2
        },
        // Add more mock entries...
      ]);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Leaderboard</h2>
              <p className="text-sm text-gray-600">{gridDate}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-2 mb-6">
            {(['daily', 'weekly', 'all-time'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Leaderboard List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading leaderboard...</p>
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                      entry.user_id === user?.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                      entry.rank === 2 ? 'bg-gray-300 text-gray-700' :
                      entry.rank === 3 ? 'bg-orange-400 text-orange-900' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {entry.rank}
                    </div>

                    {/* Username */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {entry.username}
                        {entry.user_id === user?.id && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(entry.completed_at).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <div className="font-bold text-lg text-gray-900">
                        {entry.score.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {entry.perfect_game ? (
                          <span className="text-green-600 font-semibold">Perfect!</span>
                        ) : (
                          `${entry.total_guesses} wrong`
                        )}
                      </div>
                    </div>

                    {/* Perfect Game Badge */}
                    {entry.perfect_game && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No entries yet for this timeframe.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};