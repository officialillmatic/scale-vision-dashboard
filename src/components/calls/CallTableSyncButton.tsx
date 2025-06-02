
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CallTableSyncButtonProps {
  onSyncComplete?: () => void;
  disabled?: boolean;
}

export function CallTableSyncButton({ onSyncComplete, disabled }: CallTableSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const syncAbortController = useRef<AbortController | null>(null);

  const handleSync = async () => {
    // Prevent multiple sync operations
    if (isSyncing || isTesting) {
      console.log('[SYNC_BUTTON] Sync blocked - another operation is running');
      toast.error('Another sync operation is already running');
      return;
    }

    console.log('[SYNC_BUTTON] Starting call sync...');
    setIsSyncing(true);
    setIsTesting(false); // Ensure test is not active
    setLastSyncStatus('idle');

    // Create abort controller for this operation
    syncAbortController.current = new AbortController();

    try {
      const { data, error } = await supabase.functions.invoke('sync-calls', {
        body: { bypass_validation: true }, // Add bypass flag for debugging
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      if (error) {
        console.error('[SYNC_BUTTON] Sync error:', error);
        setLastSyncStatus('error');
        
        if (error.message?.includes('RETELL_API_KEY')) {
          toast.error('Retell API key not configured. Please check your environment settings.');
        } else if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
          toast.error('Authentication failed. Please check your Retell API credentials.');
        } else if (error.message?.includes('404')) {
          toast.error('Sync service not found. Please check your deployment.');
        } else {
          toast.error(`Sync failed: ${error.message}`);
        }
        return;
      }

      console.log('[SYNC_BUTTON] Sync completed successfully:', data);
      setLastSyncStatus('success');

      const syncedCount = data?.synced_calls || 0;
      const processedCount = data?.processed_calls || 0;
      const agentsFound = data?.agents_found || 0;

      if (syncedCount > 0) {
        toast.success(`Successfully synced ${syncedCount} new calls from ${agentsFound} agents`);
      } else if (processedCount > 0) {
        toast.info(`Sync completed - ${processedCount} calls checked, all up to date`);
      } else {
        toast.info('Sync completed - no calls found to process');
      }

      // Call the completion callback to refresh data
      if (onSyncComplete) {
        onSyncComplete();
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[SYNC_BUTTON] Sync aborted');
        toast.info('Sync operation cancelled');
      } else {
        console.error('[SYNC_BUTTON] Sync error:', error);
        setLastSyncStatus('error');
        toast.error(`Sync failed: ${error.message}`);
      }
    } finally {
      setIsSyncing(false);
      syncAbortController.current = null;
    }
  };

  const handleTestSync = async () => {
    // Prevent multiple operations
    if (isSyncing || isTesting) {
      console.log('[SYNC_BUTTON] Test blocked - another operation is running');
      toast.error('Another operation is already running');
      return;
    }

    console.log('[SYNC_BUTTON] Testing sync connectivity...');
    setIsTesting(true);
    setIsSyncing(false); // Ensure sync is not active

    try {
      const { data, error } = await supabase.functions.invoke('sync-calls', {
        body: { test: true },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      if (error) {
        console.error('[SYNC_BUTTON] Test error:', error);
        toast.error(`Test failed: ${error.message}`);
        return;
      }

      console.log('[SYNC_BUTTON] Test completed successfully:', data);
      toast.success(`API test successful - found ${data?.callsFound || 0} calls in test`);

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
    if (lastSyncStatus === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (lastSyncStatus === 'error') {
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
        {isSyncing ? 'Syncing...' : 'Sync Calls'}
      </Button>
    </div>
  );
}
