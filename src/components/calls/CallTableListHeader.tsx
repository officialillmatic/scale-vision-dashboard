
import {
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CallData } from "@/services/callService";

interface CallTableListHeaderProps {
  calls: CallData[];
}

export function CallTableListHeader({ calls }: CallTableListHeaderProps) {
  const showLatency = calls.some(call => call.latency_ms);

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-[100px]">Call ID</TableHead>
        <TableHead className="w-[140px]">Date/Time</TableHead>
        <TableHead>AI Number</TableHead>
        <TableHead>Customer</TableHead>
        <TableHead>Duration</TableHead>
        <TableHead>Agent</TableHead>
        <TableHead>Recording</TableHead>
        <TableHead>Disposition</TableHead>
        <TableHead>Sentiment</TableHead>
        <TableHead>Transcript</TableHead>
        <TableHead>Status</TableHead>
        {showLatency && <TableHead>Latency</TableHead>}
      </TableRow>
    </TableHeader>
  );
}
