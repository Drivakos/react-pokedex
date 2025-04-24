import { Team as SupabaseTeam } from '../lib/supabase';

// This interface represents a Pokemon that's part of a team
export interface PokemonTeamMember {
  id: number;
  name: string;
  types: {
    type: {
      name: string;
    };
  }[];
  sprites?: {
    front_default?: string;
    back_default?: string;
    front_shiny?: string;
    back_shiny?: string;
    official_artwork?: string;
  };
}

// Omit the members property from the original Team type
type TeamBase = Omit<SupabaseTeam, 'members'>;

// Create a new TeamWithPokemon interface that extends the base Team properties
// but uses our custom members structure
export interface TeamWithPokemon extends TeamBase {
  members: Record<number, PokemonTeamMember | null>;
}
