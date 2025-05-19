
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandling";

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

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

    return data || [];
  } catch (error) {
    console.error("Error fetching user profiles:", error);
    return [];
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> => {
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

    toast.success("Profile updated successfully");
    return data;
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to update profile"
    });
    return null;
  }
};

export const getUserByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
};
