
import React from 'react';
import { Phone } from 'lucide-react';
import { CallData } from '@/services/callService';

interface CallDataTableEmptyProps {
  calls: CallData[];
  searchTerm: string;
  date: Date | undefined;
}

export function CallDataTableEmpty({ calls, searchTerm, date }: CallDataTableEmptyProps) {
  return (
    <div className="text-center py-12 text-gray-500">
      <Phone className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No calls found</h3>
      <p className="text-gray-500">
        {calls.length === 0 
          ? "No calls have been synced yet. Try clicking 'Sync Calls' to fetch data from Retell AI."
          : "No calls match your current filters. Try adjusting your search criteria."
        }
      </p>
    </div>
  );
}
