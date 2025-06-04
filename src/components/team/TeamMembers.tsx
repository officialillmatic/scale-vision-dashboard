
import React, { useState, useCallback } from 'react';
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
import { UserPlus, Users, AlertCircle, RefreshCw, Bug } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function TeamMembers() {
  const { company } = useAuth();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [debugMode, setDebugMode] = useState(true); // Activar debug por defecto
  
  const { 
    teamMembers,
    isLoading,
    error,
    isInviting,
    handleInvite,
    fetchInvitations
  } = useTeamMembers(company?.id);

  // Logging intensivo para debugging
  React.useEffect(() => {
    console.log("🚨 [DEBUG] TeamMembers - ESTADO ACTUAL:");
    console.log("🚨 [DEBUG] - Company ID:", company?.id);
    console.log("🚨 [DEBUG] - Team members recibidos:", teamMembers);
    console.log("🚨 [DEBUG] - Team members count:", teamMembers?.length);
    console.log("🚨 [DEBUG] - Is loading:", isLoading);
    console.log("🚨 [DEBUG] - Error:", error);
    console.log("🚨 [DEBUG] - Force refresh key:", forceRefreshKey);
    
    if (teamMembers && teamMembers.length > 0) {
      console.log("🚨 [DEBUG] - MIEMBROS DETALLE:");
      teamMembers.forEach((member, index) => {
        console.log(`🚨 [DEBUG] - Miembro ${index + 1}:`, {
          id: member.id,
          email: member.user_details?.email,
          name: member.user_details?.name,
          role: member.role,
          status: member.status
        });
      });
    } else {
      console.log("🚨 [DEBUG] - ❌ NO HAY MIEMBROS - Esto es el problema!");
    }
  }, [teamMembers, isLoading, error, company?.id, forceRefreshKey]);

  const forceRefresh = useCallback(() => {
    console.log("🔄 [DEBUG] FORZANDO REFRESH MANUAL");
    setForceRefreshKey(prev => prev + 1);
    if (fetchInvitations) {
      fetchInvitations();
    }
    // Forzar reload completo de la página si es necesario
    setTimeout(() => {
      if (!teamMembers || teamMembers.length === 0) {
        console.log("🔄 [DEBUG] Reload completo de página como último recurso");
        window.location.reload();
      }
    }, 2000);
  }, [fetchInvitations, teamMembers]);

  const openInviteDialog = () => {
    setIsInviteDialogOpen(true);
  };

  const closeInviteDialog = () => {
    setIsInviteDialogOpen(false);
  };

  const handleRefresh = async () => {
    console.log("🔄 [DEBUG] Refresh normal iniciado");
    if (fetchInvitations) {
      await fetchInvitations();
    }
    setForceRefreshKey(prev => prev + 1);
  };

  // Usar teamMembers directamente del hook
  const validTeamMembers = teamMembers || [];

  console.log("🚨 [DEBUG] RENDER - Valid team members para mostrar:", validTeamMembers.length);

  return (
    <div className="space-y-8" key={`team-members-${forceRefreshKey}`}>
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
          {debugMode && (
            <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
              <Bug className="h-3 w-3 mr-1" />
              DEBUG: {validTeamMembers.length} miembros
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={forceRefresh} 
            size="sm"
            className="bg-red-600 hover:bg-red-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            FORCE REFRESH
          </Button>
          <Button variant="outline" onClick={handleRefresh} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openInviteDialog} disabled={isInviting || isLoading}>
            <UserPlus className="mr-2 h-4 w-4" />
            {isInviting ? "Inviting..." : "Invite Member"}
          </Button>
        </div>
      </div>
      
      <EmailConfigWarning />
      
      {/* Debug panel temporal */}
      {debugMode && (
        <Alert className="border-orange-200 bg-orange-50">
          <Bug className="h-4 w-4" />
          <AlertDescription>
            <strong>DEBUG INFO:</strong><br />
            Company ID: {company?.id || 'undefined'}<br />
            Team Members Count: {validTeamMembers.length}<br />
            Is Loading: {isLoading ? 'YES' : 'NO'}<br />
            Error: {error || 'None'}<br />
            Force Key: {forceRefreshKey}
            {validTeamMembers.length > 0 && (
              <>
                <br />Emails: {validTeamMembers.map(m => m.user_details?.email).join(', ')}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Team members list */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Team Members</h2>
            {!isLoading && validTeamMembers.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {validTeamMembers.length} team members
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
                  Error loading team members: {error}
                  <br />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={forceRefresh}
                    className="mt-2"
                  >
                    Try Force Refresh
                  </Button>
                </AlertDescription>
              </Alert>
            ) : validTeamMembers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No team members found</p>
                <p className="text-sm">This should show 7 confirmed users!</p>
                <div className="mt-4 space-y-2">
                  <Button 
                    variant="destructive" 
                    onClick={forceRefresh}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    🚨 FORCE LOAD MEMBERS
                  </Button>
                  <p className="text-xs text-gray-400">
                    Debug: Company ID: {company?.id || 'undefined'} | Key: {forceRefreshKey}
                  </p>
                </div>
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
                          <div className="text-sm text-muted-foreground">
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
