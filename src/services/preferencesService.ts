
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserPreferences {
  id?: string;
  user_id?: string;
  theme: 'light' | 'dark' | 'system';
  email_notifications_calls: boolean;
  email_notifications_agents: boolean;
  display_units_time: 'minutes' | 'hours';
  display_units_currency: 'USD' | 'EUR' | 'GBP';
  preferred_graph_type: 'bar' | 'line' | 'pie';
  dashboard_layout: '1-column' | '2-column';
  visible_dashboard_cards: {
    total_cost: boolean;
    call_outcomes: boolean;
    recent_calls: boolean;
    agent_performance: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

export const defaultPreferences: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  theme: 'system',
  email_notifications_calls: true,
  email_notifications_agents: true,
  display_units_time: 'minutes',
  display_units_currency: 'USD',
  preferred_graph_type: 'bar',
  dashboard_layout: '2-column',
  visible_dashboard_cards: {
    total_cost: true,
    call_outcomes: true,
    recent_calls: true,
    agent_performance: true
  }
};

export async function getUserPreferences(userId?: string): Promise<UserPreferences | null> {
  try {
    // Ensure we have a user ID, or get the current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    const effectiveUserId = userId || user?.id;
    
    if (!effectiveUserId) {
      console.error('No user ID provided and no authenticated user');
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', effectiveUserId)
      .single();
      
    if (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }
    
    return data as UserPreferences;
  } catch (error) {
    console.error('Error in getUserPreferences:', error);
    return null;
  }
}

export async function updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences | null> {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      toast.error("User authentication required to update preferences");
      return null;
    }
    
    // Ensure we have the user_id in the updates
    const updatesWithUserId = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Update user preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .update(updatesWithUserId)
      .eq('user_id', user.id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating user preferences:', error);
      toast.error("Failed to update preferences");
      return null;
    }
    
    toast.success("Preferences updated successfully");
    return data as UserPreferences;
  } catch (error) {
    console.error('Error in updateUserPreferences:', error);
    toast.error("Failed to update preferences");
    return null;
  }
}

export async function createDefaultUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    if (!userId) {
      console.error('No user ID provided');
      return null;
    }
    
    const newPreferences = {
      user_id: userId,
      ...defaultPreferences
    };
    
    const { data, error } = await supabase
      .from('user_preferences')
      .insert(newPreferences)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating default user preferences:', error);
      return null;
    }
    
    return data as UserPreferences;
  } catch (error) {
    console.error('Error in createDefaultUserPreferences:', error);
    return null;
  }
}

export async function ensureUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    if (!userId) {
      console.error('No user ID provided');
      return null;
    }
    
    // Try to get the user's preferences
    const prefs = await getUserPreferences(userId);
    if (prefs) return prefs;
    
    // If no preferences exist, create default ones
    return await createDefaultUserPreferences(userId);
  } catch (error) {
    console.error('Error in ensureUserPreferences:', error);
    return null;
  }
}
