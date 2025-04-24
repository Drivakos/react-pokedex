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
      setIsFavorite(false); 
      return;
    }
    const isCurrentlyFavorite = isFavorite(pokemonId);
    console.log(`Checking if Pokemon #${pokemonId} is favorite: ${isCurrentlyFavorite}`);
    setIsFavorite(isCurrentlyFavorite); 
  }, [user, pokemonId, isFavorite]); 

  useEffect(() => {
    if (user) {
      checkIfFavorite();
    } else {
      setIsFavorite(false); 
    }
  }, [user, pokemonId, checkIfFavorite]); 

  const toggleFavorite = async (event: React.MouseEvent<HTMLButtonElement>) => { 
    event.stopPropagation(); 
    
    // Prevent action if still loading from a previous click
    if (loading) {
      return;
    }

    if (!user) {
      toast.error('Please log in to add favorites');
      window.location.href = '/login?redirect=' + window.location.pathname;
      return;
    }

    try {
      setLoading(true);
      console.log(`Toggling favorite status for Pokemon #${pokemonId}`);

      if (isFavorited) {
        console.log('Removing from favorites');
        await removeFavorite(pokemonId);
        setIsFavorite(false);
      } else {
        console.log('Adding to favorites');
        await addFavorite(pokemonId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Could not update favorites');
      // If there was an error, recheck the state
      checkIfFavorite();
    } finally {
      // Add a small delay before setting loading to false to prevent rapid clicking
      setTimeout(() => {
        setLoading(false);
      }, 300);
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
