
import { Clock } from "lucide-react";
import { formatCallDuration } from "@/lib/utils/call-helpers";

interface CallDurationDisplayProps {
  duration: number;
  showIcon?: boolean;
  className?: string;
}

export function CallDurationDisplay({ duration, showIcon = false, className = "" }: CallDurationDisplayProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {showIcon && <Clock className="h-3 w-3" />}
      <span className="font-mono text-sm">{formatCallDuration(duration)}</span>
    </div>
  );
}
