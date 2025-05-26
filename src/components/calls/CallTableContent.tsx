
import { CallTableList } from "./CallTableList";
import { CallData } from "@/services/callService";

interface CallTableContentProps {
  canViewCalls: boolean;
  calls: CallData[];
  isLoading: boolean;
  searchTerm: string;
  date: Date | undefined;
  onSelectCall: (call: CallData) => void;
}

export function CallTableContent({
  canViewCalls,
  calls,
  isLoading,
  searchTerm,
  date,
  onSelectCall
}: CallTableContentProps) {
  if (!canViewCalls || (!isLoading && calls.length === 0)) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden shadow-sm">
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
