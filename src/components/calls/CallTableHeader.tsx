import { Button } from "@/components/ui/button";
import { RefreshCw, Webhook, TestTube } from "lucide-react";
import { useCallSync } from "@/hooks/useCallSync";

interface CallTableHeaderProps {
  canUploadCalls: boolean;
  isSyncing: boolean;
  handleSync: () => void;
  company: any;
  shouldShowDebug: boolean;
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
}

export function CallTableHeader({
  canUploadCalls,
  isSyncing,
  handleSync,
  company,
  shouldShowDebug,
  showDebug,
  setShowDebug
}: CallTableHeaderProps) {
  const {
    handleRegisterWebhook,
    isRegisteringWebhook,
    handleTestSync,
    isTesting
  } = useCallSync(() => {});

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Call Analytics</h2>
        <p className="text-gray-600 mt-1">
          {company?.name ? `${company.name} call data` : 'Your call analytics dashboard'}
        </p>
      </div>

      {canUploadCalls && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleTestSync()}
            disabled={isTesting}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {isTesting ? "Testing..." : "Test API"}
          </Button>

          <Button
            onClick={() => handleRegisterWebhook()}
            disabled={isRegisteringWebhook}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Webhook className="h-4 w-4" />
            {isRegisteringWebhook ? "Registering..." : "Register Webhook"}
          </Button>

          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Calls"}
          </Button>

          {shouldShowDebug && (
            <Button
              onClick={() => setShowDebug(!showDebug)}
              variant="outline"
              size="sm"
            >
              {showDebug ? "Hide Debug" : "Show Debug"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
