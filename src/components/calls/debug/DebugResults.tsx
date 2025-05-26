
import { Badge } from "@/components/ui/badge";
import { Database, RefreshCw, Webhook } from "lucide-react";
import { DebugResults as DebugResultsType } from "./types";

interface DebugResultsProps {
  results: DebugResultsType | null;
}

export function DebugResults({ results }: DebugResultsProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Working</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!results) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">Click "Settings" to setup test data, then "Debug" to test connectivity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <span className="text-sm">Database Access</span>
        </div>
        {getStatusBadge(results.databaseTest?.status)}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <span className="text-sm">Agent Relationships</span>
        </div>
        {getStatusBadge(results.agentTest?.status)}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4" />
          <span className="text-sm">Webhook Endpoint</span>
        </div>
        {getStatusBadge(results.webhookTest?.status)}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <span className="text-sm">Retell API</span>
        </div>
        {getStatusBadge(results.retellTest?.status)}
      </div>

      <div className="text-xs text-muted-foreground border-t pt-2">
        <p>Calls in DB: {results.databaseTest?.calls?.count || 0}</p>
        <p>Agents configured: {results.databaseTest?.agents?.count || 0}</p>
        <p>Agent relationships: {results.agentTest?.count || 0}</p>
        <p>Last check: {new Date(results.timestamp).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
