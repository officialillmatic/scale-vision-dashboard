
import { format } from "date-fns";
import { Loader2, Play, Download, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (score: number | null) => {
    if (score === null) return "bg-gray-500";
    if (score >= 0.7) return "bg-green-500";
    if (score >= 0.3) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getDispositionColor = (disposition: string | null) => {
    if (!disposition) return "outline";
    switch (disposition.toLowerCase()) {
      case "enrolled": case "completed": case "success":
        return "default";
      case "no answer": case "voicemail": case "busy":
        return "secondary";
      case "declined": case "failed": case "error":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="rounded-md border overflow-hidden call-table-container">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Date/Time</TableHead>
            <TableHead>AI Number</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Recording</TableHead>
            <TableHead>Disposition</TableHead>
            <TableHead>Sentiment</TableHead>
            <TableHead>Transcript</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
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
                  {format(call.start_time || call.timestamp, "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {call.from_number || call.from}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {call.to_number || call.to}
                </TableCell>
                <TableCell>
                  {formatDuration(call.duration_sec)}
                </TableCell>
                <TableCell>
                  {call.recording_url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(call.recording_url!, '_blank');
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">No recording</span>
                  )}
                </TableCell>
                <TableCell>
                  {call.disposition ? (
                    <Badge variant={getDispositionColor(call.disposition)}>
                      {call.disposition}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {call.sentiment_score !== null ? (
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getSentimentColor(call.sentiment_score)}`} />
                      <span className="text-sm">{(call.sentiment_score * 100).toFixed(0)}%</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {call.transcript_url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(call.transcript_url!, '_blank');
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  ) : call.transcript ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCall(call);
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">No transcript</span>
                  )}
                </TableCell>
                <TableCell>
                  <CallTableStatus status={call.call_status} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                {searchTerm || date ? "No matching calls found." : "No calls found. Try syncing your call history."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
