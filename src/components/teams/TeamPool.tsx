import { useState, useMemo } from 'react';
import type { PokemonDetails } from '../../types/pokemon';
import { TYPE_COLORS } from '../../types/pokemon';
import PokemonImage from '../common/PokemonImage';
import { Search, ChevronRight, ChevronLeft, Info } from 'lucide-react';

interface TeamPoolProps {
  pool: PokemonDetails[];
  selected: PokemonDetails | null;
  onSelect: (pokemon: PokemonDetails) => void;
}

const TeamPool = ({ pool, selected, onSelect }: TeamPoolProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [infoVisible, setInfoVisible] = useState(false);
  const itemsPerPage = 6; // Show 6 Pokémon at a time

  // Filter and paginate the pool
  const filteredPool = useMemo(() => {
    return pool.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.types.some(type => type.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [pool, searchTerm]);

  const totalPages = Math.ceil(filteredPool.length / itemsPerPage);
  const pageStart = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredPool.slice(pageStart, pageStart + itemsPerPage);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
  <div className="mb-6 w-full bg-white rounded-lg shadow p-4">
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center">
        <h3 className="text-lg font-semibold">Available Pokémon</h3>
        <button 
          className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none" 
          onClick={() => setInfoVisible(!infoVisible)}
          aria-label="Information about pool"
        >
          <Info size={16} />
        </button>
      </div>
      <div className="text-sm text-gray-500">
        Showing {Math.min(filteredPool.length, pageStart + 1)}-{Math.min(filteredPool.length, pageStart + itemsPerPage)} of {filteredPool.length}
      </div>
    </div>
    
    {infoVisible && (
      <div className="mb-3 p-3 bg-blue-50 text-blue-800 text-sm rounded-md">
        <p>This is your collection of available Pokémon. Select one and use the "Add Pokémon" button on any team to add it.</p>
      </div>
    )}
    
    <div className="relative flex mb-3">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} className="text-gray-400" />
      </div>
      <input
        type="text"
        className="pl-10 w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Search by name or type..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1); // Reset to first page on search
        }}
      />
    </div>
    
    {filteredPool.length === 0 ? (
      <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-md">
        No Pokémon found matching '{searchTerm}'
      </div>
    ) : (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-3">
          {currentItems.map(p => (
            <div
              key={p.id}
              className={`p-2 bg-white border rounded-lg flex flex-col items-center cursor-pointer transition-all duration-200 hover:shadow-md ${selected?.id === p.id ? 'ring-2 ring-blue-500 shadow-md transform scale-105' : 'hover:scale-105'}`}
              onClick={() => onSelect(p)}
            >
              <div className="relative w-full flex justify-center">
                <PokemonImage
                  pokemon={p}
                  fallbackId={p.id}
                  alt={p.name}
                  size="md"
                />
                {selected?.id === p.id && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    ✓
                  </div>
                )}
              </div>
              <span className="text-xs mt-1 capitalize font-medium truncate w-full text-center">{p.name}</span>
              <div className="flex flex-wrap justify-center gap-1 mt-1">
                {p.types.map(type => (
                  <span
                    key={type}
                    className={`${TYPE_COLORS[type] || 'bg-gray-300'} text-white text-xs px-1 py-0.5 rounded capitalize`}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`flex items-center px-2 py-1 text-sm rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
            >
              <ChevronLeft size={16} className="mr-1" /> Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`flex items-center px-2 py-1 text-sm rounded ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
            >
              Next <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        )}
      </>
    )}
  </div>
);
};

export default TeamPool;
