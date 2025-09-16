import React from 'react';
import { Pokemon } from '../../types/pokemon';
import { formatName, getOfficialArtwork } from '../../utils/helpers';

export interface GridCellData {
  id: string;
  row: number;
  col: number;
  pokemon: Pokemon | null;
  isCorrect: boolean;
  attempts: number;
  rarity: number;
  isLocked: boolean;
  guessesLeft: number;
}

interface GridCellProps {
  cell: GridCellData;
  maxGuesses: number;
  onClick: (cell: GridCellData) => void;
}

export const GridCell: React.FC<GridCellProps> = ({ cell, maxGuesses, onClick }) => {
  const getCellStyle = () => {
    if (cell.isLocked) {
      return cell.isCorrect 
        ? 'bg-green-100 border-2 border-green-500' 
        : 'bg-red-100 border-2 border-red-500 opacity-75';
    }
    
    if (cell.guessesLeft < maxGuesses) {
      return 'bg-yellow-50 border-2 border-yellow-400 hover:bg-yellow-100';
    }
    
    return 'bg-gray-50 hover:bg-blue-50 border-2 border-transparent hover:border-blue-300';
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
            <img
              src={getOfficialArtwork(cell.pokemon.sprites)}
              alt={cell.pokemon.name}
              className="w-14 h-14 object-contain mb-1"
            />
            <div className="text-xs font-medium text-center truncate w-full text-gray-800">
              {formatName(cell.pokemon.name)}
            </div>
            {cell.isCorrect && (
              <div className="absolute top-1 right-1 text-green-600 text-sm">✓</div>
            )}
            {!cell.isCorrect && cell.pokemon && (
              <div className="absolute top-1 right-1 text-red-600 text-sm">✗</div>
            )}
          </>
        ) : (
          <>
            <div className="text-gray-400 text-3xl">?</div>
            {cell.guessesLeft < maxGuesses && (
              <div className="absolute bottom-1 right-1 bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {cell.guessesLeft}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
