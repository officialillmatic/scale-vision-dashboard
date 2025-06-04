
import { Session, User } from "@supabase/supabase-js";

export interface Company {
  id: string;
  name: string;
  owner_id: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_details?: {
    email: string;
    name?: string;
  };
}

export interface AuthContextType {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  isCompanyLoading: boolean;
  userRole: string | null;
  isCompanyOwner: boolean;
  isSuperAdmin: boolean;
  companyMembers: CompanyMember[];
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  updateUserProfile: (data: { name?: string; avatar_url?: string }) => Promise<void>;
}

export interface AuthSession {
  session: Session | null
}
