
import { CallTableHeaderInfo } from "./CallTableHeaderInfo";
import { CallTableHeaderActions } from "./CallTableHeaderActions";

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
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <CallTableHeaderInfo company={company} />
      
      <CallTableHeaderActions
        canUploadCalls={canUploadCalls}
        isSyncing={isSyncing}
        handleSync={handleSync}
        shouldShowDebug={shouldShowDebug}
        showDebug={showDebug}
        setShowDebug={setShowDebug}
      />
    </div>
  );
}
