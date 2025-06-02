
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database } from 'lucide-react';
import { RetellAgentsTable } from './RetellAgentsTable';
import { useRetellAgentsData } from '@/hooks/useRetellAgentsData';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function RetellAgentsSection() {
  const {
    retellAgents,
    isLoadingRetellAgents,
    retellAgentsError,
    refetchRetellAgents
  } = useRetellAgentsData();

  const handleRefresh = () => {
    console.log('🔍 [RetellAgentsSection] Manual refresh triggered');
    refetchRetellAgents();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Synced AI Agents</h2>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Database className="w-3 h-3 mr-1" />
            From Retell AI
          </Badge>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isLoadingRetellAgents}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingRetellAgents ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {retellAgentsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">Error loading agents</p>
          <p className="text-red-600 text-sm mt-1">
            {retellAgentsError instanceof Error ? retellAgentsError.message : 'Unknown error occurred'}
          </p>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Retell AI Agents ({retellAgents.length})</span>
            {isLoadingRetellAgents && (
              <Badge variant="secondary">Loading...</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingRetellAgents ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <RetellAgentsTable
              agents={retellAgents}
              isLoading={isLoadingRetellAgents}
            />
          )}
        </CardContent>
      </Card>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mt-2">
          Debug: {retellAgents.length} synced agents loaded, isLoading: {isLoadingRetellAgents.toString()}
          {retellAgentsError && `, Error: ${retellAgentsError instanceof Error ? retellAgentsError.message : 'Unknown'}`}
        </div>
      )}
    </div>
  );
}
