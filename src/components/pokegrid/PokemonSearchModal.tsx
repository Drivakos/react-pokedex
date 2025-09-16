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
    rowConstraint: { label: string; icon: string; svgIcon?: string; type: string; value: string | number };
    colConstraint: { label: string; icon: string; svgIcon?: string; type: string; value: string | number };
  } | null;
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
  selectedCell
}) => {
  // Helper function to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length === 0) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-semibold">{part}</span>
      ) : (
        part
      )
    );
  };

  if (!isOpen || !selectedCell) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Select Pokémon</h2>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {selectedCell.rowConstraint.svgIcon ? (
                    <div className={`icon small ${selectedCell.rowConstraint.value}`}>
                      <img
                        src={selectedCell.rowConstraint.svgIcon}
                        alt={selectedCell.rowConstraint.label}
                      />
                    </div>
                  ) : selectedCell.rowConstraint.icon ? (
                    <span className="text-lg">{selectedCell.rowConstraint.icon}</span>
                  ) : null}
                  <span className="font-semibold text-gray-700">{selectedCell.rowConstraint.label}</span>
                </div>
                <span className="text-lg font-bold text-gray-400">+</span>
                <div className="flex items-center gap-2">
                  {selectedCell.colConstraint.icon && <span className="text-sm font-bold">{selectedCell.colConstraint.icon}</span>}
                  <span className="whitespace-pre-line font-semibold text-gray-700">{selectedCell.colConstraint.label}</span>
                </div>
              </div>
              <div className="text-xs text-orange-600 font-medium mt-1">
                {maxTotalGuesses - totalGuesses} guess{(maxTotalGuesses - totalGuesses) !== 1 ? 'es' : ''} remaining
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Type Pokémon name (e.g. 'Pika' for Pikachu)..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {searchQuery.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Showing results for "{searchQuery}" • {searchResults.length} found
              </div>
            )}
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.map((pokemon) => (
                  <div
                    key={pokemon.id}
                    onClick={() => onPokemonSelect(pokemon)}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <img
                      src={getOfficialArtwork(pokemon.sprites)}
                      alt={pokemon.name}
                      className="w-12 h-12 object-contain"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {highlightMatch(formatName(pokemon.name), searchQuery)}
                      </div>
                      <div className="text-xs text-gray-500">
                        #{highlightMatch(pokemon.id.toString(), searchQuery)}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {pokemon.types.map((type) => (
                          <span
                            key={type}
                            className={`${TYPE_COLORS[type]} text-white px-2 py-0.5 rounded text-xs font-medium capitalize`}
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.length > 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-lg font-semibold mb-2 text-gray-600">No Results</div>
                <p>No Pokémon found matching "{searchQuery}"</p>
                <p className="text-sm mt-2">Try searching for a different name or number</p>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-lg font-semibold mb-2 text-gray-600">Search Pokémon</div>
                <p>Start typing a Pokémon name to find matches</p>
                <p className="text-sm mt-2 text-gray-400">Example: "pika", "char", "bulb"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
