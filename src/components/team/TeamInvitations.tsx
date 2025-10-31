import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCompanyInvitations } from '@/services/invitation';
import { cancelInvitation, resendInvitation } from '@/services/invitation/invitationActions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  MoreHorizontal, 
  Loader, 
  RefreshCw, 
  X, 
  Bug, 
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ✅ NUEVA FUNCIÓN: Eliminar invitación completamente
const deleteInvitationCompletely = async (invitationId: string) => {
  console.log("🗑️ [deleteInvitation] Deleting invitation completely:", invitationId);
  
  try {
    // Eliminar de team_invitations
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error("❌ [deleteInvitation] Error deleting from team_invitations:", deleteError);
      throw new Error(`Failed to delete invitation: ${deleteError.message}`);
    }

    console.log("✅ [deleteInvitation] Invitation deleted successfully");
    return { success: true, message: "Invitation deleted completely" };

  } catch (error: any) {
    console.error("💥 [deleteInvitation] Unexpected error:", error);
    throw new Error(`Failed to delete invitation: ${error.message}`);
  }
};

// ✅ NUEVA FUNCIÓN: Eliminar múltiples invitaciones
const deleteManyInvitations = async (invitationIds: string[]) => {
  console.log("🗑️ [deleteManyInvitations] Deleting multiple invitations:", invitationIds.length);
  
  try {
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .in('id', invitationIds);

    if (deleteError) {
      console.error("❌ [deleteManyInvitations] Error deleting from team_invitations:", deleteError);
      throw new Error(`Failed to delete invitations: ${deleteError.message}`);
    }

    console.log("✅ [deleteManyInvitations] Invitations deleted successfully");
    return { 
      success: true, 
      message: `${invitationIds.length} invitations deleted completely`,
      deletedCount: invitationIds.length 
    };

  } catch (error: any) {
    console.error("💥 [deleteManyInvitations] Unexpected error:", error);
    throw new Error(`Failed to delete invitations: ${error.message}`);
  }
};

