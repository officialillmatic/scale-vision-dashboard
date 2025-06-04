
import { supabase } from "@/integrations/supabase/client";

export interface TeamMemberProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  company_id?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
}

// Add the missing CompanyMember type alias
export type CompanyMember = TeamMemberProfile;

export async function fetchTeamMembers(companyId?: string): Promise<TeamMemberProfile[]> {
  try {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: profiles, error } = await query;

    if (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }

    return profiles?.map(profile => ({
      id: profile.id,
      email: profile.email || undefined,
      full_name: profile.full_name || undefined,
      avatar_url: profile.avatar_url || undefined,
      role: profile.role || 'user',
      company_id: profile.company_id || undefined,
      created_at: profile.created_at,
      last_sign_in_at: profile.last_sign_in_at || undefined,
      email_confirmed_at: profile.email_confirmed_at || undefined
    })) || [];
  } catch (error) {
    console.error('Error in fetchTeamMembers:', error);
    return [];
  }
}

export async function updateMemberRole(memberId: string, newRole: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      console.error('Error updating member role:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateMemberRole:', error);
    return false;
  }
}

export async function removeMember(memberId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeMember:', error);
    return false;
  }
}
