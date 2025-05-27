
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function CallDataTableHeader() {
  return (
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
  );
}
