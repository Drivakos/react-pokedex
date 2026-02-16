import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { SearchBar } from './SearchBar';

interface HomeHeaderProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  isSearching: boolean;
  totalFiltersCount: number;
  onToggleFilters: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  isSearching,
  totalFiltersCount,
  onToggleFilters,
}) => {
  return (
    <header>
      <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 md:gap-6 md:mb-6 mb-2 px-4 pt-4" data-component-name="PokedexHome">
        <div className="flex-1 max-w-2xl md:w-4/5 md:flex md:items-center" data-component-name="PokedexHome">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            isSearching={isSearching}
            onToggleFilters={onToggleFilters}
            filterCount={totalFiltersCount}
            showFilterButton={false}
          />
        </div>

        <div className="flex items-center justify-end md:w-1/5 md:h-12">
          <button
            onClick={onToggleFilters}
            className={`hidden md:flex items-center gap-2 px-5 py-3 rounded-md text-base font-semibold shadow-md transition-colors duration-200 ${totalFiltersCount > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`} data-component-name="PokedexHome"
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {totalFiltersCount > 0 && (
              <span className="bg-white text-blue-500 px-1.5 py-0.5 rounded-full text-xs font-bold ml-1">
                {totalFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
