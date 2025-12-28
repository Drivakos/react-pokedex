import React from 'react';
import { Pokemon } from '../../types/pokemon';
import { formatName } from '../../utils/helpers';
import { TYPE_COLORS } from '../../types/pokemon';
import PokemonImage from '../PokemonImage';

interface PokemonSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: Pokemon[];
  isSearching?: boolean;
  onPokemonSelect: (pokemon: Pokemon) => void;
  totalGuesses: number;
  maxTotalGuesses: number;
  selectedCell: {
    id?: string; // Add id property
    rowConstraint: { label: string; icon: string; svgIcon?: string; type: string; value: string | number };
    colConstraint: { label: string; icon: string; svgIcon?: string; type: string; value: string | number };
  } | null;
  onUndo?: () => void;
  sessionUndos?: number;
  maxSessionUndos?: number;
  hasRecentMistake?: boolean; // Show undo only after a wrong guess
  mistakePokemon?: any; // The specific Pokemon that was the wrong choice
  popularityData?: any[]; // Popularity data for the current grid
}

export const PokemonSearchModal: React.FC<PokemonSearchModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching = false,
  onPokemonSelect,
  totalGuesses,
  maxTotalGuesses,
  selectedCell,
  onUndo,
  sessionUndos = 0,
  maxSessionUndos = 3,
  hasRecentMistake = false,
  mistakePokemon = null,
  popularityData = []
}) => {

  if (!isOpen || !selectedCell) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl mx-2 sm:mx-4 max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                {selectedCell.rowConstraint.label} × {selectedCell.colConstraint.label}
              </h2>
              <p className="text-sm text-gray-600">
                Guess #{totalGuesses + 1} of {maxTotalGuesses}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for a Pokémon..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                autoFocus
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          {searchQuery.length > 0 && (
            <div className="flex items-center justify-between mt-2">
              <div className="text-sm text-gray-600 truncate flex-1 mr-2">
                Results for "<span className="font-semibold text-gray-800">{searchQuery}</span>"
              </div>
              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0">
                {searchResults.length}
              </div>
            </div>
          )}
        </div>

        {/* Search Results Section */}
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="max-h-80 sm:max-h-96 overflow-y-auto">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-blue-600 mb-4"></div>
                <p className="text-base text-gray-700 font-medium">Searching Pokémon...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((pokemon) => {
                  // Check if this Pokemon was the wrong choice
                  const isMistakePokemon = mistakePokemon && pokemon.id === mistakePokemon.id;

                  // Find popularity data for this Pokemon in the current cell
                  const pokemonPopularity = popularityData.find(
                    (p: any) => p.cell_id === selectedCell?.id && p.pokemon_id === pokemon.id
                  );

                  // Calculate popularity level
                  let popularityColor = 'text-gray-400';
                  let popularityText = popularityData.length === 0 ? '—' : '?';

                  if (pokemonPopularity && pokemonPopularity.popularity_percentage !== null) {
                    const percentage = pokemonPopularity.popularity_percentage;
                    if (percentage < 0.1) {
                      popularityColor = 'text-green-600';
                    } else if (percentage < 0.25) {
                      popularityColor = 'text-yellow-600';
                    } else if (percentage < 0.5) {
                      popularityColor = 'text-orange-600';
                    } else {
                      popularityColor = 'text-red-600';
                    }
                    popularityText = `${Math.round(percentage * 100)}%`;
                  }

                  return (
                    <div
                      key={pokemon.id}
                      onClick={() => onPokemonSelect(pokemon)}
                      className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 hover:border-gray-300 ${
                        isMistakePokemon ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      {/* Pokemon Image */}
                      <div className="flex-shrink-0 mr-3">
                        <PokemonImage
                          pokemonId={pokemon.id}
                          alt={formatName(pokemon.name)}
                          className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                        />
                      </div>

                      {/* Pokemon Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                            {formatName(pokemon.name)}
                          </h3>
                          <span className={`text-xs font-medium ml-2 ${popularityColor}`}>
                            {popularityText}
                          </span>
                        </div>
                        <div className="flex items-center mt-1">
                          <span className="text-xs text-gray-500 mr-2">#{pokemon.id.toString().padStart(3, '0')}</span>
                          {/* Types hidden for challenge */}
                        </div>
                      </div>

                      {/* Select Arrow */}
                      <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery.length > 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.006-5.7-2.6" />
                  </svg>
                </div>
                <div className="text-lg sm:text-xl font-semibold mb-2 text-gray-700">No Results Found</div>
                <p className="text-sm sm:text-base text-gray-500 mb-1 px-4">No Pokémon found matching "<span className="font-semibold">{searchQuery}</span>"</p>
                <p className="text-xs sm:text-sm text-gray-400 px-4">Try a different name or number</p>
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="text-lg sm:text-xl font-semibold mb-2 text-gray-800">Find Your Pokémon</div>
                <p className="text-sm sm:text-base text-gray-600 mb-3 px-4">Start typing a Pokémon name to see matches</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center px-4">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm">Example: "pika"</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm">"char"</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm">"mew"</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Undo Button */}
        {onUndo && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-xs sm:text-sm text-gray-600">
                Session undos: {sessionUndos}/{maxSessionUndos}
              </div>
              <button
                onClick={onUndo}
                disabled={!hasRecentMistake}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  hasRecentMistake
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Undo Last Guess
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};