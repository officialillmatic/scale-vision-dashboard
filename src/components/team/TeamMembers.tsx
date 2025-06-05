
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
import { UserPlus, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { manualMigratePendingUsers } from '@/services/teamMigration';

export function TeamMembers() {
  const { company } = useAuth();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  
  const { 
    teamMembers,
    isLoading,
    error,
    isInviting,
    handleInvite,
    fetchInvitations
  } = useTeamMembers(company?.id);

  const openInviteDialog = () => {
    setIsInviteDialogOpen(true);
  };

  const closeInviteDialog = () => {
    setIsInviteDialogOpen(false);
  };

  const handleRefresh = async () => {
    if (fetchInvitations) {
      await fetchInvitations();
    }
  };

  const handleEditRole = (member: any) => {
    console.log('Edit role for:', member.email);
    alert(`Edit role for ${member.email}\nCurrent role: ${member.role}`);
  };

  const handleRemoveUser = (member: any) => {
    console.log('Remove user:', member.email);
    // TODO: Implement user removal functionality
  };

  const handleForceMigration = () => {
    console.log('🔄 Force refresh clicked');
    window.location.reload();
  };

  // ✅ NEW: Manual migration function
  const handleManualMigration = async () => {
    if (!company?.id) {
      alert('No company ID available');
      return;
    }

    setIsMigrating(true);
    console.log('🚀 MANUAL MIGRATION: Moving pending users to team members');
    
    try {
      // Get users pending that have profile
      const { data: profiles } = await supabase.from('profiles').select('email');
      const { data: pending } = await supabase
        .from('company_invitations_raw')
        .select('email')
        .eq('company_id', company.id)
        .eq('status', 'pending');
      
      const profileEmails = new Set(profiles?.map(p => p.email?.toLowerCase()));
      const toMigrate = pending?.filter(p => profileEmails.has(p.email.toLowerCase()));
      
      console.log('Users to migrate:', toMigrate?.map(u => u.email));
      
      if (toMigrate && toMigrate.length > 0) {
        const result = await manualMigratePendingUsers(company.id);
        
        if (result.success) {
          alert(`✅ Success! Migrated ${result.count} users: ${result.users?.join(', ')}`);
          // Force refresh after successful migration
          window.location.reload();
        } else {
          alert(`❌ Migration failed: ${result.message}`);
        }
      } else {
        alert('No users found to migrate');
      }
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration failed with error');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Management
          </h1>
          {!isLoading && teamMembers.length > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {teamMembers.length} members
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={handleForceMigration}
            size="sm"
            className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
          >
            🔄 Force Migrate Users
          </Button>
          {/* ✅ NEW: Manual migration button */}
          <Button 
            variant="destructive" 
            onClick={handleManualMigration}
            disabled={isMigrating}
            size="sm"
          >
            {isMigrating ? '⏳ Migrating...' : '🔧 MANUAL MIGRATE'}
          </Button>
          <Button onClick={openInviteDialog} disabled={isInviting || isLoading}>
            <UserPlus className="mr-2 h-4 w-4" />
            {isInviting ? "Inviting..." : "Invite Member"}
          </Button>
        </div>
      </div>
      
      <EmailConfigWarning />
      
      {/* Team members list */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Team Members</h2>
            {!isLoading && teamMembers.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {teamMembers.length} team members
              </div>
            )}
          </div>
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
              <Alert variant="destructive" className="m-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error loading team members: {typeof error === 'string' ? error : 'Unknown error'}
                </AlertDescription>
              </Alert>
            ) : teamMembers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No team members found</p>
                <p className="text-sm">Invite team members to get started</p>
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
                  {teamMembers.map((member) => {
                    const userDetails = member.user_details!;
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
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditRole(member)}
                            >
                              Edit Role
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveUser(member)}
                            >
                              Remove
                            </Button>
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
