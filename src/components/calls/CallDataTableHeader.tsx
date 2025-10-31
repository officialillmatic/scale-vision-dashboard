
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CallDataTableHeaderProps {
  showLatency: boolean;
}

export function CallDataTableHeader({ showLatency }: CallDataTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Time</TableHead>
        <TableHead>From</TableHead>
        <TableHead>To</TableHead>
        <TableHead>Agent</TableHead>
        <TableHead>Duration</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Cost</TableHead>
        <TableHead>Actions</TableHead>
        {showLatency && <TableHead>Latency</TableHead>}
      </TableRow>
    </TableHeader>
  );
}
