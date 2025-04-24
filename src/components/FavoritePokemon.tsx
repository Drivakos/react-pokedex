import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';

interface FavoritePokemonProps {
  pokemonId: number;
}

const FavoritePokemon: React.FC<FavoritePokemonProps> = ({ pokemonId }) => {
  const { user, addFavorite, removeFavorite, isFavorite, favorites } = useAuth();
  const [loading, setLoading] = useState(false);
  const [favorited, setFavorited] = useState(false);
  
  useEffect(() => {
    if (user) {
      const isFav = isFavorite(pokemonId);
      setFavorited(isFav);
    } else {
      setFavorited(false);
    }
  }, [user, pokemonId, favorites, isFavorite]);

  const toggleFavorite = async (event: React.MouseEvent<HTMLButtonElement>) => { 
    event.stopPropagation(); 
    
    if (loading) {
      return;
    }

    if (!user) {
      toast.error('Please log in to add favorites');
      return; 
    }

    try {
      setLoading(true);
      const newState = !favorited;
      setFavorited(newState);
      if (newState) {
        await addFavorite(pokemonId);
      } else {
        await removeFavorite(pokemonId);
      }

    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
      setFavorited(!favorited);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`flex items-center justify-center p-2 transition-colors ${
        favorited 
          ? 'text-red-500 hover:text-red-600' 
          : 'text-gray-500 hover:text-gray-700'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      data-component-name="FavoritePokemon"
    >
      <Heart 
        className={`h-6 w-6 ${favorited ? 'fill-current' : ''}`} 
      />
    </button>
  );
};

export default FavoritePokemon;
