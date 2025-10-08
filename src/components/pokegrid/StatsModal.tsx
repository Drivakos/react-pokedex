import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { pokegridService } from '../../services/pokegrid.service';

interface UserStats {
  totalGames: number;
  completedGames: number;
  perfectGames: number;
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  longestStreak: number;
  averageGuesses: number;
  totalGuesses: number;
  accuracy: number;
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      loadUserStats();
    }
  }, [isOpen, user]);

  const loadUserStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // This would need to be implemented in the service
      const userStats = await pokegridService.getUserStats(user.id);
      setStats(userStats);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Statistics</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading statistics...</p>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              {/* Games Played */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.totalGames}</div>
                <div className="text-sm text-gray-600">Games Played</div>
              </div>

              {/* Completion Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-green-700">
                    {stats.totalGames > 0 ? Math.round((stats.completedGames / stats.totalGames) * 100) : 0}%
                  </div>
                  <div className="text-sm text-green-600">Completion Rate</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-blue-700">{stats.perfectGames}</div>
                  <div className="text-sm text-blue-600">Perfect Games</div>
                </div>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-purple-700">{stats.bestScore}</div>
                  <div className="text-sm text-purple-600">Best Score</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-orange-700">
                    {Math.round(stats.averageScore)}
                  </div>
                  <div className="text-sm text-orange-600">Average Score</div>
                </div>
              </div>

              {/* Streaks */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-red-700">{stats.currentStreak}</div>
                  <div className="text-sm text-red-600">Current Streak</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-yellow-700">{stats.longestStreak}</div>
                  <div className="text-sm text-yellow-600">Longest Streak</div>
                </div>
              </div>

              {/* Accuracy */}
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="text-xl font-bold text-indigo-700">{Math.round(stats.accuracy)}%</div>
                <div className="text-sm text-indigo-600">
                  Accuracy ({stats.totalGuesses - stats.totalGames} wrong guesses)
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No statistics available yet.</p>
              <p className="text-sm text-gray-500 mt-2">Play some games to see your stats!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};