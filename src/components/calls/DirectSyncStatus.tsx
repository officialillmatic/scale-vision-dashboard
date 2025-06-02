
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Zap, Clock } from "lucide-react";
import { useDirectCallSync } from "@/hooks/useDirectCallSync";

export function DirectSyncStatus() {
  const { lastSyncResult, isSyncing } = useDirectCallSync();

  const getStatusIcon = () => {
    if (isSyncing) return <Clock className="h-5 w-5 text-blue-600" />;
    if (lastSyncResult?.success) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (lastSyncResult && !lastSyncResult.success) return <XCircle className="h-5 w-5 text-red-600" />;
    return <Zap className="h-5 w-5 text-gray-400" />;
  };

  const getStatusBadge = () => {
    if (isSyncing) return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
    if (lastSyncResult?.success) return <Badge className="bg-green-100 text-green-800">Success</Badge>;
    if (lastSyncResult && !lastSyncResult.success) return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    return <Badge variant="outline">Ready</Badge>;
  };

  return (
    <Card className="border border-emerald-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg font-semibold text-gray-900">
              Direct Sync Status
            </CardTitle>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-gray-600 mb-3">
          Bypasses edge functions - calls Retell API directly and inserts to database
        </div>
        
        {lastSyncResult && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Synced:</span> {lastSyncResult.synced_calls}
              </div>
              <div>
                <span className="font-medium">Processed:</span> {lastSyncResult.processed_calls}
              </div>
              <div>
                <span className="font-medium">From API:</span> {lastSyncResult.total_calls_from_api}
              </div>
              <div>
                <span className="font-medium">Last Run:</span>{' '}
                {new Date(lastSyncResult.timestamp).toLocaleTimeString()}
              </div>
            </div>
            
            {lastSyncResult.errors && lastSyncResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                <div className="text-xs text-red-700 bg-red-50 p-2 rounded max-h-20 overflow-y-auto">
                  {lastSyncResult.errors.map((error, index) => (
                    <div key={index} className="mb-1">{error}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
