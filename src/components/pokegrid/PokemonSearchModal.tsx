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
  selectedCell: {
    rowConstraint: { label: string; icon: string };
    colConstraint: { label: string; icon: string };
    guessesLeft: number;
  } | null;
}

export const PokemonSearchModal: React.FC<PokemonSearchModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  searchResults,
  onPokemonSelect,
  selectedCell
}) => {
  if (!isOpen || !selectedCell) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Select Pokémon</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <span>{selectedCell.rowConstraint.icon}</span>
                  <span>{selectedCell.rowConstraint.label}</span>
                </div>
                <span>+</span>
                <div className="flex items-center gap-1">
                  <span>{selectedCell.colConstraint.icon}</span>
                  <span className="whitespace-pre-line">{selectedCell.colConstraint.label}</span>
                </div>
              </div>
              <div className="text-xs text-orange-600 font-medium mt-1">
                {selectedCell.guessesLeft} guess{selectedCell.guessesLeft !== 1 ? 'es' : ''} remaining
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
            <input
              type="text"
              placeholder="Search Pokémon by name or number..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
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
                        {formatName(pokemon.name)}
                      </div>
                      <div className="text-xs text-gray-500">#{pokemon.id}</div>
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
            ) : searchQuery.length > 1 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-2xl mb-2">🔍</div>
                <p>No Pokémon found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-2xl mb-2">⌨️</div>
                <p>Start typing to search for Pokémon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
