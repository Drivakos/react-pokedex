import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { pokegridService, type WeeklyHistoryDay } from '../../services/pokegrid.service';

interface WeeklyStatsProps {
  currentGridDate: Date;
  onDateSelect: (date: Date) => void;
}

export const WeeklyStats: React.FC<WeeklyStatsProps> = ({
  currentGridDate,
  onDateSelect
}) => {
  const { user } = useAuth();
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyHistoryDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWeeklyHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const history = await pokegridService.getWeeklyHistory(user.id);
        setWeeklyHistory(history);
      } catch (error) {
        console.error('Error loading weekly history:', error);
        setWeeklyHistory([]);
      } finally {
        setLoading(false);
      }
    };

    loadWeeklyHistory();
  }, [user]);

  const getDayLabel = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - compareDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getStatusIcon = (day: WeeklyHistoryDay): { icon: string; color: string; label: string } => {
    if (day.perfect_game) {
      return { icon: '⭐', color: 'text-yellow-500', label: 'Perfect!' };
    }
    if (day.completed) {
      return { icon: '✅', color: 'text-green-500', label: 'Completed' };
    }
    if (day.total_guesses > 0) {
      return { icon: '🔄', color: 'text-blue-500', label: 'In Progress' };
    }
    return { icon: '⏸️', color: 'text-gray-400', label: 'Not Started' };
  };

  const isSelectedDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0] === currentGridDate.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <p className="text-center text-gray-600 text-sm">Sign in to track your progress</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>📅</span>
        <span>Last 7 Days</span>
      </h3>

      <div className="grid grid-cols-7 gap-2">
        {weeklyHistory.map((day) => {
          const status = getStatusIcon(day);
          const selected = isSelectedDate(day.grid_date);

          return (
            <button
              key={day.grid_date}
              onClick={() => onDateSelect(new Date(day.grid_date))}
              className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                selected
                  ? 'bg-blue-100 border-2 border-blue-500 shadow-md'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
              title={`${getDayLabel(day.grid_date)} - ${status.label}`}
            >
              {/* Day Label */}
              <div className="text-xs font-semibold text-gray-700 mb-1">
                {getDayLabel(day.grid_date)}
              </div>

              {/* Status Icon */}
              <div className={`text-2xl mb-1 ${status.color}`}>
                {status.icon}
              </div>

              {/* Score */}
              {day.completed && (
                <div className="text-xs font-bold text-gray-900">
                  {day.score}
                </div>
              )}

              {/* Rank Among Friends */}
              {day.completed && day.friends_completed_count > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  #{day.rank_among_friends}
                </div>
              )}

              {/* Wrong Guesses */}
              {day.total_guesses > 0 && !day.perfect_game && (
                <div className="text-xs text-red-600 mt-1">
                  {day.total_guesses}❌
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-green-500">✅</span>
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">⭐</span>
            <span className="text-gray-600">Perfect</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-500">🔄</span>
            <span className="text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">⏸️</span>
            <span className="text-gray-600">Not Started</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">
              {weeklyHistory.filter(d => d.completed).length}
            </div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">
              {weeklyHistory.filter(d => d.perfect_game).length}
            </div>
            <div className="text-xs text-gray-600">Perfect</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">
              {weeklyHistory.reduce((sum, d) => sum + (d.completed ? d.score : 0), 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">Total Score</div>
          </div>
        </div>
      </div>
    </div>
  );
};

