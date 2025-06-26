import React from 'react';
import { GymType } from '../../utils/gym/types';
import { TYPE_COLORS } from '../../utils/gym/constants';

interface TypeSelectionProps {
  onTypeSelect: (type: GymType) => void;
}

const TypeSelection: React.FC<TypeSelectionProps> = ({ onTypeSelect }) => {
  const gymTypes: GymType[] = [
    'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 
    'dragon', 'dark', 'steel', 'fairy', 'fighting', 'poison', 
    'ground', 'flying', 'bug', 'rock', 'ghost', 'normal'
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Choose Your Gym Type</h2>
      <p className="text-gray-600 mb-6">
        Select the type specialization for your gym. You'll get 3 strong Pokémon options to choose from.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
        {gymTypes.map((type) => (
          <button
            key={type}
            onClick={() => onTypeSelect(type)}
            className="p-4 rounded-lg border-2 border-gray-300 hover:border-gray-500 transition-colors"
            style={{ backgroundColor: TYPE_COLORS[type] + '20' }}
          >
            <div className="text-center">
              <div 
                className="w-8 h-8 rounded-full mx-auto mb-2"
                style={{ backgroundColor: TYPE_COLORS[type] }}
              ></div>
              <div className="font-bold capitalize text-sm">{type}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TypeSelection; 