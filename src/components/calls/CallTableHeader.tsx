
import { Search } from "lucide-react";
import { CallTableActions } from "./CallTableActions";
import { CallDebugPanel } from "./CallDebugPanel";

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
  if (!canUploadCalls) return null;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <CallTableActions 
            isSyncing={isSyncing}
            onSync={handleSync}
            disabled={!company}
          />
          {shouldShowDebug && (
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:border-gray-300 transition-all duration-200 font-medium"
            >
              {showDebug ? 'Hide' : 'Show'} Debug
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Search className="h-4 w-4" />
          <span className="font-medium">Find & Filter</span>
        </div>
      </div>

      {showDebug && shouldShowDebug && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200">
          <CallDebugPanel />
        </div>
      )}
    </>
  );
}
