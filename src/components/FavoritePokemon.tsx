import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';

interface FavoritePokemonProps {
  pokemonId: number;
}

const FavoritePokemon: React.FC<FavoritePokemonProps> = ({ pokemonId }) => {
  const { user, addFavorite, removeFavorite, isFavorite } = useAuth();
  const [isFavorited, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkIfFavorite = useCallback(() => {
    if (!user) {
      return;
    }

    // Use the context's isFavorite function
    setIsFavorite(isFavorite(pokemonId));
  }, [user, pokemonId, isFavorite]);

  useEffect(() => {
    if (user) {
      const timeoutId = setTimeout(() => {
        checkIfFavorite();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user?.id, pokemonId]);

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please log in to add favorites');
      window.location.href = '/login?redirect=' + window.location.pathname;
      return;
    }

    try {
      setLoading(true);

      if (isFavorited) {
        await removeFavorite(pokemonId);
        setIsFavorite(false);
      } else {
        await addFavorite(pokemonId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Could not update favorites');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`flex items-center justify-center p-2 transition-colors ${
        isFavorited 
          ? 'text-red-500 hover:text-red-600' 
          : 'text-gray-500 hover:text-gray-700'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart 
        className={`h-6 w-6 ${isFavorited ? 'fill-current' : ''}`} 
      />
    </button>
  );
};

export default FavoritePokemon;
