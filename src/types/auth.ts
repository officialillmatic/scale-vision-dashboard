import { Session, User } from "@supabase/supabase-js";

export interface Company {
  id: string;
  name: string;
  owner_id: string;
  logo_url?: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  user_details?: {
    id: string;
    email: string;
    name: string;
    avatar_url: string;
  };
}

export interface AuthContextType {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  isLoadingCompany: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, options?: { metadata?: any }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateUserProfile: (data: { name?: string; avatar_url?: string }) => Promise<void>;
  isCompanyLoading: boolean;
  refreshCompany: () => Promise<void>;
  companyMembers: CompanyMember[];
  userRole: string | null;
  isCompanyOwner: boolean;
}

export interface AuthSession {
  session: Session | null
}
