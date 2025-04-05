import React, { memo } from 'react';

interface FilterTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  typeCount: number;
  moveCount: number;
  otherCount: number;
}

export const FilterTabs: React.FC<FilterTabsProps> = memo(({ 
  activeTab, 
  setActiveTab, 
  typeCount, 
  moveCount, 
  otherCount 
}) => {
  return (
    <div className="flex border-b overflow-x-auto no-scrollbar w-full">
      <button
        className={`px-3 py-2 flex-shrink-0 min-w-0 ${
          activeTab === 'types'
            ? 'text-blue-500 border-b-2 border-blue-500 font-medium'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => setActiveTab('types')}
      >
        <span className="truncate">Types{typeCount > 0 ? ` (${typeCount})` : ''}</span>
      </button>
      
      <button
        className={`px-3 py-2 flex-shrink-0 min-w-0 ${
          activeTab === 'moves'
            ? 'text-blue-500 border-b-2 border-blue-500 font-medium'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => setActiveTab('moves')}
      >
        <span className="truncate">Moves{moveCount > 0 ? ` (${moveCount})` : ''}</span>
      </button>
      
      <button
        className={`px-3 py-2 flex-shrink-0 min-w-0 ${
          activeTab === 'other'
            ? 'text-blue-500 border-b-2 border-blue-500 font-medium'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => setActiveTab('other')}
      >
        <span className="truncate">Other{otherCount > 0 ? ` (${otherCount})` : ''}</span>
      </button>
    </div>
  );
});

export default FilterTabs;
