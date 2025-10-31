
export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  expires_at: string;
  created_at: string;
  invited_by?: string;
  company_name?: string;
}

export interface InvitationCheckResult {
  valid: boolean;
  invitation?: CompanyInvitation;
  company?: {
    id: string;
    name: string;
  };
  error?: string;
}

export type InvitationRole = 'admin' | 'member' | 'viewer';
