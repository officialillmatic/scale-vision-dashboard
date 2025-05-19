import { useState } from "react";
import { useCallData } from "@/hooks/useCallData";
import { CallTableFilters } from "./CallTableFilters";
import { CallTableList } from "./CallTableList";
import { CallTableActions } from "./CallTableActions";
import { CallData } from "@/services/callService";
import { CallDetailsModal } from "./CallDetailsModal";

interface CallTableProps {
  onSelectCall: (call: CallData) => void;
}

export function CallTable({ onSelectCall }: CallTableProps) {
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
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
    // Keep the selected call for a moment to avoid UI flicker
    setTimeout(() => setSelectedCall(null), 300);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <CallTableActions 
            isSyncing={isSyncing}
            onSync={handleSync}
          />
        </div>
        <CallTableFilters 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          date={date} 
          setDate={setDate}
        />
      </div>

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
