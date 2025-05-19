
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAgents } from '@/hooks/useAgents';
import { AgentDialog } from './AgentDialog';
import { AgentAssignDialog } from './AgentAssignDialog';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { UserAgent, Agent } from '@/services/agentService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TeamAgents() {
  const { company } = useAuth();
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedUserAgent, setSelectedUserAgent] = useState<UserAgent | null>(null);

  const {
    agents,
    userAgents,
    isLoadingAgents,
    isLoadingUserAgents,
    isCreating,
    isUpdating,
    isDeleting,
    isAssigning,
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    handleAssignAgent,
    handleRemoveAgentAssignment
  } = useAgents();

  const { teamMembers, isLoading: isLoadingMembers } = useTeamMembers(company?.id);

  const handleOpenAgentDialog = (agent?: Agent) => {
    setSelectedAgent(agent || null);
    setIsAgentDialogOpen(true);
  };

  const handleOpenAssignDialog = (agent?: Agent) => {
    setSelectedAgent(agent || null);
    setIsAssignDialogOpen(true);
  };

  const handleConfirmDelete = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (selectedAgent?.id) {
      await handleDeleteAgent(selectedAgent.id);
    }
    setIsDeleteDialogOpen(false);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Agents List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">AI Agents</h2>
          <Button onClick={() => handleOpenAgentDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAgents ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <LoadingSpinner size="md" className="mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : agents.length > 0 ? (
                    agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            {agent.avatar_url ? (
                              <img 
                                src={agent.avatar_url} 
                                alt={agent.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                {agent.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span>{agent.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{agent.description || 'No description'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(agent.status)}>
                            {agent.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleOpenAgentDialog(agent)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleOpenAssignDialog(agent)}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleConfirmDelete(agent)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No agents found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Assignments */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Agent Assignments</h2>
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingUserAgents ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <LoadingSpinner size="md" className="mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : userAgents.length > 0 ? (
                    userAgents.map((userAgent) => (
                      <TableRow key={userAgent.id}>
                        <TableCell>{userAgent.user_details?.email}</TableCell>
                        <TableCell>
                          {userAgent.agent?.name || 'Unknown Agent'}
                        </TableCell>
                        <TableCell>
                          {userAgent.is_primary ? (
                            <Badge className="bg-blue-100 text-blue-800">Primary</Badge>
                          ) : (
                            'No'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemoveAgentAssignment(userAgent.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No agent assignments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Dialog */}
      <AgentDialog 
        isOpen={isAgentDialogOpen}
        onClose={() => setIsAgentDialogOpen(false)}
        onSubmit={selectedAgent ? 
          (data) => handleUpdateAgent(selectedAgent.id, data) : 
          handleCreateAgent
        }
        isSubmitting={selectedAgent ? isUpdating : isCreating}
        agent={selectedAgent}
      />

      {/* Agent Assignment Dialog */}
      <AgentAssignDialog 
        isOpen={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        onSubmit={handleAssignAgent}
        isSubmitting={isAssigning}
        teamMembers={teamMembers}
        agents={agents}
        selectedAgent={selectedAgent}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the agent
              {selectedAgent?.name ? ` "${selectedAgent.name}"` : ''}
              and remove all its assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirmed}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
