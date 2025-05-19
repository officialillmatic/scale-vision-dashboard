
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandling";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Fetches a user profile by ID
 */
export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    // First try to get from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!profileError && profileData) {
      return {
        id: profileData.id,
        email: profileData.email,
        name: profileData.name,
        avatar_url: profileData.avatar_url,
        created_at: new Date(profileData.created_at),
        updated_at: new Date(profileData.updated_at)
      };
    }

    // If not found in profiles, get from auth.users (fallback)
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError) {
      throw userError;
    }

    if (userData?.user) {
      // Create a profile for this user for future queries
      const { error: insertError } = await supabase.from("user_profiles").insert({
        id: userData.user.id,
        email: userData.user.email,
        name: userData.user.user_metadata?.name || null,
        avatar_url: userData.user.user_metadata?.avatar_url || null
      });

      if (insertError) {
        console.warn("Could not create user profile:", insertError);
      }

      return {
        id: userData.user.id,
        email: userData.user.email!,
        name: userData.user.user_metadata?.name || null,
        avatar_url: userData.user.user_metadata?.avatar_url || null,
        created_at: new Date(userData.user.created_at),
        updated_at: new Date(userData.user.updated_at || userData.user.created_at)
      };
    }

    return null;
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to fetch user profile",
      showToast: false // Don't show toast for this as it might be a fallback operation
    });
    return null;
  }
};

/**
 * Updates a user profile
 */
export const updateUserProfile = async (profile: Partial<UserProfile> & { id: string }): Promise<boolean> => {
  try {
    // Update the profiles table
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert({
        id: profile.id,
        name: profile.name,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      throw profileError;
    }

    // Also update the auth metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        name: profile.name,
        avatar_url: profile.avatar_url
      }
    });

    if (authError) {
      throw authError;
    }

    toast.success("Profile updated successfully");
    return true;
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to update profile"
    });
    return false;
  }
};

/**
 * Fetches multiple user profiles by ID
 */
export const fetchUserProfiles = async (userIds: string[]): Promise<UserProfile[]> => {
  if (!userIds.length) return [];
  
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .in("id", userIds);

    if (error) {
      throw error;
    }

    return data.map(profile => ({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatar_url: profile.avatar_url,
      created_at: new Date(profile.created_at),
      updated_at: new Date(profile.updated_at)
    }));
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to fetch user profiles",
      showToast: false
    });
    return [];
  }
};
