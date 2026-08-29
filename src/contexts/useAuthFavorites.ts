import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { supabase, type Favorite } from '../lib/supabase';
import { withAuthSession } from '../services/auth.service';

export function useAuthFavorites(user: User | null) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const resetFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  const fetchFavorites = useCallback(async (userId: string) => {
    const result = await withAuthSession(async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        return [];
      }

      return data as Favorite[];
    });

    if (result.data) {
      setFavorites(result.data);
    }
  }, []);

  const addFavorite = useCallback(async (pokemonId: number) => {
    if (!user) {
      toast.error('You must be logged in to add favorites');
      return;
    }

    const result = await withAuthSession(async () => {
      const { error } = await supabase
        .from('favorites')
        .insert([{ user_id: user.id, pokemon_id: pokemonId }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('This Pokémon is already in your favorites');
        } else if (error.code === '42501' || error.message?.includes('permission denied')) {
          toast.error('You don\'t have permission to add favorites. Please sign in again.');
        } else {
          toast.error('Failed to add to favorites');
        }
        return false;
      }

      return true;
    });

    if (result.data) {
      await fetchFavorites(user.id);
      toast.success('Added to favorites!');
    }
  }, [user, fetchFavorites]);

  const removeFavorite = useCallback(async (pokemonId: number) => {
    if (!user) {
      toast.error('You must be logged in to remove favorites');
      return;
    }

    const result = await withAuthSession(async () => {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('pokemon_id', pokemonId);

      if (error) {
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          toast.error('You don\'t have permission to remove favorites. Please sign in again.');
        } else {
          toast.error('Failed to remove from favorites');
        }
        return false;
      }

      return true;
    });

    if (result.data) {
      setFavorites(favorites.filter(fav => fav.pokemon_id !== pokemonId));
      toast.success('Removed from favorites');
    }
  }, [user, favorites]);

  const isFavorite = useCallback((pokemonId: number): boolean => {
    return favorites.some(fav => fav.pokemon_id === pokemonId);
  }, [favorites]);

  useEffect(() => {
    if (!user) {
      resetFavorites();
    }
  }, [user, resetFavorites]);

  return { favorites, fetchFavorites, resetFavorites, addFavorite, removeFavorite, isFavorite };
}
