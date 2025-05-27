
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useDebugOperations } from './debug/useDebugOperations';

interface CallTableDiagnosticsProps {
  visible: boolean;
  onClose: () => void;
}

export function CallTableDiagnostics({ visible, onClose }: CallTableDiagnosticsProps) {
  const {
    isDebugging,
    isSetupRunning,
    results,
    runSetupTestData,
    runDebugTests
  } = useDebugOperations();

  if (!visible) return null;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          System Diagnostics
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={runDebugTests}
            disabled={isDebugging}
            variant="outline"
            size="sm"
          >
            {isDebugging ? "Running Tests..." : "Run Diagnostics"}
          </Button>
          
          <Button
            onClick={runSetupTestData}
            disabled={isSetupRunning}
            variant="outline"
            size="sm"
          >
            {isSetupRunning ? "Setting up..." : "Setup Test Data"}
          </Button>
        </div>

        {results && (
          <div className="space-y-3">
            <h4 className="font-medium">Test Results</h4>
            
            {/* Database Test */}
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-sm">Database Connectivity</span>
              <Badge variant={results.databaseTest?.status === 'success' ? 'default' : 'destructive'}>
                {results.databaseTest?.status === 'success' ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                {results.databaseTest?.status || 'unknown'}
              </Badge>
            </div>

            {/* Agent Test */}
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-sm">Agent Relationships</span>
              <Badge variant={results.agentTest?.status === 'success' ? 'default' : 'destructive'}>
                {results.agentTest?.status === 'success' ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                {results.agentTest?.status || 'unknown'}
              </Badge>
            </div>

            {/* Webhook Test */}
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-sm">Webhook Connectivity</span>
              <Badge variant={results.webhookTest?.status === 'success' ? 'default' : 'destructive'}>
                {results.webhookTest?.status === 'success' ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                {results.webhookTest?.status || 'unknown'}
              </Badge>
            </div>

            {/* Retell Test */}
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-sm">Retell API</span>
              <Badge variant={results.retellTest?.status === 'success' ? 'default' : 'destructive'}>
                {results.retellTest?.status === 'success' ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                {results.retellTest?.status || 'unknown'}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last run: {new Date(results.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
