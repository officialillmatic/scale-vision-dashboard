
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, ExternalLink, FileText } from 'lucide-react';

interface CallDataTableActionsProps {
  recordingUrl?: string | null;
  transcriptUrl?: string | null;
  transcript?: string | null;
}

export function CallDataTableActions({ 
  recordingUrl, 
  transcriptUrl, 
  transcript 
}: CallDataTableActionsProps) {
  return (
    <>
      <td>
        {recordingUrl ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(recordingUrl, '_blank')}
          >
            <Play className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </td>
      <td>
        <div className="flex gap-1">
          {transcriptUrl ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(transcriptUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          ) : transcript ? (
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
      </td>
    </>
  );
}
