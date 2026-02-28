import React, { useState } from 'react';
import { PokemonDetails } from '../../types/pokemon';

interface PokemonMovesTabProps {
  pokemonDetails: PokemonDetails;
}

export const PokemonMovesTab: React.FC<PokemonMovesTabProps> = ({ pokemonDetails }) => {
  const [selectedMoveCategory, setSelectedMoveCategory] = useState<'all' | 'level-up' | 'machine' | 'egg' | 'tutor'>('all');

  const filteredMoves = selectedMoveCategory === 'all' 
    ? pokemonDetails.moves 
    : pokemonDetails.moves.filter(move => move.learn_method === selectedMoveCategory);

  const formatMoveName = (name: string) => {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Moves</h2>
      
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Moves' },
            { id: 'level-up', label: 'Level Up' },
            { id: 'machine', label: 'TM/HM' },
            { id: 'egg', label: 'Egg' },
            { id: 'tutor', label: 'Tutor' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedMoveCategory(cat.id as 'all' | 'level-up' | 'machine' | 'egg' | 'tutor')}
              className={`px-4 py-2 rounded-lg ${
                selectedMoveCategory === cat.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
      
      {filteredMoves.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMoves.map((move, index) => (
            <div 
              key={`move-${index}`}
              className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium capitalize">{formatMoveName(move.name)}</span>
                {move.learned_at_level > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Lv. {move.learned_at_level}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1 capitalize">
                {move.learn_method?.replace('-', ' ') || 'Unknown'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
          <p className="text-gray-600">No moves found in this category.</p>
        </div>
      )}
    </div>
  );
};
