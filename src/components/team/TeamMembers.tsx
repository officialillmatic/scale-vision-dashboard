import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TeamInvitations } from './TeamInvitations';
import { TeamInviteDialog } from './TeamInviteDialog';
import { EmailConfigWarning } from '@/components/common/EmailConfigWarning';
import { UserPlus, Users, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export function TeamMembers() {
  const { company } = useAuth();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  
  const { 
    teamMembers,
    isLoading,
    error,
    isInviting,
    handleInvite
  } = useTeamMembers(company?.id);

  console.log("🔍 [TeamMembers] Rendering with data:", {
    companyId: company?.id,
    isLoading,
    error,
    teamMembersCount: teamMembers?.length,
    teamMembers: teamMembers
  });

  const openInviteDialog = () => {
    setIsInviteDialogOpen(true);
  };

  const closeInviteDialog = () => {
    setIsInviteDialogOpen(false);
  };

  // Triple validation to ensure no invalid users are displayed (already filtered for regular users only)
  const validTeamMembers = teamMembers?.filter(member => {
    // Check for basic member structure
    if (!member || !member.user_id) {
      console.warn("🔍 [TeamMembers] Filtering out member without user_id:", member);
      return false;
    }

    // Check for user details
    if (!member.user_details) {
      console.warn("🔍 [TeamMembers] Filtering out member without user_details:", member);
      return false;
    }

    // Check for valid email
    if (!member.user_details.email || member.user_details.email.trim() === '') {
      console.warn("🔍 [TeamMembers] Filtering out member with invalid email:", member);
      return false;
    }

    return true;
  }) || [];

  console.log("🔍 [TeamMembers] Final valid regular user team members:", validTeamMembers);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="border rounded-md">
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Management
          </h1>
          {!isLoading && validTeamMembers.length > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {validTeamMembers.length} members
            </Badge>
          )}
        </div>
        
        <Button onClick={openInviteDialog} disabled={isInviting || isLoading}>
          <UserPlus className="mr-2 h-4 w-4" />
          {isInviting ? "Inviting..." : "Invite Member"}
        </Button>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          This section shows regular team members only. Super admins and system administrators are not displayed here.
        </AlertDescription>
      </Alert>
      
      <EmailConfigWarning />
      
      {/* Team members list */}
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Team Members</h2>
          <p className="text-muted-foreground">
            Manage your regular team members and their roles.
          </p>
          
          <div className="border rounded-md">
            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <LoadingSpinner size="md" />
                <span className="ml-2 text-muted-foreground">Loading team members...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="m-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error loading team members: {error}
                </AlertDescription>
              </Alert>
            ) : validTeamMembers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No regular team members yet</p>
                <p className="text-sm">Invite team members to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validTeamMembers.map((member) => {
                    const userDetails = member.user_details!; // Safe because we filtered above
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {userDetails.name || userDetails.email.split('@')[0] || 'Team Member'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {userDetails.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={member.status === 'active' ? 'default' : 'outline'}
                            className="capitalize"
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {/* Future: Add edit/remove actions */}
                            —
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </Card>
      
      {/* Pending invitations section */}
      <TeamInvitations />
      
      {/* Invite dialog */}
      <TeamInviteDialog
        isOpen={isInviteDialogOpen}
        onClose={closeInviteDialog}
        onInvite={handleInvite}
        isInviting={isInviting}
      />
    </div>
  );
}
