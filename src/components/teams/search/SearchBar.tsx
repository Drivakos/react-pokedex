import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (term: string) => void;
  placeholder?: string;
  initialValue?: string;
  debounceTime?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search Pokémon, moves, abilities...",
  initialValue = "",
  debounceTime = 300,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  // Debounced search with useCallback to avoid recreating on every render
  const debouncedSearch = useCallback(
    (value: string) => {
      const handler = setTimeout(() => {
        onSearch(value);
      }, debounceTime);
      
      // Clean up the timeout if the component unmounts or if the search term changes
      return () => {
        clearTimeout(handler);
      };
    },
    [onSearch, debounceTime]
  );
  
  useEffect(() => {
    // Set up the debounce effect
    const cleanup = debouncedSearch(searchTerm);
    return cleanup;
  }, [searchTerm, debouncedSearch]);

  return (
    <div className="relative flex">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} className="text-gray-400" />
      </div>
      <input
        type="text"
        className="pl-10 w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;
