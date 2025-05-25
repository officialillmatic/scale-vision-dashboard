
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
import { useRole } from "@/hooks/useRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info, Search } from "lucide-react";

interface CallTableProps {
  onSelectCall: (call: CallData) => void;
}

export function CallTable({ onSelectCall }: CallTableProps) {
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const { user, company } = useAuth();
  const { can } = useRole();
  
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
  const shouldShowDebug = can.uploadCalls || error;
  
  return (
    <div className="space-y-6 w-full">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to load calls. {error.message?.includes('permission') 
              ? 'Please check your permissions or contact support.' 
              : 'Please try refreshing or contact support if the issue persists.'}
          </AlertDescription>
        </Alert>
      )}

      {/* No permissions warning for regular users */}
      {!can.viewCalls && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            You don't have permission to view calls. Please contact your administrator.
          </AlertDescription>
        </Alert>
      )}

      {/* Controls Section - Only show to users with upload permissions */}
      {can.uploadCalls && (
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
      )}

      {/* Filters - Show to all users who can view calls */}
      {can.viewCalls && (
        <div className="bg-gray-50/80 rounded-lg p-4 border border-gray-200/60">
          <CallTableFilters 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            date={date} 
            setDate={setDate}
          />
        </div>
      )}

      {showDebug && shouldShowDebug && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200">
          <CallDebugPanel />
        </div>
      )}

      {/* Show empty state when no calls and not loading */}
      {can.viewCalls && !isLoading && calls.length === 0 && !error && (
        <EmptyStateMessage
          title="No calls found"
          description={can.uploadCalls ? "Start by syncing your calls or making your first AI call to see data here." : "No calls have been made yet."}
          actionLabel={can.uploadCalls && !isSyncing ? "Sync Calls" : undefined}
          onAction={can.uploadCalls ? handleSync : undefined}
          isLoading={isSyncing}
        />
      )}

      {/* Show call list when we have data or loading and user can view calls */}
      {can.viewCalls && (calls.length > 0 || isLoading) && (
        <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden shadow-sm">
          <CallTableList 
            calls={calls}
            isLoading={isLoading}
            searchTerm={searchTerm}
            date={date}
            onSelectCall={handleSelectCall}
          />
        </div>
      )}

      <CallDetailsModal 
        call={selectedCall} 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
