
import { useCallData } from "@/hooks/useCallData";
import { CallTableFilters } from "./CallTableFilters";
import { CallTableList } from "./CallTableList";
import { CallTableActions } from "./CallTableActions";
import { CallData } from "@/services/callService";

interface CallTableProps {
  onSelectCall: (call: CallData) => void;
}

export function CallTable({ onSelectCall }: CallTableProps) {
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
        onSelectCall={onSelectCall}
      />
    </div>
  );
}
