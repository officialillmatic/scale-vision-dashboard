
import { Badge } from "@/components/ui/badge";
import { getSentimentConfig } from "@/lib/utils/call-helpers";

interface CallSentimentBadgeProps {
  sentiment?: string | null;
  score?: number | null;
  showPercentage?: boolean;
}

export function CallSentimentBadge({ sentiment, score, showPercentage = false }: CallSentimentBadgeProps) {
  const config = getSentimentConfig(sentiment, score);
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
      {showPercentage && score !== null && (
        <span className="text-xs text-muted-foreground">
          {(score * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}
