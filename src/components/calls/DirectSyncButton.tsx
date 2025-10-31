
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { useDirectCallSync } from "@/hooks/useDirectCallSync";

interface DirectSyncButtonProps {
  onSyncComplete?: () => void;
  disabled?: boolean;
}

export function DirectSyncButton({ onSyncComplete, disabled }: DirectSyncButtonProps) {
  const { isSyncing, lastSyncResult, handleDirectSync } = useDirectCallSync();

  const handleSync = async () => {
    await handleDirectSync();
    if (onSyncComplete) {
      onSyncComplete();
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
    return <Zap className="h-4 w-4" />;
  };

  const getButtonVariant = () => {
    if (lastSyncResult?.success) return "default";
    if (lastSyncResult && !lastSyncResult.success) return "destructive";
    return "default";
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing || disabled}
      variant={getButtonVariant()}
      className="flex items-center gap-2"
    >
      {getStatusIcon()}
      {isSyncing ? 'Syncing...' : 'Direct Sync'}
    </Button>
  );
}
