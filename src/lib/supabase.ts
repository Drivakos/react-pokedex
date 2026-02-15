import { createClient } from '@supabase/supabase-js';
import { getAuthStorage } from './auth-storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration is incomplete. Authentication will not work.');
}

const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: getAuthStorage(), // Use custom storage adapter
    flowType: 'pkce' as const,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
      'X-Pokedex-Client': 'React-Pokedex-App',
    },
    fetch: fetch.bind(globalThis) // Ensure consistent fetch implementation
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Setup basic auth state change listener - following Supabase docs exactly
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    // User signed in - no debug log needed
  } else if (event === 'SIGNED_OUT') {
    // User signed out - clean up both storage types
    // IMPORTANT: Don't clear PKCE-related items immediately as they might be needed
    const authItems = [
      'supabase.auth.token',
      'access_token',
      'refresh_token',
      'expires_at',
      'expires_in',
      'provider_token',
      'provider_refresh_token',
      'sb-' + supabaseUrl.split('//')[1].split('.')[0] + '-auth-token'
    ];

    // Clear localStorage (but preserve PKCE items temporarily)
    authItems.forEach(item => {
      localStorage.removeItem(item);
    });

    // Clear cookies
    authItems.forEach(item => {
      document.cookie = `${item}=; path=/; max-age=0`;
    });

    // Clear PKCE items after a short delay to ensure they're not needed
    setTimeout(() => {
      const pkceItems = ['pkce', 'code_verifier', 'auth-flow'];
      pkceItems.forEach(item => {
        localStorage.removeItem(item);
        document.cookie = `${item}=; path=/; max-age=0`;
      });
    }, 5000); // 5 second delay
  }
});


export async function ensureProfile(userId: string, email?: string): Promise<void> {
  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          updated_at: new Date().toISOString()
        });
    }
  } catch (error) {
    // Silently handle profile creation errors
  }
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

export type Favorite = {
  id: number;
  user_id: string;
  pokemon_id: number;
  created_at?: string;
}

export interface Team {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: number;
  team_id: number;
  pokemon_id: number;
  position: number;
  created_at?: string;
  updated_at?: string;
  // Build data fields
  moves?: string[];
  item?: string;
  ability?: string;
  nature?: string;
  evs?: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
  ivs?: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
  level?: number;
  nickname?: string;
  is_shiny?: boolean;
  gender?: 'male' | 'female' | 'genderless';
  tera_type?: string;
}
