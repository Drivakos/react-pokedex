import { supabase, Favorite } from '../../lib/supabase';
import toast from 'react-hot-toast';

type FavoritesMethodsProps = {
  user: any;
  refreshSession: () => Promise<any>;
  favorites: Favorite[];
  setFavorites: (favorites: Favorite[]) => void;
};

export interface FavoritesMethods {
  fetchFavorites: () => Promise<void>;
  addFavorite: (pokemonId: number) => Promise<void>;
  removeFavorite: (pokemonId: number) => Promise<void>;
  isFavorite: (pokemonId: number) => boolean;
}

export const FavoritesMethods = ({
  user,
  refreshSession,
  favorites,
  setFavorites
}: FavoritesMethodsProps): FavoritesMethods => {
  
  const fetchFavorites = async (): Promise<void> => {
    if (!user) {
      return;
    }

    try {
      const { success, session } = await refreshSession();
      
      if (!success || !session) {
        return;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching favorites:', error);
        return;
      }
      
      if (data) setFavorites(data as Favorite[]);
    } catch (err) {
      console.error('Unexpected error in fetchFavorites:', err);
    }
  };

  const addFavorite = async (pokemonId: number): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to add favorites');
      return;
    }

    try {
      const { success, session } = await refreshSession();
      
      if (!success || !session) {
        return;
      }

      const { error } = await supabase
        .from('favorites')
        .insert([{ user_id: user.id, pokemon_id: pokemonId }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('This Pokémon is already in your favorites');
        } else if (error.code === '42501' || error.message?.includes('permission denied')) {
          toast.error('You don\\'t have permission to add favorites. Please sign in again.');
        } else {
          toast.error('Failed to add to favorites');
        }
        return;
      }

      await fetchFavorites();
      toast.success('Added to favorites!');
    } catch (err) {
      toast.error('Failed to add to favorites');
      console.error('Unexpected error in addFavorite:', err);
    }
  };

  const removeFavorite = async (pokemonId: number): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to remove favorites');
      return;
    }

    try {
      const { success, session } = await refreshSession();
      
      if (!success || !session) {
        return;
      }

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('pokemon_id', pokemonId);

      if (error) {
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          toast.error('You don\\'t have permission to remove favorites. Please sign in again.');
        } else {
          toast.error('Failed to remove from favorites');
        }
        return;
      }

      setFavorites(favorites.filter(fav => fav.pokemon_id !== pokemonId));
      toast.success('Removed from favorites');
    } catch (err) {
      toast.error('Failed to remove from favorites');
      console.error('Unexpected error in removeFavorite:', err);
    }
  };

  const isFavorite = (pokemonId: number): boolean => {
    return favorites.some(fav => fav.pokemon_id === pokemonId);
  };

  return {
    fetchFavorites,
    addFavorite,
    removeFavorite,
    isFavorite
  };
};
