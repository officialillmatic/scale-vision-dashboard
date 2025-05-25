
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { CallData } from '@/pages/AnalyticsPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { Download, Play, FileText, ExternalLink } from 'lucide-react';

interface CallDataTableProps {
  data: CallData[];
  isLoading: boolean;
}

export function CallDataTable({ data, isLoading }: CallDataTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Call ID</TableHead>
              <TableHead>Date/Time</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Disposition</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Recording</TableHead>
              <TableHead>Transcript</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5).fill(0).map((_, i) => (
              <TableRow key={i}>
                {Array(12).fill(0).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  const getSentimentColor = (score: number | null) => {
    if (score === null) return "secondary";
    if (score >= 0.7) return "default";
    if (score >= 0.3) return "outline";
    return "destructive";
  };

  const getSentimentLabel = (score: number | null) => {
    if (score === null) return "Unknown";
    if (score >= 0.7) return "Positive";
    if (score >= 0.3) return "Neutral";
    return "Negative";
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
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[120px]">Call ID</TableHead>
            <TableHead className="min-w-[140px]">Date/Time</TableHead>
            <TableHead>From Number</TableHead>
            <TableHead>To Number</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Disposition</TableHead>
            <TableHead>Sentiment</TableHead>
            <TableHead>Recording</TableHead>
            <TableHead>Transcript</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-4 text-muted-foreground">
                No call data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((call) => (
              <TableRow key={call.id} className="hover:bg-muted/50">
                <TableCell className="font-mono text-xs">
                  <span className="bg-muted px-2 py-1 rounded">
                    {call.call_id.slice(0, 8)}...
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {format(call.timestamp, 'MMM dd, yyyy')}<br />
                  <span className="text-xs text-muted-foreground">
                    {format(call.timestamp, 'HH:mm:ss')}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {call.from_number || call.from}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {call.to_number || call.to}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDuration(call.duration_sec)}
                </TableCell>
                <TableCell className="text-sm">
                  {formatCurrency(call.cost_usd)}
                </TableCell>
                <TableCell className="text-sm">
                  {call.agent?.name || 'N/A'}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={call.call_status === 'completed' ? 'default' : 
                            call.call_status === 'in_progress' ? 'outline' : 'destructive'}
                    className={call.call_status === 'completed' ? 'bg-green-500 hover:bg-green-600' : 
                              call.call_status === 'in_progress' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                  >
                    {call.call_status}
                  </Badge>
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
                      <Badge variant={getSentimentColor(call.sentiment_score)}>
                        {getSentimentLabel(call.sentiment_score)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {(call.sentiment_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {call.recording_url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(call.recording_url!, '_blank')}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {call.transcript_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(call.transcript_url!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    ) : call.transcript ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
