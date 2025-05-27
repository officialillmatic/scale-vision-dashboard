
import {
  Table,
  TableBody,
} from "@/components/ui/table";
import { CallData } from "@/services/callService";
import { CallTableListHeader } from "./CallTableListHeader";
import { CallTableListRow } from "./CallTableListRow";
import { CallTableListEmpty } from "./CallTableListEmpty";

interface CallTableListProps {
  calls: CallData[];
  isLoading: boolean;
  searchTerm: string;
  date: Date | undefined;
  onSelectCall: (call: CallData) => void;
}

export function CallTableList({ 
  calls, 
  isLoading, 
  searchTerm, 
  date,
  onSelectCall 
}: CallTableListProps) {
  const showLatency = calls.some(call => call.latency_ms);
  const colSpan = showLatency ? 12 : 11;

  return (
    <div className="rounded-md border overflow-hidden call-table-container">
      <Table>
        <CallTableListHeader calls={calls} />
        <TableBody>
          {isLoading || calls.length === 0 ? (
            <CallTableListEmpty 
              isLoading={isLoading}
              searchTerm={searchTerm}
              date={date}
              colSpan={colSpan}
            />
          ) : (
            calls.map((call) => (
              <CallTableListRow 
                key={call.id}
                call={call}
                showLatency={showLatency}
                onSelectCall={onSelectCall}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
