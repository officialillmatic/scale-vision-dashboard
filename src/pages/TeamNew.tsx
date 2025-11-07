
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, RefreshCw, Shield, Zap } from 'lucide-react';
import { TeamMembersSection } from '@/components/team-new/TeamMembersSection';
import { AgentAssignmentSection } from '@/components/team-new/AgentAssignmentSection';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

export default function TeamNew() {
  const [activeTab, setActiveTab] = useState('members');
  const { isSuperAdmin } = useSuperAdmin();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            Team Management
          </h1>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Badge className="bg-red-100 text-red-800 border-red-200 px-3 py-1">
                <Shield className="h-3 w-3 mr-1" />
                SUPER ADMIN
              </Badge>
            )}
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1">
              <Zap className="h-3 w-3 mr-1" />
              Team Suite
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Agent Assignment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <TeamMembersSection />
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <AgentAssignmentSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
