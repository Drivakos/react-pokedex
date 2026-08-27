import type { TeamMember } from '../lib/supabase';

export interface TeamPokemonData {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  types: Array<{ type: { name: string } }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  abilities: unknown[];
}

export interface MovesetBuildData {
  moves?: string[];
  heldItem?: string;
  ability?: string;
  nature?: string;
  evs?: TeamMember['evs'];
  ivs?: TeamMember['ivs'];
  gender?: TeamMember['gender'] | null;
  teraType?: string;
  nickname?: string;
  isShiny?: boolean;
}
