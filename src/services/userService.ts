
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/errorHandling";

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    };
  } catch (error) {
    console.error("Error in fetchUserProfile:", error);
    return null;
  }
};

export const fetchUserProfiles = async (userIds: string[]): Promise<UserProfile[]> => {
  try {
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .in("id", userIds);

    if (error) {
      console.error("Error fetching user profiles:", error);
      return [];
    }

    return (data || []).map(profile => ({
      ...profile,
      created_at: new Date(profile.created_at),
      updated_at: new Date(profile.updated_at)
    }));
  } catch (error) {
    console.error("Error in fetchUserProfiles:", error);
    return [];
  }
};

export const updateUserProfile = async (
  userId: string, 
  updates: Partial<Omit<UserProfile, "id" | "created_at" | "updated_at">>
): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    };
  } catch (error) {
    console.error("Error updating user profile:", error);
    handleError(error, {
      fallbackMessage: "Failed to update user profile"
    });
    return null;
  }
};
