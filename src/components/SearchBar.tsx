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
    <div className="relative flex items-center w-full gap-2">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-colors duration-200" size={20} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search Pokémon..."
          className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
          data-component-name="SearchBar"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {showFilterButton && (
        <button 
          onClick={onToggleFilters}
          className="p-2.5 bg-white border border-gray-200 rounded-full text-gray-700 hover:bg-gray-50 flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 relative md:hidden"
        >
          <SlidersHorizontal size={20} />
          {filterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold">
              {filterCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
});

export default SearchBar;
