
import { useState } from "react";
import { useCallData } from "@/hooks/useCallData";
import { CallTableFilters } from "./CallTableFilters";
import { CallTableList } from "./CallTableList";
import { CallTableActions } from "./CallTableActions";
import { CallDebugPanel } from "./CallDebugPanel";
import { CallData } from "@/services/callService";
import { CallDetailsModal } from "./CallDetailsModal";
import { EmptyStateMessage } from "@/components/dashboard/EmptyStateMessage";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";

interface CallTableProps {
  onSelectCall: (call: CallData) => void;
}

export function CallTable({ onSelectCall }: CallTableProps) {
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const { user, company } = useAuth();
  
  const {
    calls,
    isLoading,
    isSyncing,
    error,
    searchTerm,
    setSearchTerm,
    date,
    setDate,
    handleSync
  } = useCallData();
  
  const handleSelectCall = (call: CallData) => {
    setSelectedCall(call);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedCall(null), 300);
  };

  // Show debug panel for admin users or when there are issues
  const isAdmin = user?.email?.includes('admin');
  const shouldShowDebug = isAdmin || error;
  
  return (
    <div className="space-y-6 w-full">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to load calls. {error.message?.includes('permission') 
              ? 'Please check your permissions or contact support.' 
              : 'Please try refreshing or contact support if the issue persists.'}
          </AlertDescription>
        </Alert>
      )}

      {/* No Company Warning */}
      {!company && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You need to be associated with a company to view calls. Please contact your administrator.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <CallTableActions 
            isSyncing={isSyncing}
            onSync={handleSync}
            disabled={!company}
          />
          {shouldShowDebug && (
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDebug ? 'Hide' : 'Show'} Debug
            </button>
          )}
        </div>
        <CallTableFilters 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          date={date} 
          setDate={setDate}
        />
      </div>

      {showDebug && shouldShowDebug && (
        <CallDebugPanel />
      )}

      {/* Show empty state when no calls and not loading */}
      {!isLoading && calls.length === 0 && !error && (
        <EmptyStateMessage
          title="No calls found"
          description="Start by syncing your calls or making your first AI call to see data here."
          actionLabel={isSyncing ? "Syncing..." : "Sync Calls"}
          onAction={handleSync}
          isLoading={isSyncing}
        />
      )}

      {/* Show call list when we have data or loading */}
      {(calls.length > 0 || isLoading) && (
        <CallTableList 
          calls={calls}
          isLoading={isLoading}
          searchTerm={searchTerm}
          date={date}
          onSelectCall={handleSelectCall}
        />
      )}

      <CallDetailsModal 
        call={selectedCall} 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
