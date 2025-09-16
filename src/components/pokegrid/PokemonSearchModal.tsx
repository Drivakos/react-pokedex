import React from 'react';
import { Pokemon } from '../../types/pokemon';
import { formatName, getOfficialArtwork } from '../../utils/helpers';
import { TYPE_COLORS } from '../../types/pokemon';

interface PokemonSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: Pokemon[];
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
        <div className="p-4 sm:p-6 pb-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Select Pokémon</h2>
              
              {/* Challenge Mode - No Constraints Shown */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-amber-700">Challenge Mode</span>
                </div>
                <p className="text-sm text-amber-600">Choose a Pokémon that matches both row and column constraints</p>
              </div>
              
              {/* Guesses Remaining */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-orange-600 font-medium">
                  {maxTotalGuesses - totalGuesses} guess{(maxTotalGuesses - totalGuesses) !== 1 ? 'es' : ''} remaining
                </span>
              </div>
            </div>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        </div>
        
        {/* Search Input Section */}
        <div className="px-4 sm:px-6 pb-3 sm:pb-4 border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              placeholder="Search Pokémon..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 sm:px-4 py-3 sm:py-4 pl-10 sm:pl-12 text-base sm:text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              autoFocus
            />
            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
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
            {searchResults.length > 0 ? (
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
                  let popularityText = '?';

                  if (pokemonPopularity && pokemonPopularity.popularity_percentage !== null) {
                    const percentage = pokemonPopularity.popularity_percentage;
                    if (percentage < 0.1) {
                      popularityColor = 'text-green-600';
                      popularityText = 'Rare';
                    } else if (percentage < 0.25) {
                      popularityColor = 'text-blue-600';
                      popularityText = 'Uncommon';
                    } else if (percentage < 0.5) {
                      popularityColor = 'text-yellow-600';
                      popularityText = 'Common';
                    } else if (percentage < 0.75) {
                      popularityColor = 'text-orange-600';
                      popularityText = 'Popular';
                    } else {
                      popularityColor = 'text-red-600';
                      popularityText = 'Very Popular';
                    }
                  }

                  return (
                    <div
                      key={pokemon.id}
                      onClick={() => onPokemonSelect(pokemon)}
                      className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-blue-300 hover:shadow-md active:scale-[0.98] cursor-pointer transition-all duration-200 ${
                        isMistakePokemon ? 'ring-2 ring-red-200 bg-red-50/50' : ''
                      }`}
                      title={`${pokemon.name} - ${popularityText} choice`}
                    >
                    <div className="relative flex-shrink-0">
                      <img
                        src={getOfficialArtwork(pokemon.sprites)}
                        alt={pokemon.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                      />
                      <div className="absolute -top-1 -right-1 bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                        #{pokemon.id.toString().padStart(3, '0')}
                      </div>
                      {/* Popularity indicator */}
                      <div className="absolute -bottom-1 -right-1">
                        <div className={`w-4 h-4 rounded-full border border-white shadow-sm ${popularityColor} flex items-center justify-center text-[10px] font-bold`}>
                          {popularityText.charAt(0)}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base sm:text-lg font-bold text-gray-900 mb-1 truncate">
                        {formatName(pokemon.name)}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pokemon.types.map((type) => (
                          <span
                            key={type}
                            className={`${TYPE_COLORS[type]} text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-semibold capitalize`}
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Undo Button - Only show on the specific wrong Pokemon */}
                      {onUndo && sessionUndos < maxSessionUndos && hasRecentMistake && isMistakePokemon && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering Pokemon selection
                            onUndo();
                          }}
                          className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors animate-pulse ring-1 ring-red-300"
                          title={`Undo ${pokemon.name} choice (${maxSessionUndos - sessionUndos} undos remaining)`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                      )}

                      {/* Select Arrow */}
                      <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
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
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm">"bulb"</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
