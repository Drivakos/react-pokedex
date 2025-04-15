import { supabase, Profile } from '../../lib/supabase';
import toast from 'react-hot-toast';

type ProfileMethodsProps = {
  user: any;
  refreshSession: () => Promise<any>;
  setProfile: (profile: Profile | null) => void;
};

export interface ProfileMethods {
  createProfile: (userId: string) => Promise<void>;
  refreshProfile: (userId: string) => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<{
    data: Profile | null;
    error: any | null;
  }>;
}

export const ProfileMethods = ({
  user,
  refreshSession,
  setProfile
}: ProfileMethodsProps): ProfileMethods => {
  
  const createProfile = async (userId: string): Promise<void> => {
    try {
      // Skip if no userId provided
      if (!userId) return;

      // Check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking profile existence:', fetchError);
        return;
      }
      
      if (existingProfile) {
        return; // Profile already exists
      }
      
      // Get user data
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        console.error('No user found when creating profile');
        return;
      }
      
      // Extract username from email or metadata
      const email = userData.user.email;
      const username = userData.user.user_metadata?.full_name || 
                      userData.user.user_metadata?.name || 
                      (email ? email.split('@')[0] : null) || 
                      `user_${userId.substring(0, 8)}`;
      
      // Create new profile
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error creating profile:', error);
      }
    } catch (error) {
      console.error('Unexpected error in createProfile:', error);
    }
  };

  const refreshProfile = async (userId: string): Promise<void> => {
    try {
      // Skip if no userId provided
      if (!userId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      setProfile(data as Profile);
    } catch (error) {
      console.error('Unexpected error in refreshProfile:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{
    data: Profile | null;
    error: any | null;
  }> => {
    try {
      if (!user) {
        toast.error('You must be logged in to update your profile');
        return { data: null, error: new Error('Not authenticated') };
      }
      
      // Refresh session before update
      const { success } = await refreshSession();
      if (!success) {
        return { data: null, error: new Error('Session refresh failed') };
      }
      
      // Update profile
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) {
        toast.error('Failed to update profile');
        return { data: null, error };
      }
      
      // Update local state
      setProfile(data as Profile);
      toast.success('Profile updated successfully');
      
      return { data: data as Profile, error: null };
    } catch (error) {
      toast.error('An unexpected error occurred');
      return { data: null, error };
    }
  };

  return {
    createProfile,
    refreshProfile,
    updateProfile
  };
};
