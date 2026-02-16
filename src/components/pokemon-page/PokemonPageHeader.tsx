import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import FavoritePokemon from '../FavoritePokemon';

interface PokemonPageHeaderProps {
  name: string;
  formattedId: string;
  id: number;
}

export const PokemonPageHeader: React.FC<PokemonPageHeaderProps> = ({ name, formattedId, id }) => {
  return (
    <header className="bg-red-600 text-white py-4">
      <div className="container mx-auto px-4">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </Link>
            <h1 className="text-3xl font-bold text-white capitalize">{name}</h1>
            <span className="text-xl font-semibold text-white opacity-80">#{formattedId}</span>
            <div className="ml-auto">
              <FavoritePokemon pokemonId={id} />
            </div>
          </div>
      </div>
    </header>
  );
};
