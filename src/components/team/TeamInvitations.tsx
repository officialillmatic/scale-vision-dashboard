
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
import { MoreHorizontal, Loader, RefreshCw, X } from 'lucide-react';

export function TeamInvitations() {
  const { company } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const {
    data: invitations,
    isLoading,
    refetch,
    error
  } = useQuery({
    queryKey: ['company-invitations', company?.id],
    queryFn: () => company?.id ? fetchCompanyInvitations(company.id) : Promise.resolve([]),
    enabled: !!company?.id,
    refetchInterval: 10000, // Auto-refresh every 10 seconds to catch status changes
    retry: (failureCount, error) => {
      // Don't retry on 403 or 401 errors
      if (error?.message?.includes('403') || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Listen for new team member registrations to refresh the invitations list
  useEffect(() => {
    const handleTeamMemberRegistered = (event: CustomEvent) => {
      console.log('🔄 Team member registered, refreshing invitations...', event.detail);
      refetch();
    };

    window.addEventListener('teamMemberRegistered', handleTeamMemberRegistered as EventListener);
    
    return () => {
      window.removeEventListener('teamMemberRegistered', handleTeamMemberRegistered as EventListener);
    };
  }, [refetch]);

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

  // All invitations are already filtered by the API to only show truly pending ones
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
          <Button variant="outline" onClick={() => refetch()} size="sm" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    <LoadingSpinner size="md" className="mx-auto" />
                  </TableCell>
                </TableRow>
              ) : pendingInvitations.length > 0 ? (
                pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
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
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleCancel(invitation.id)}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
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
