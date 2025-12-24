import React from 'react';

interface WeeklyStatsProps {
  currentGridDate: Date;
  onDateSelect: (date: Date) => void;
}

export const WeeklyStats: React.FC<WeeklyStatsProps> = ({
  currentGridDate,
  onDateSelect
}) => {
  // Generate last 7 days
  const getLast7Days = () => {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push({
        date: date,
        dateString: date.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`
      });
    }

    return days;
  };

  const days = getLast7Days();
  const selectedDateStr = currentGridDate.toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Last 7 Days</h3>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = day.dateString === selectedDateStr;

          return (
            <button
              key={day.dateString}
              onClick={() => onDateSelect(day.date)}
              className={`flex flex-col items-center p-2 rounded transition-all ${
                isSelected
                  ? 'bg-blue-50 ring-2 ring-blue-500'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {day.label}
              </div>
              <div className="w-3 h-3 rounded-full bg-gray-200" />
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <span>0/7 completed</span>
        <span>0 pts</span>
      </div>
    </div>
  );
};

