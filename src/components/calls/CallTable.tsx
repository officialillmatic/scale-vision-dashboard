
import { useState } from "react";
import { useCallData } from "@/hooks/useCallData";
import { CallTableFilters } from "./CallTableFilters";
import { CallTableList } from "./CallTableList";
import { CallTableActions } from "./CallTableActions";
import { CallDebugPanel } from "./CallDebugPanel";
import { CallData } from "@/services/callService";
import { CallDetailsModal } from "./CallDetailsModal";
import { useAuth } from "@/contexts/AuthContext";

interface CallTableProps {
  onSelectCall: (call: CallData) => void;
}

export function CallTable({ onSelectCall }: CallTableProps) {
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const { user } = useAuth();
  
  const {
    calls,
    isLoading,
    isSyncing,
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

  // Show debug panel for admin users or when no calls are found
  const shouldShowDebug = user?.email?.includes('admin') || calls.length === 0;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <CallTableActions 
            isSyncing={isSyncing}
            onSync={handleSync}
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

      <CallTableList 
        calls={calls}
        isLoading={isLoading}
        searchTerm={searchTerm}
        date={date}
        onSelectCall={handleSelectCall}
      />

      <CallDetailsModal 
        call={selectedCall} 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
