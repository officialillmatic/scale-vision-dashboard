
import { DollarSign } from "lucide-react";
import { formatCallCost } from "@/lib/utils/call-helpers";

interface CallCostDisplayProps {
  cost: number;
  showIcon?: boolean;
  className?: string;
}

export function CallCostDisplay({ cost, showIcon = false, className = "" }: CallCostDisplayProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {showIcon && <DollarSign className="h-3 w-3" />}
      <span className="font-mono text-sm font-medium">{formatCallCost(cost)}</span>
    </div>
  );
}
