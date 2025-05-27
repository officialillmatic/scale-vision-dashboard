
export type Role = 'admin' | 'member' | 'viewer';

export interface PermissionSet {
  manageTeam: boolean;
  manageAgents: boolean;
  viewAgents: boolean;
  createAgents: boolean;
  assignAgents: boolean;
  deleteAgents: boolean;
  viewCalls: boolean;
  uploadCalls: boolean;
  manageBalances: boolean;
  viewBalance: boolean;
  accessBillingSettings: boolean;
  editSettings: boolean;
  uploadCompanyLogo: boolean;
  inviteUsers: boolean;
  removeUsers: boolean;
  sendInvitations: boolean;
  superAdminAccess: boolean;
}
