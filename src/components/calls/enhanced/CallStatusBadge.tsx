
import { Badge } from "@/components/ui/badge";
import { getCallStatusConfig } from "@/lib/utils/call-helpers";
import { CallStatus } from "@/lib/types/call-enhanced";

interface CallStatusBadgeProps {
  status: CallStatus;
  showIcon?: boolean;
}

export function CallStatusBadge({ status, showIcon = false }: CallStatusBadgeProps) {
  const config = getCallStatusConfig(status);
  
  return (
    <Badge variant={config.variant} className={config.color}>
      {config.label}
    </Badge>
  );
}
