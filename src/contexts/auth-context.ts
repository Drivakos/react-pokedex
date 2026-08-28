import { createContext } from 'react';
import type { AuthError, AuthResponse, OAuthResponse, Session, User } from '@supabase/supabase-js';
import type { Favorite, Profile, Team, TeamMember, TeamWithJoinedMembers } from '../lib/supabase';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  favorites: Favorite[];
  teams: TeamWithJoinedMembers[];
  teamsLoaded: boolean;
  teamsError: string | null;
  loading: boolean;
  refreshSession: () => Promise<Session | null>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<OAuthResponse>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (profile: Partial<Profile>) => Promise<{
    data: Profile | null;
    error: Error | null;
  }>;
  addFavorite: (pokemonId: number) => Promise<void>;
  removeFavorite: (pokemonId: number) => Promise<void>;
  isFavorite: (pokemonId: number) => boolean;
  fetchTeams: () => Promise<boolean>;
  createTeam: (name: string, description?: string) => Promise<Team | null>;
  updateTeam: (teamId: number, name: string, description?: string) => Promise<boolean>;
  deleteTeam: (teamId: number) => Promise<boolean>;
  addPokemonToTeam: (
    teamId: number,
    pokemonId: number,
    position: number,
    buildData?: Partial<TeamMember>,
  ) => Promise<TeamMember | null>;
  removePokemonFromTeam: (teamId: number, position: number) => Promise<boolean>;
  getTeamMembers: (teamId: number) => Promise<TeamMember[]>;
  updateTeamMemberBuild: (
    teamId: number,
    position: number,
    buildData: Partial<TeamMember>,
  ) => Promise<TeamMember | null>;
  reorderTeamMembers: (teamId: number, memberIds: number[]) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
