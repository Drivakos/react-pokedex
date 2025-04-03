import React, { ReactNode } from 'react';
import { SlidersHorizontal, RefreshCw, Search } from 'lucide-react';

interface PokedexLayoutProps {
  children: ReactNode;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearching: boolean;
  filterCount: number;
  onToggleFilters: () => void;
  onResetFilters: () => void;
}

export const PokedexLayout: React.FC<PokedexLayoutProps> = ({
  children,
  searchTerm,
  setSearchTerm,
  isSearching,
  filterCount,
  onToggleFilters,
  onResetFilters
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Top Pokedex Section */}
      <div className="bg-red-600 text-white pt-4 pb-8 px-4 rounded-b-3xl shadow-lg">
        <div className="mb-4 flex justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
            <div className="w-4 h-4 bg-red-400 rounded-full border-2 border-white"></div>
            <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-white"></div>
            <div className="w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-4">Pokédex</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Pokémon..."
            className="w-full bg-white bg-opacity-20 text-white placeholder-gray-200 rounded-full py-3 px-5 pr-12 focus:outline-none focus:ring-2 focus:ring-white"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isSearching ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Search size={20} className="text-white" />
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 px-4 py-6 -mt-4 bg-white rounded-t-3xl">
        {children}
      </div>
      
      {/* Bottom Control Panel */}
      <div className="bg-gray-200 py-3 px-4 border-t border-gray-300">
        <div className="flex justify-between items-center">
          {/* Filter Button */}
          <button
            onClick={onToggleFilters}
            className="flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow"
          >
            <SlidersHorizontal size={18} />
            <span>Filters</span>
            {filterCount > 0 && (
              <span className="bg-white text-blue-500 px-1.5 py-0.5 rounded-full text-xs font-bold">
                {filterCount}
              </span>
            )}
          </button>
          
          {/* Reset Button - Only show when filters are active */}
          {filterCount > 0 && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw size={16} />
              <span>Reset</span>
            </button>
          )}
          
          {/* Decorative Buttons */}
          <div className="flex space-x-2">
            <div className="w-10 h-10 bg-red-500 rounded-full"></div>
            <div className="w-10 h-10 bg-blue-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
