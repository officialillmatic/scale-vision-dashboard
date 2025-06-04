
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { CallData } from '@/types/analytics';
import { SentimentBadge, DispositionBadge, CallStatusBadge } from './CallDataTableBadges';
import { CallDataTableActions } from './CallDataTableActions';

interface CallDataTableRowProps {
  call: CallData;
}

export function CallDataTableRow({ call }: CallDataTableRowProps) {
  return (
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
        <CallStatusBadge status={call.call_status} />
      </TableCell>
      <TableCell>
        <DispositionBadge disposition={call.disposition} />
      </TableCell>
      <TableCell>
        <SentimentBadge score={call.sentiment_score} />
      </TableCell>
      <CallDataTableActions
        recordingUrl={call.recording_url}
        transcriptUrl={call.transcript_url}
        transcript={call.transcript}
      />
    </TableRow>
  );
}
