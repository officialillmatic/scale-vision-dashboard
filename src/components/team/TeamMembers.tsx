
import React, { useState } from 'react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useQuery } from '@tanstack/react-query';
import { fetchCompany } from '@/services/companyService';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
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
import { TeamInviteDialog } from './TeamInviteDialog';
import { TeamInvitations } from './TeamInvitations';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function TeamMembers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { company } = useAuth();
  
  // Use the company from auth context instead of fetching it again
  const { 
    teamMembers, 
    isLoading: isLoadingMembers, 
    isInviting,
    handleInvite 
  } = useTeamMembers(company?.id);

  const isLoading = isLoadingMembers;

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
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Team Members</h2>
          <Button onClick={() => setIsDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
        
        <Card>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <LoadingSpinner size="md" className="mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.user_details?.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(member.role)}>{member.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(member.status)}>{member.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No team members found. Invite someone to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
      
      {/* Pending Invitations */}
      <TeamInvitations />
      
      <TeamInviteDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onInvite={(email, role) => handleInvite(email, role)}
        isInviting={isInviting}
      />
    </div>
  );
}
