import React, { memo } from 'react';
import { Search } from 'lucide-react';

// Helper function to format move names
const formatMoveName = (move: string): string => {
  return move
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface MovesFilterProps {
  availableMoves: string[];
  selectedMoves: string[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onMoveToggle: (move: string) => void;
}

export const MovesFilter: React.FC<MovesFilterProps> = memo(({
  availableMoves,
  selectedMoves,
  searchTerm,
  onSearchChange,
  onMoveToggle
}) => {
  // Filter moves based on search term
  const filteredMoves = availableMoves
    .filter(move => {
      const formattedMove = move.toLowerCase().replace(/-/g, ' ');
      const search = searchTerm.toLowerCase();
      return formattedMove.includes(search) || move.toLowerCase().includes(search);
    })
    .slice(0, 20);

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search moves..."
          className="w-full p-2 pl-10 border border-gray-300 rounded-md"
          data-component-name="PokedexHome"
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
        {filteredMoves.map(move => (
          <button
            key={move}
            onClick={() => onMoveToggle(move)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:opacity-90 mb-2 ${
              selectedMoves.includes(move) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {formatMoveName(move)}
          </button>
        ))}
      </div>
      
      {filteredMoves.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          No moves found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
});

export default MovesFilter;