export function TeamInvitations() {
  const { company } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  
  // ✅ NUEVOS ESTADOS: Para selección múltiple
  const [selectedInvitations, setSelectedInvitations] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const {
    data: invitations,
    isLoading,
    refetch,
    error
  } = useQuery({
    queryKey: ['company-invitations', company?.id],
    queryFn: () => company?.id ? fetchCompanyInvitations(company.id) : Promise.resolve([]),
    enabled: !!company?.id,
    refetchInterval: 5000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('403') || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Listen for new team member registrations
  useEffect(() => {
    const handleTeamMemberRegistered = (event: CustomEvent) => {
      console.log('🔄 [TeamInvitations] Team member registered, refreshing invitations...', event.detail);
      setTimeout(() => {
        refetch();
      }, 2000);
    };

    window.addEventListener('teamMemberRegistered', handleTeamMemberRegistered as EventListener);
    
    return () => {
      window.removeEventListener('teamMemberRegistered', handleTeamMemberRegistered as EventListener);
    };
  }, [refetch]);

  // ✅ NUEVA FUNCIÓN: Manejar selección individual
  const handleSelectInvitation = (invitationId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvitations(prev => [...prev, invitationId]);
    } else {
      setSelectedInvitations(prev => prev.filter(id => id !== invitationId));
      setSelectAll(false);
    }
  };

  // ✅ NUEVA FUNCIÓN: Manejar selección de todas
  const handleSelectAll = (checked: boolean) => {
    if (checked && invitations) {
      setSelectedInvitations(invitations.map(inv => inv.id));
      setSelectAll(true);
    } else {
      setSelectedInvitations([]);
      setSelectAll(false);
    }
  };

  // ✅ NUEVA FUNCIÓN: Eliminar invitación completamente
  const handleDeleteCompletely = async (invitationId: string) => {
    if (!company) return;
    
    setIsProcessing(invitationId);
    try {
      await deleteInvitationCompletely(invitationId);
      await refetch();
      toast.success("✅ Invitación eliminada completamente");
    } catch (error: any) {
      console.error("Error deleting invitation completely:", error);
      toast.error(`❌ Error al eliminar: ${error.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  // ✅ NUEVA FUNCIÓN: Eliminar múltiples invitaciones
  const handleDeleteSelected = async () => {
    if (selectedInvitations.length === 0) {
      toast.error("No hay invitaciones seleccionadas");
      return;
    }

    setIsProcessing('delete-multiple');
    try {
      await deleteManyInvitations(selectedInvitations);
      await refetch();
      toast.success(`✅ ${selectedInvitations.length} invitaciones eliminadas`);
      setSelectedInvitations([]);
      setSelectAll(false);
    } catch (error: any) {
      console.error("Error deleting multiple invitations:", error);
      toast.error(`❌ Error al eliminar: ${error.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  // ✅ FUNCIONES ORIGINALES: Mantener las existentes
  const handleResend = async (invitationId: string) => {
    if (!company) return;
    
    setIsProcessing(invitationId);
    try {
      await resendInvitation(invitationId);
      refetch();
      toast.success("Invitation resent successfully");
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast.error("Failed to resend invitation");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancel = async (invitationId: string) => {
    if (!company) return;
    
    setIsProcessing(invitationId);
    try {
      await cancelInvitation(invitationId);
      await refetch();
      toast.success("Invitation cancelled successfully");
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleForceRefresh = async () => {
    console.log('🔄 [DEBUG] Force refreshing invitations...');
    setIsProcessing('force-refresh');
    
    try {
      await refetch();
      
      if (company?.id) {
        console.log('🔍 [DEBUG] Checking database directly...');
        
        const { data: rawInvitations } = await supabase
          .from('company_invitations_raw')
          .select('*')
          .eq('company_id', company.id)
          .eq('status', 'pending');
        
        console.log('📋 [DEBUG] Raw pending invitations in DB:', rawInvitations?.length || 0);
        
        const { data: confirmedUsers } = await supabase
          .from('profiles')
          .select('email, email_confirmed_at')
          .not('email_confirmed_at', 'is', null);
        
        console.log('👥 [DEBUG] Confirmed users in DB:', confirmedUsers?.length || 0);
        
        const pendingEmails = rawInvitations?.map(inv => inv.email.toLowerCase()) || [];
        const confirmedEmails = confirmedUsers?.map(user => user.email.toLowerCase()) || [];
        const overlap = pendingEmails.filter(email => confirmedEmails.includes(email));
        
        if (overlap.length > 0) {
          console.warn('⚠️ [DEBUG] PROBLEM FOUND - Confirmed users still in pending invitations:', overlap);
          toast.error(`Found ${overlap.length} confirmed users still in pending invitations!`);
        } else {
          console.log('✅ [DEBUG] No overlap found - system working correctly');
          toast.success('No synchronization issues found');
        }
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error in force refresh:', error);
      toast.error('Error during force refresh');
    } finally {
      setIsProcessing(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'member':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'viewer':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'accepted':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'expired':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const pendingInvitations = invitations || [];
  
  if (!company) {
    return null;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Pending Invitations</h2>
        <Card className="p-6">
          <div className="text-center text-destructive">
            Error loading invitations. Please check your permissions.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pending Invitations</h2>
        <div className="flex items-center gap-2">
          {pendingInvitations.length > 0 && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              {pendingInvitations.length} pending
            </Badge>
          )}

          {/* ✅ NUEVO: Botón para eliminar seleccionadas */}
          {selectedInvitations.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteSelected}
              disabled={isProcessing === 'delete-multiple'}
            >
              {isProcessing === 'delete-multiple' ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar {selectedInvitations.length}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDebugMode(!debugMode)}
            className={debugMode ? 'bg-red-50 border-red-200' : ''}
          >
            <Bug className="mr-2 h-4 w-4" />
            Debug
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleForceRefresh} 
            size="sm" 
            disabled={isProcessing === 'force-refresh'}
            className="bg-blue-50 border-blue-200"
          >
            {isProcessing === 'force-refresh' ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Force Refresh
          </Button>
          
          <Button variant="outline" onClick={() => refetch()} size="sm" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* ✅ NUEVO: Debug info */}
      {debugMode && (
        <Card className="p-4 bg-gray-50 border-gray-200">
          <h3 className="font-semibold mb-2">🐛 Debug Information</h3>
          <div className="text-sm space-y-1">
            <p><strong>Company ID:</strong> {company.id}</p>
            <p><strong>Total Pending:</strong> {pendingInvitations.length}</p>
            <p><strong>Selected:</strong> {selectedInvitations.length}</p>
            <p><strong>Last Refresh:</strong> {new Date().toLocaleTimeString()}</p>
          </div>
        </Card>
      )}
      
      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {/* ✅ NUEVA COLUMNA: Selección con checkbox HTML nativo */}
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={pendingInvitations.length === 0}
                    className="h-4 w-4"
                  />
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <LoadingSpinner size="md" className="mx-auto" />
                  </TableCell>
                </TableRow>
              ) : pendingInvitations.length > 0 ? (
                pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    {/* ✅ NUEVA COLUMNA: Checkbox individual HTML nativo */}
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedInvitations.includes(invitation.id)}
                        onChange={(e) => handleSelectInvitation(invitation.id, e.target.checked)}
                        className="h-4 w-4"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {invitation.email}
                      {debugMode && (
                        <div className="text-xs text-gray-500">ID: {invitation.id}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(invitation.role)}>{invitation.role}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(invitation.created_at)}</TableCell>
                    <TableCell>{formatDate(invitation.expires_at)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(invitation.status)}>{invitation.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isProcessing === invitation.id ? (
                        <Button disabled variant="ghost" size="icon">
                          <Loader className="h-4 w-4 animate-spin" />
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleResend(invitation.id)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Resend
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleCancel(invitation.id)}>
                              <X className="mr-2 h-4 w-4" />
                              Cancel (solo status)
                            </DropdownMenuItem>
                            {/* ✅ NUEVA OPCIÓN: Eliminar completamente */}
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteCompletely(invitation.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              🗑️ Eliminar Completamente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-muted-foreground">No pending invitations found.</span>
                      <span className="text-sm text-muted-foreground">
                        Invitations automatically move to Team Members when accepted.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
