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
      if (!userId) return;

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
        return;
      }
      
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        console.error('No user found when creating profile');
        return;
      }
      
      const email = userData.user.email;
      const username = userData.user.user_metadata?.full_name || 
                      userData.user.user_metadata?.name || 
                      (email ? email.split('@')[0] : null) || 
                      `user_${userId.substring(0, 8)}`;
      
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username
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
      
      const { success } = await refreshSession();
      if (!success) {
        return { data: null, error: new Error('Session refresh failed') };
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) {
        toast.error('Failed to update profile');
        return { data: null, error };
      }
      
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
