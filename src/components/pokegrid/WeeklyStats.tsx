import React from 'react';

interface WeeklyStatsProps {
  currentGridDate: Date;
  onDateSelect: (date: Date) => void;
}

export const WeeklyStats: React.FC<WeeklyStatsProps> = ({
  currentGridDate,
  onDateSelect
}) => {
  const selectedDateStr = currentGridDate.toISOString().split('T')[0];

  // Generate all 7 dates first to ensure consistency
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const today = new Date();
    const utcToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    utcToday.setUTCDate(utcToday.getUTCDate() - i);
    dates.push({
      date: utcToday,
      dateString: utcToday.toISOString().split('T')[0],
      label: i === 0 ? 'Today' :
             i === 1 ? 'Yesterday' :
             `${utcToday.getUTCDate()}/${utcToday.getUTCMonth() + 1}`,
      index: i
    });
  }

  console.log('=== WeeklyStats Render ===');
  console.log('currentGridDate:', currentGridDate);
  console.log('selectedDateStr:', selectedDateStr);
  dates.forEach(d => {
    console.log(`Generated: index=${d.index}, label=${d.label}, dateString=${d.dateString}, isSelected=${d.dateString === selectedDateStr}`);
  });

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-1">
      {dates.map((dateInfo) => {
        const isSelected = dateInfo.dateString === selectedDateStr;

        return (
          <button
            key={dateInfo.dateString}
            onClick={() => {
              console.log(`=== CLICKED Button ${dateInfo.index} (label: ${dateInfo.label}) ===`);
              console.log('Date string:', dateInfo.dateString);
              console.log('Date:', dateInfo.date);
              onDateSelect(dateInfo.date);
            }}
            className={`flex flex-col items-center p-2 sm:p-1 rounded text-xs transition-colors border-2 ${
              isSelected ? 'bg-red-100 text-red-700 border-red-500' : 'hover:bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            <span>{dateInfo.label}</span>
            <div className={`w-2 h-2 rounded-full mt-1 ${isSelected ? 'bg-blue-500' : 'bg-gray-300'}`} />
          </button>
        );
      })}
    </div>
  );
};

