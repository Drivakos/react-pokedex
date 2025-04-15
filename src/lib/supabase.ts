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
      'X-Pokedex-Client': 'React-Pokedex-App',
    },
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session ? 'User session exists' : 'No session');
  
  if (event === 'SIGNED_IN') {
    if (session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    }
  } else if (event === 'TOKEN_REFRESHED') {
    if (session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    }
  } else if (event === 'SIGNED_OUT') {
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
  updated_at?: string;
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
