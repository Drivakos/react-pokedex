import React, { useState, useEffect } from 'react';
import { Pokemon } from '../../types/pokemon';
import { GridConstraint } from './types';
import { checkConstraint } from '../../utils/pokegrid-game.utils';
import PokemonImage from '../PokemonImage';

interface HintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCell: {
    id: string;
    rowConstraint: GridConstraint;
    colConstraint: GridConstraint;
  } | null;
  allPokemon: Pokemon[];
  onHintUsed: () => void;
  hintsRemaining: number;
}

interface HintData {
  validPokemon: Pokemon[];
  totalValid: number;
  typeHints: string[];
  generationHint: string;
  statHints: string[];
  examplePokemon: Pokemon[];
}

export const HintModal: React.FC<HintModalProps> = ({
  isOpen,
  onClose,
  selectedCell,
  allPokemon,
  onHintUsed,
  hintsRemaining
}) => {
  const [hintData, setHintData] = useState<HintData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedCell) {
      generateHint();
    }
  }, [isOpen, selectedCell]);

  const generateHint = async () => {
    if (!selectedCell) return;
    
    setLoading(true);
    
    // Find all Pokemon that satisfy both constraints
    const validPokemon = allPokemon.filter(pokemon => 
      checkConstraint(pokemon, selectedCell.rowConstraint) &&
      checkConstraint(pokemon, selectedCell.colConstraint)
    );

    // Generate type hints
    const typeFrequency: Record<string, number> = {};
    validPokemon.forEach(pokemon => {
      pokemon.types.forEach(type => {
        typeFrequency[type] = (typeFrequency[type] || 0) + 1;
      });
    });

    const commonTypes = Object.entries(typeFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => `${type} (${count} Pokémon)`);

    // Generate generation hint
    const generationFrequency: Record<string, number> = {};
    validPokemon.forEach(pokemon => {
      const gen = pokemon.generation || 'unknown';
      generationFrequency[gen] = (generationFrequency[gen] || 0) + 1;
    });

    const mostCommonGen = Object.entries(generationFrequency)
      .sort(([,a], [,b]) => b - a)[0];

    // Generate stat hints (if available)
    const statHints: string[] = [];
    if (validPokemon.some(p => p.stats)) {
      const avgStats = validPokemon
        .filter(p => p.stats)
        .reduce((acc, pokemon) => {
          if (pokemon.stats) {
            acc.hp += pokemon.stats.hp;
            acc.attack += pokemon.stats.attack;
            acc.defense += pokemon.stats.defense;
            acc.speed += pokemon.stats.speed;
          }
          return acc;
        }, { hp: 0, attack: 0, defense: 0, speed: 0 });

      const count = validPokemon.filter(p => p.stats).length;
      if (count > 0) {
        avgStats.hp = Math.round(avgStats.hp / count);
        avgStats.attack = Math.round(avgStats.attack / count);
        avgStats.defense = Math.round(avgStats.defense / count);
        avgStats.speed = Math.round(avgStats.speed / count);

        statHints.push(`Average HP: ${avgStats.hp}`);
        statHints.push(`Average Attack: ${avgStats.attack}`);
        statHints.push(`Average Speed: ${avgStats.speed}`);
      }
    }

    // Get 3 random example Pokemon (without revealing names)
    const shuffled = [...validPokemon].sort(() => Math.random() - 0.5);
    const examplePokemon = shuffled.slice(0, 3);

    setHintData({
      validPokemon,
      totalValid: validPokemon.length,
      typeHints: commonTypes,
      generationHint: mostCommonGen ? `Most from ${mostCommonGen[0]} (${mostCommonGen[1]} Pokémon)` : 'Mixed generations',
      statHints,
      examplePokemon
    });

    setLoading(false);
  };

  const handleUseHint = () => {
    onHintUsed();
    onClose();
  };

  if (!isOpen || !selectedCell) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Hint</h2>
              <p className="text-sm text-gray-600">
                {selectedCell.rowConstraint.label} × {selectedCell.colConstraint.label}
              </p>
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

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Generating hint...</p>
            </div>
          ) : hintData ? (
            <div className="space-y-4">
              {/* Total Valid Pokemon */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">{hintData.totalValid}</div>
                <div className="text-sm text-blue-600">Valid Pokémon for this cell</div>
              </div>

              {/* Type Hints */}
              {hintData.typeHints.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="font-semibold text-green-700 mb-2">Common Types:</div>
                  <div className="space-y-1">
                    {hintData.typeHints.map((hint, index) => (
                      <div key={index} className="text-sm text-green-600">{hint}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generation Hint */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="font-semibold text-purple-700 mb-2">Generation:</div>
                <div className="text-sm text-purple-600">{hintData.generationHint}</div>
              </div>

              {/* Stat Hints */}
              {hintData.statHints.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="font-semibold text-orange-700 mb-2">Average Stats:</div>
                  <div className="space-y-1">
                    {hintData.statHints.map((hint, index) => (
                      <div key={index} className="text-sm text-orange-600">{hint}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Example Pokemon (silhouettes) */}
              {hintData.examplePokemon.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="font-semibold text-gray-700 mb-2">Example Pokémon (silhouettes):</div>
                  <div className="flex gap-2 justify-center">
                    {hintData.examplePokemon.map((pokemon, index) => (
                      <div key={index} className="text-center">
                        <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center">
                          <PokemonImage
                            pokemonId={pokemon.id}
                            alt="Silhouette"
                            className="w-12 h-12 filter brightness-0 opacity-50"
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">#{pokemon.id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Use Hint Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleUseHint}
                  disabled={hintsRemaining <= 0}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                    hintsRemaining > 0
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Use Hint ({hintsRemaining} remaining)
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Unable to generate hint.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};