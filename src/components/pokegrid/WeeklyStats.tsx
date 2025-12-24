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

    // Return date in DD/MM format instead of weekday names
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
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
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Last 7 Days</h3>

      <div className="grid grid-cols-7 gap-1">
        {weeklyHistory.map((day) => {
          const selected = isSelectedDate(day.grid_date);

          // Simple status colors
          let statusColor = 'bg-gray-200'; // not started
          if (day.perfect_game) statusColor = 'bg-yellow-400';
          else if (day.completed) statusColor = 'bg-green-500';
          else if (day.total_guesses > 0) statusColor = 'bg-blue-400';

          return (
            <button
              key={day.grid_date}
              onClick={() => onDateSelect(new Date(day.grid_date))}
              className={`flex flex-col items-center p-2 rounded transition-all ${selected
                ? 'bg-blue-50 ring-2 ring-blue-500'
                : 'hover:bg-gray-50'
                }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {getDayLabel(day.grid_date)}
              </div>
              <div className={`w-3 h-3 rounded-full ${statusColor}`} />
              {day.completed && (
                <div className="text-xs font-medium text-gray-700 mt-1">
                  {day.score}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <span>{weeklyHistory.filter(d => d.completed).length}/7 completed</span>
        <span>{weeklyHistory.reduce((sum, d) => sum + (d.completed ? d.score : 0), 0).toLocaleString()} pts</span>
      </div>
    </div>
  );
};

