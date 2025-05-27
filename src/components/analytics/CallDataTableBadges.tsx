
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface SentimentBadgeProps {
  score: number | null;
}

interface DispositionBadgeProps {
  disposition: string | null;
}

interface CallStatusBadgeProps {
  status: string;
}

export function SentimentBadge({ score }: SentimentBadgeProps) {
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

  if (score === null) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getSentimentColor(score)}>
        {getSentimentLabel(score)}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export function DispositionBadge({ disposition }: DispositionBadgeProps) {
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

  if (!disposition) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <Badge variant={getDispositionColor(disposition)}>
      {disposition}
    </Badge>
  );
}

export function CallStatusBadge({ status }: CallStatusBadgeProps) {
  return (
    <Badge 
      variant={status === 'completed' ? 'default' : 
              status === 'in_progress' ? 'outline' : 'destructive'}
      className={status === 'completed' ? 'bg-green-500 hover:bg-green-600' : 
                status === 'in_progress' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
    >
      {status}
    </Badge>
  );
}
