
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CallData } from "@/services/callService";
import { CallTableStatus } from "./CallTableStatus";

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
  return (
    <div className="rounded-md border overflow-hidden call-table-container">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Call ID</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : calls.length > 0 ? (
            calls.map((call) => (
              <TableRow 
                key={call.id} 
                className="cursor-pointer hover:bg-muted"
                onClick={() => onSelectCall(call)}
              >
                <TableCell className="font-medium">
                  {format(call.timestamp, "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  {Math.floor(call.duration_sec / 60)}:{(call.duration_sec % 60).toString().padStart(2, '0')}
                </TableCell>
                <TableCell>{call.from === "unknown" ? "Outbound" : "Inbound"}</TableCell>
                <TableCell>${call.cost_usd.toFixed(2)}</TableCell>
                <TableCell>{call.call_id}</TableCell>
                <TableCell><CallTableStatus status={call.call_status} /></TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                {searchTerm || date ? "No matching calls found." : "No calls found. Try syncing your call history."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
