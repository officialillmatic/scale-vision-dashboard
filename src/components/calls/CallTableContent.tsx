
import React from 'react';
import { CallDataTable } from './CallDataTable';
import { CallTableDiagnostics } from './CallTableDiagnostics';
import { CallData } from '@/services/callService';

interface CallTableContentProps {
  canViewCalls: boolean;
  calls: CallData[];
  isLoading: boolean;
  searchTerm: string;
  date: Date | undefined;
  onSelectCall: (call: CallData) => void;
  showDiagnostics?: boolean;
  onCloseDiagnostics?: () => void;
}

export function CallTableContent({
  canViewCalls,
  calls,
  isLoading,
  searchTerm,
  date,
  onSelectCall,
  showDiagnostics = false,
  onCloseDiagnostics = () => {}
}: CallTableContentProps) {
  if (!canViewCalls) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Diagnostics Panel */}
      <CallTableDiagnostics 
        visible={showDiagnostics} 
        onClose={onCloseDiagnostics}
      />

      {/* Main Call Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200/60 overflow-hidden">
        <CallDataTable 
          calls={calls}
          isLoading={isLoading}
          searchTerm={searchTerm}
          date={date}
          onSelectCall={onSelectCall}
        />
      </div>
    </div>
  );
}
