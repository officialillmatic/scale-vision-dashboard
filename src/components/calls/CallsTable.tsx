
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSecureCallData } from "@/hooks/useSecureCallData";
import { useCallSync } from "@/hooks/useCallSync";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { CallTableDiagnostics } from "./CallTableDiagnostics";
import { RoleCheck } from "@/components/auth/RoleCheck";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { RefreshCw, TestTube, Webhook, Info } from "lucide-react";

export const CallsTable = () => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { calls, isLoading, error, syncCallsSecurely, testConnectionSecurely } = useSecureCallData();
  const { 
    handleSync, 
    isSyncing, 
    handleTestSync, 
    isTesting, 
    handleRegisterWebhook, 
    isRegisteringWebhook 
  } = useCallSync(() => {});

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-destructive">Failed to load calls</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <CallTableDiagnostics 
        visible={showDiagnostics} 
        onClose={() => setShowDiagnostics(false)} 
      />
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Call History</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
            >
              <Info className="h-4 w-4" />
            </Button>
            
            <RoleCheck adminOnly fallback={null}>
              <Button
                variant="outline"
                size="sm"
                onClick={testConnectionSecurely}
                disabled={isTesting}
              >
                {isTesting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Test
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegisterWebhook}
                disabled={isRegisteringWebhook}
              >
                {isRegisteringWebhook ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Webhook className="h-4 w-4" />
                )}
                Webhook
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={syncCallsSecurely}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync
              </Button>
            </RoleCheck>
          </div>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No calls found. Use the sync button to fetch calls from your connected service.
            </div>
          ) : (
            <div className="space-y-2">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">
                          {call.fromNumber} → {call.toNumber}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(call.timestamp).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <div>Duration: {formatDuration(call.duration)}</div>
                        <div>Cost: {formatCurrency(call.cost)}</div>
                      </div>
                      
                      {call.sentiment && (
                        <div className="text-sm">
                          <div className={`capitalize ${
                            call.sentiment === 'positive' ? 'text-green-600' :
                            call.sentiment === 'negative' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            {call.sentiment}
                          </div>
                        </div>
                      )}
                      
                      {call.agent && (
                        <div className="text-sm">
                          <div className="font-medium">{call.agent.name}</div>
                        </div>
                      )}
                    </div>
                    
                    {call.summary && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {call.summary}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {call.hasRecording && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Recording
                      </span>
                    )}
                    {call.hasTranscript && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Transcript
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
