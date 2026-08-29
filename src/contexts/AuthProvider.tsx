import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../lib/supabase';
import authService from '../services/auth.service';
import toast from 'react-hot-toast';
import { AuthContext } from './auth-context';
import { useAuthFavorites } from './useAuthFavorites';
import { useAuthTeams } from './useAuthTeams';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { favorites, fetchFavorites, resetFavorites, addFavorite, removeFavorite, isFavorite } = useAuthFavorites(user);
  const {
    teams,
    teamsLoaded,
    teamsError,
    resetTeams,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addPokemonToTeam,
    removePokemonFromTeam,
    getTeamMembers,
    updateTeamMemberBuild,
    reorderTeamMembers,
  } = useAuthTeams(user);

  const signUp = useCallback(async (email: string, password: string) => {
    return await authService.signUp(email, password);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return await authService.signInWithEmail(email, password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return await authService.signInWithGoogle();
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    return await authService.signInWithMagicLink(email);
  }, []);

  const signOut = useCallback(async () => {
    return await authService.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    return await authService.resetPassword(email);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    return await authService.updatePassword(password);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) {
      toast.error('You must be logged in to update your profile');
      return { data: null, error: new Error('Not authenticated') };
    }

    const updatedProfile = await authService.updateProfile({
      ...updates,
      id: user.id
    });

    if (updatedProfile) {
      setProfile(updatedProfile);
      return { data: updatedProfile, error: null };
    }

    return { data: null, error: new Error('Failed to update profile') };
  }, [user]);
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const session = await authService.getSession();

        if (session) {
          setSession(session);
          setUser(session.user);

          if (session.user) {
            const userProfile = await authService.fetchProfile(session.user.id);
            if (userProfile) {
              setProfile(userProfile);
            }

            await fetchFavorites(session.user.id);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          resetFavorites();
          resetTeams();
        }
      } catch {
        setSession(null);
        setUser(null);
        setProfile(null);
        resetFavorites();
        resetTeams();
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        try {
          switch (event) {
            case 'SIGNED_IN':
              if (session) {
                setSession(session);
                setUser(session.user);

                if (session.user) {
                  const userProfile = await authService.fetchProfile(session.user.id);
                  if (userProfile) {
                    setProfile(userProfile);
                  } else {
                    await authService.ensureProfile(session.user.id, session.user.email);
                    const newProfile = await authService.fetchProfile(session.user.id);
                    setProfile(newProfile);
                  }

                  await fetchFavorites(session.user.id);
                }
              }
              break;

            case 'TOKEN_REFRESHED':
              if (session) {
                setSession(session);
                setUser(session.user);
              }
              break;

            case 'USER_UPDATED':
              if (session) {
                setSession(session);
                setUser(session.user);
              }
              break;

            case 'SIGNED_OUT':
              setSession(null);
              setUser(null);
              setProfile(null);
              resetFavorites();
              resetTeams();
              break;
          }
        } catch {
          return;
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchFavorites, resetFavorites, resetTeams]);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    favorites,
    teams,
    teamsLoaded,
    teamsError,
    loading,
    // Auth methods
    refreshSession: authService.refreshSession.bind(authService),
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    // Favorites methods
    addFavorite,
    removeFavorite,
    isFavorite,
    // Team methods
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addPokemonToTeam,
    removePokemonFromTeam,
    getTeamMembers,
    updateTeamMemberBuild,
    reorderTeamMembers
  }), [
    session, user, profile, favorites, teams, teamsLoaded, teamsError, loading,
    signUp, signIn, signInWithGoogle, signInWithMagicLink, signOut, 
    resetPassword, updatePassword, updateProfile,
    addFavorite, removeFavorite, isFavorite,
    fetchTeams, createTeam, updateTeam, deleteTeam, 
    addPokemonToTeam, removePokemonFromTeam, getTeamMembers, updateTeamMemberBuild,
    reorderTeamMembers
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
