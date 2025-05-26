
import { supabase } from '@/integrations/supabase/client';

export const useUserProfile = () => {
  const updateUserProfile = async (data: { name?: string; avatar_url?: string }) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!userData.user) {
        throw new Error("No user logged in");
      }
      
      // Update user profile in Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: data.name,
          avatar_url: data.avatar_url
        })
        .eq('id', userData.user.id);
        
      if (error) {
        throw error;
      }
      
      console.log('Profile updated successfully');
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  return {
    updateUserProfile
  };
};
