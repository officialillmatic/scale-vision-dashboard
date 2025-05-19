
import { User } from "@supabase/supabase-js";

export interface Company {
  id: string;
  name: string;
  owner_id: string;
  logo_url: string | null;
}

export type CompanyMember = {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  created_at: Date;
  updated_at: Date;
  user_details?: {
    email: string;
    name?: string;
  };
};

export interface AuthContextType {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  isLoadingCompany: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, options?: { metadata?: any }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (updatedPassword: string) => Promise<void>;
  updateUserProfile: (data: { name?: string; avatar_url?: string }) => Promise<void>;
  isCompanyLoading: boolean;
  refreshCompany: () => Promise<void>;
  companyMembers: CompanyMember[];
  userRole: 'admin' | 'member' | 'viewer' | null;
  isCompanyOwner: boolean;
}
