
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
import { UserPlus } from 'lucide-react';

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

  const openInviteDialog = () => {
    setIsInviteDialogOpen(true);
  };

  const closeInviteDialog = () => {
    setIsInviteDialogOpen(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Team Management</h1>
        
        <Button onClick={openInviteDialog}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>
      
      <EmailConfigWarning />
      
      {/* Team members list */}
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Team Members</h2>
          <p className="text-muted-foreground">
            Manage your team members and their roles.
          </p>
          
          <div className="border rounded-md">
            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <LoadingSpinner size="md" />
                <span className="ml-2 text-muted-foreground">Loading team members...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-destructive">
                Error loading team members: {error}
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-lg font-medium">No team members yet</p>
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
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {member.user_details?.name || 'Unknown User'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.user_details?.email || 'No email'}
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
                  ))}
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
