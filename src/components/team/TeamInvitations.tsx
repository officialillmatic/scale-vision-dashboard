import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCompanyInvitations, cancelInvitation, resendInvitation } from '@/services/invitation';
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
    refetch
  } = useQuery({
    queryKey: ['company-invitations', company?.id],
    queryFn: () => company?.id ? fetchCompanyInvitations(company.id) : Promise.resolve([]),
    enabled: !!company?.id
  });

  const handleResend = async (invitationId: string) => {
    if (!company) return;
    
    setIsProcessing(invitationId);
    try {
      await resendInvitation(invitationId);
      refetch();
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancel = async (invitationId: string) => {
    if (!company) return;
    
    setIsProcessing(invitationId);
    try {
      await cancelInvitation(invitationId);
      refetch();
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

  // Filter to only show pending invitations
  const pendingInvitations = invitations?.filter(inv => inv.status === 'pending') || [];
  
  if (!company) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Pending Invitations</h2>
      
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
                    <TableCell>{invitation.created_at.toLocaleDateString()}</TableCell>
                    <TableCell>{invitation.expires_at.toLocaleDateString()}</TableCell>
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
                    No pending invitations found.
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
