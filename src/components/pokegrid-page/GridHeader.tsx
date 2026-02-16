import React from 'react';

interface GridHeaderProps {
  onMenuClick: () => void;
  currentGridDate: Date;
  isToday: boolean;
}

export const GridHeader: React.FC<GridHeaderProps> = ({ onMenuClick, currentGridDate, isToday }) => {
  return (
    <div className="relative mb-4 md:mb-6">
      {/* Mobile Menu Button */}
      <div className="lg:hidden absolute left-0 top-0">
        <button
          onClick={onMenuClick}
          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-red-400"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-1 hidden">
          Pokemon Grid Challenge
        </h1>
        <p className="text-gray-600">
          {isToday
            ? `Today's Grid`
            : `${currentGridDate.getDate().toString().padStart(2, '0')}/${(currentGridDate.getMonth() + 1).toString().padStart(2, '0')}`}
        </p>
      </div>
    </div>
  );
};
