import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration is incomplete. Authentication will not work.');
}

const supabaseOptions = {
  auth: {
    storageKey: 'pokedex_auth_token',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'X-Pokedex-Client': 'React-Pokedex-App',
    },
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

supabase.auth.onAuthStateChange((event, session) => {
  // Silent auth state change handling for production
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
    // Silent error handling for production
  }
}

export interface Profile {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  updated_at?: string | null;
  created_at?: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  pokemon_id: number;
  created_at: string;
};
