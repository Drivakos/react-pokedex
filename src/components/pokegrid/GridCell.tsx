import React from 'react';
import { Pokemon } from '../../types/pokemon';
import { formatName } from '../../utils/helpers';
import PokemonImage from '../PokemonImage';

export interface GridCellData {
  id: string;
  row: number;
  col: number;
  pokemon: Pokemon | null;
  isCorrect: boolean;
  attempts: number;
  rarity: number;
  isLocked: boolean;
  hasMistake?: boolean;
  mistakeCount?: number;
}

interface GridCellProps {
  cell: GridCellData;
  totalGuesses: number;
  maxTotalGuesses: number;
  onClick: (cell: GridCellData) => void;
}

export const GridCell: React.FC<GridCellProps> = ({ cell, totalGuesses, maxTotalGuesses, onClick }) => {
  const getCellStyle = () => {
    if (cell.isLocked) {
      return cell.isCorrect
        ? 'bg-green-100 border-2 border-green-500'
        : 'bg-red-100 border-2 border-red-500 opacity-75';
    }

    // Show red for mistake cells (wrong guess but can retry)
    if (cell.hasMistake) {
      return 'bg-red-100 border-2 border-red-500 hover:bg-red-200 cursor-pointer';
    }

    if (totalGuesses >= maxTotalGuesses) {
      return 'bg-gray-100 border-2 border-gray-300 opacity-75 cursor-not-allowed';
    }

    if (cell.attempts > 0) {
      return 'bg-yellow-50 border-2 border-yellow-400 hover:bg-yellow-100';
    }

    return 'bg-gray-200 hover:bg-blue-100 border-2 border-transparent hover:border-blue-400';
  };

  return (
    <div className="aspect-square border-l border-t border-white/20">
      <div
        onClick={() => onClick(cell)}
        className={`
          w-full h-full cursor-pointer transition-all duration-200 p-1 flex flex-col items-center justify-center relative
          ${getCellStyle()}
        `}
      >
        {cell.pokemon ? (
          <>
            <PokemonImage
              pokemonId={cell.pokemon.id}
              alt={cell.pokemon.name}
              className="w-50 h-50 object-contain mb-1"
            />
            {cell.isCorrect && (
              <div className="absolute top-1 right-1 text-green-600 text-sm">✓</div>
            )}
            {!cell.isCorrect && cell.pokemon && (
              <div className="absolute top-1 right-1 text-red-600 text-sm">✗</div>
            )}
          </>
        ) : (
          <>
          </>
        )}
      </div>
    </div>
  );
};
