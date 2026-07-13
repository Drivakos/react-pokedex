import React from 'react';
import { SearchBar } from './SearchBar';

interface HomeHeaderProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  isSearching: boolean;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  isSearching,
}) => {
  return (
    <header>
      <div className="mb-2 flex justify-center px-4 pt-4 md:mb-6" data-component-name="PokedexHome">
        <div className="w-full max-w-2xl" data-component-name="PokedexHome">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            isSearching={isSearching}
            showFilterButton={false}
          />
        </div>
      </div>
    </header>
  );
};
