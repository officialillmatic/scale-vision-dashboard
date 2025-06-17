import { manualMigratePendingUsers } from '@/services/teamMigration';
import { Upload } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { TeamInvitations } from './TeamInvitations';
import { TeamInviteDialog } from './TeamInviteDialog';
import { EmailConfigWarning } from '@/components/common/EmailConfigWarning';
import { UserPlus, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function TeamMembers() {
  const { company } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
const companyIdToUse = isSuperAdmin ? undefined : company?.id;

console.log("🔥 [TEAM_MEMBERS] isSuperAdmin:", isSuperAdmin);
console.log("🔥 [TEAM_MEMBERS] companyIdToUse:", companyIdToUse);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  
  const { 
    teamMembers,
    isLoading,
    error,
    isInviting,
    handleInvite,
    fetchInvitations
  } = useTeamMembers(companyIdToUse);

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

  // NUEVA FUNCIÓN: Migración Automática de Usuarios Registrados
  const handleMigrateUsers = async () => {
    if (!company?.id) {
      toast.error('No company ID found');
      return;
    }

    setIsMigrating(true);
    
    try {
      console.log('🚀 [MIGRATION] Starting automatic user migration...');
      toast.info('Iniciando migración de usuarios...');
      
      // Ejecutar la migración
      const result = await manualMigratePendingUsers(company.id);
      
      console.log('📊 [MIGRATION] Result:', result);
      
      if (result.success) {
        if (result.count && result.count > 0) {
          toast.success(
            `✅ Migración exitosa: ${result.count} usuario(s) agregado(s) al equipo`,
            {
              description: `Usuarios migrados: ${result.users?.join(', ') || 'Ver consola para detalles'}`,
              duration: 5000
            }
          );
          
          console.log('✅ [MIGRATION] Migrated users:', result.users);
          
          // Refrescar la lista después de la migración
          setTimeout(() => {
            handleRefresh();
          }, 1000);
          
        } else {
          toast.info('ℹ️ No se encontraron usuarios que requieran migración');
        }
      } else {
        toast.error(`❌ Error en migración: ${result.message}`);
        console.error('❌ [MIGRATION] Error:', result.error);
      }
      
    } catch (error: any) {
      console.error('💥 [MIGRATION] Unexpected error:', error);
      toast.error(`💥 Error inesperado: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleEditRole = (member: any) => {
    console.log('Edit role for:', member.email);
    alert(`Edit role for ${member.email}\nCurrent role: ${member.role}`);
  };

  const handleRemoveUser = async (member: any) => {
    // Security confirmation
    const confirmed = window.confirm(
      `Are you sure you want to remove ${member.email} from the team?\n\nThis action will:\n- Remove their profile\n- Remove from company members\n- Delete their invitations\n- Allow them to be re-invited`
    );
    
    if (!confirmed) return;
    
    try {
      console.log('🗑️ Cleaning user for re-invite:', member.email);
      console.log('🗑️ Member ID:', member.id);
      
      // Use cleanup function that preserves auth account
      const { data, error } = await supabase.rpc('cleanup_user_for_reinvite', {
        user_id_to_clean: member.id
      });
      
      console.log('🗑️ Cleanup result:', data);
      console.log('🗑️ Cleanup error:', error);
      
      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }
      
      if (data && data.success) {
        toast.success(`${member.email} removed from team (can be re-invited)`);
        console.log('✅ User cleaned successfully, refreshing page...');
        // Force refresh after successful cleanup
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error('❌ Cleanup failed:', data);
        toast.error(`Error: ${data?.message || 'Could not remove user'}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error cleaning user:', error);
      toast.error(`Error removing user: ${error.message}`);
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
{isSuperAdmin && (
            <Button 
              variant="outline" 
              onClick={handleMigrateUsers} 
              disabled={isMigrating || isLoading}
              size="sm"
              className="bg-green-50 border-green-200 hover:bg-green-100"
            >
              {isMigrating ? (
                <>
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2" />
                  Migrando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Migrar Usuarios
                </>
              )}
            </Button>
          )}
          
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
