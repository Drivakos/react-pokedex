import { createClient } from '@supabase/supabase-js';

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
    storage: localStorage,
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
  } else {
    // User signed out - no debug log needed
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
    
    authItems.forEach(item => {
      localStorage.removeItem(item);
    });
  }
});

// Initialize session
const initializeSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // No session - no debug log needed
      return;
    }

    if (session) {
      // Initial session exists - no debug log needed
    }
  } catch (error) {
    console.error('Error initializing session:', error);
  }
};

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
    console.error('Failed to ensure profile:', error);
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
}
