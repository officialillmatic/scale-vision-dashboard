import { debugLog } from "@/lib/debug";

import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDirectCallSync } from "@/hooks/useDirectCallSync";

interface CallTableSyncButtonProps {
  onSyncComplete?: () => void;
  disabled?: boolean;
}

export function CallTableSyncButton({ onSyncComplete, disabled }: CallTableSyncButtonProps) {
  const [isTesting, setIsTesting] = useState(false);
  const { isSyncing, lastSyncResult, handleDirectSync, syncCallsDirectly } = useDirectCallSync();

  const handleSync = async () => {
    await handleDirectSync();
    if (onSyncComplete) {
      onSyncComplete();
    }
  };

  const handleTestSync = async () => {
    if (isSyncing || isTesting) {
      toast.error('Another operation is already running');
      return;
    }

    debugLog('[SYNC_BUTTON] Testing direct API connectivity...');
    setIsTesting(true);

    try {
      const retellApiKey = import.meta.env.VITE_RETELL_API_KEY;
      if (!retellApiKey) {
        throw new Error("RETELL_API_KEY not configured");
      }

      const response = await fetch('https://api.retellai.com/v2/list-calls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${retellApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 1 })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      debugLog('[SYNC_BUTTON] Test completed successfully:', data);
      toast.success(`API test successful - found ${data.calls?.length || 0} calls`);

    } catch (error: any) {
      console.error('[SYNC_BUTTON] Test error:', error);
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = () => {
    if (isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (lastSyncResult?.success) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (lastSyncResult && !lastSyncResult.success) {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    return <RefreshCw className="h-4 w-4" />;
  };

  const isAnyOperationRunning = isSyncing || isTesting;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleTestSync}
        disabled={isAnyOperationRunning || disabled}
        className="bg-white hover:bg-gray-50"
      >
        {isTesting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        {isTesting ? 'Testing...' : 'Test API'}
      </Button>
      
      <Button
        onClick={handleSync}
        disabled={isAnyOperationRunning || disabled}
        className="flex items-center gap-2"
      >
        {getStatusIcon()}
        {isSyncing ? 'Syncing...' : 'Direct Sync'}
      </Button>
    </div>
  );
}
