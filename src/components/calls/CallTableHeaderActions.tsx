
import { Button } from "@/components/ui/button";
import { RefreshCw, Webhook, TestTube, Users, AlertTriangle } from "lucide-react";
import { useCallSync } from "@/hooks/useCallSync";
import { useUserAgentManager } from "@/hooks/useUserAgentManager";
import { Badge } from "@/components/ui/badge";

interface CallTableHeaderActionsProps {
  canUploadCalls: boolean;
  isSyncing: boolean;
  handleSync: () => void;
  shouldShowDebug: boolean;
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
}

export function CallTableHeaderActions({
  canUploadCalls,
  isSyncing,
  handleSync,
  shouldShowDebug,
  showDebug,
  setShowDebug
}: CallTableHeaderActionsProps) {
  const {
    handleRegisterWebhook,
    isRegisteringWebhook,
    handleTestSync,
    isTesting
  } = useCallSync(() => {});

  const {
    autoMapOrphanedCalls,
    isAutoMapping,
    auditMappings,
    isAuditing
  } = useUserAgentManager();

  if (!canUploadCalls) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Core sync operations */}
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

      {/* Agent mapping operations */}
      <div className="flex gap-1 items-center">
        <Badge variant="outline" className="text-xs">
          Agent Mapping
        </Badge>
        
        <Button
          onClick={() => auditMappings()}
          disabled={isAuditing}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          {isAuditing ? "Auditing..." : "Audit"}
        </Button>

        <Button
          onClick={() => autoMapOrphanedCalls()}
          disabled={isAutoMapping}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          {isAutoMapping ? "Auto-mapping..." : "Auto-map"}
        </Button>
      </div>

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
  );
}
