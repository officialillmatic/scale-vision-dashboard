
import { useState } from "react";
import { useCallData } from "@/hooks/useCallData";
import { CallTableFilters } from "./CallTableFilters";
import { CallDetailsModal } from "./CallDetailsModal";
import { CallData } from "@/services/callService";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { CallTableErrorAlert } from "./CallTableErrorAlert";
import { CallTablePermissionAlert } from "./CallTablePermissionAlert";
import { CallTableHeader } from "./CallTableHeader";
import { CallTableEmptyState } from "./CallTableEmptyState";
import { CallTableContent } from "./CallTableContent";

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
      <CallTableErrorAlert error={error} />
      
      <CallTablePermissionAlert canViewCalls={can.viewCalls} />

      <CallTableHeader
        canUploadCalls={can.uploadCalls}
        isSyncing={isSyncing}
        handleSync={handleSync}
        company={company}
        shouldShowDebug={shouldShowDebug}
        showDebug={showDebug}
        setShowDebug={setShowDebug}
      />

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

      <CallTableEmptyState
        canViewCalls={can.viewCalls}
        canUploadCalls={can.uploadCalls}
        isLoading={isLoading}
        calls={calls}
        error={error}
        isSyncing={isSyncing}
        handleSync={handleSync}
      />

      <CallTableContent
        canViewCalls={can.viewCalls}
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
