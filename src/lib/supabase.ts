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
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'X-Pokedex-Client': 'React-Pokedex-App',
    },
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session ? 'User session exists' : 'No session');
  
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    console.log('User signed in or token refreshed');
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out, clearing any remaining auth data');
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('expires_in');
    localStorage.removeItem('provider_token');
    localStorage.removeItem('provider_refresh_token');
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
    console.error('Failed to ensure profile:', error);
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
