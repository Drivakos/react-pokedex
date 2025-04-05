import React, { memo } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onToggleFilters: () => void;
  filterCount: number;
  isSearching: boolean;
  showFilterButton?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = memo(({
  value,
  onChange,
  onToggleFilters,
  filterCount,
  isSearching,
  showFilterButton = true,
}) => {
  return (
    <div className="relative flex items-center mb-4 w-full">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search Pokémon..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white"
          data-component-name="SearchBar"
        />
        {isSearching && (
          <div className="absolute right-3 top-2.5">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {showFilterButton && (
        <button 
          onClick={onToggleFilters}
          className="ml-2 p-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center md:hidden"
        >
          <SlidersHorizontal size={20} />
          {filterCount > 0 && (
            <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold ml-1">
              {filterCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
});

export default SearchBar;
