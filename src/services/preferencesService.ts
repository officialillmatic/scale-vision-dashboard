
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

export async function getUserPreferences(): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
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
    const { data, error } = await supabase
      .from('user_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
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
    const { data, error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        ...defaultPreferences
      })
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
  const prefs = await getUserPreferences();
  if (prefs) return prefs;
  
  return await createDefaultUserPreferences(userId);
}
