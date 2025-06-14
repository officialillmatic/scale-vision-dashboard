import { debugLog } from "@/lib/debug";
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Users, Bot, Crown, UserPlus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface TeamMember {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: string;
  status: 'active' | 'invited' | 'inactive';
  created_at: string;
  last_sign_in_at?: string;
}

const SuperAdminTeamNew = () => {
  const [activeTab, setActiveTab] = useState('members');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  
  const { user } = useAuth();
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();
  const navigate = useNavigate();
  
  // Super admin access verification
  useEffect(() => {
    if (isSuperAdminLoading) return;
    
    if (!isSuperAdmin) {
      debugLog('❌ [SuperAdminTeamNew] Access denied - not super admin');
      toast.error("Access denied - Super admin required");
      navigate('/dashboard');
      return;
    } else {
      debugLog('✅ [SuperAdminTeamNew] Super admin access granted');
    }
  }, [isSuperAdmin, isSuperAdminLoading, navigate]);

  // Fetch team members
  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      debugLog('🔍 [SuperAdminTeamNew] Fetching all users...');
      
      // Query profiles directly for all users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('❌ [SuperAdminTeamNew] Profiles error:', profilesError);
        throw profilesError;
      }

      // Transform data to match TeamMember interface
      const transformedData: TeamMember[] = profilesData?.map(profile => ({
        id: profile.id,
        email: profile.email || 'No email',
        name: profile.name || profile.email?.split('@')[0] || 'User',
        avatar_url: profile.avatar_url,
        role: profile.role || 'member',
        status: 'active' as const,
        created_at: profile.created_at,
        last_sign_in_at: profile.updated_at
      })) || [];

      debugLog('✅ [SuperAdminTeamNew] Found users:', transformedData.length);
      setTeamMembers(transformedData);
    } catch (error: any) {
      console.error('❌ [SuperAdminTeamNew] Failed to fetch users:', error);
      toast.error(`Failed to fetch users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter members based on search
  useEffect(() => {
    let filtered = teamMembers;
    
    if (searchQuery) {
      filtered = filtered.filter(member => 
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.name && member.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    setFilteredMembers(filtered);
  }, [teamMembers, searchQuery]);

  // Initial load
  useEffect(() => {
    if (isSuperAdmin) {
      fetchTeamMembers();
    }
  }, [isSuperAdmin]);
  
  // Loading state
  if (isSuperAdminLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading permissions...</div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Access denied state
  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied - Super administrator privileges required.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const handleEditRole = (member: TeamMember) => {
    debugLog('Edit role for:', member.email);
    toast.info(`Edit role functionality for ${member.email} - Coming soon!`);
  };

  const handleRemoveUser = (member: TeamMember) => {
    debugLog('Remove user:', member.email);
    toast.info(`Remove user functionality for ${member.email} - Coming soon!`);
  };

  const handleInviteUser = () => {
    toast.info('Invite user functionality - Coming soon!');
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-8 w-full max-w-none">
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Team 2 (Super Admin) 👥
            </h1>
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
              <Crown className="h-3 w-3" />
              SUPER ADMIN
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Enhanced Access
            </Badge>
          </div>
          <p className="text-lg text-gray-600 font-medium">
            Complete team management with super administrator privileges
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={fetchTeamMembers} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleInviteUser}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
        
        {/* Tabs Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="border-b border-gray-200/60 px-6 py-4">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100/80 p-1 rounded-lg">
                <TabsTrigger 
                  value="members" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <Users className="h-4 w-4" />
                  Team Members
                </TabsTrigger>
                <TabsTrigger 
                  value="agents" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <Bot className="h-4 w-4" />
                  Agent Assignment
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-6">
              <TabsContent value="members" className="space-y-6 mt-0">
                {/* Search and Stats */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Input
                      placeholder="Search members by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-80"
                    />
                    <Badge variant="outline">
                      {filteredMembers.length} members
                    </Badge>
                  </div>
                </div>

                {/* Members Table */}
                <Card>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="p-8 flex items-center justify-center">
                        <LoadingSpinner size="md" />
                        <span className="ml-2 text-muted-foreground">Loading team members...</span>
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No team members found</p>
                        <p className="text-sm">
                          {searchQuery ? 'Try adjusting your search' : 'Start by inviting team members'}
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMembers.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium">
                                      {member.name?.[0] || member.email[0]?.toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium">{member.name}</p>
                                    <p className="text-sm text-muted-foreground">{member.email}</p>
                                  </div>
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
                                {new Date(member.created_at).toLocaleDateString()}
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
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="agents" className="space-y-6 mt-0">
                <div className="text-center py-12">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Agent Assignment</h3>
                  <p className="text-muted-foreground mb-4">
                    Manage AI agent assignments for team members
                  </p>
                  <Button variant="outline">
                    Configure Agents
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminTeamNew;