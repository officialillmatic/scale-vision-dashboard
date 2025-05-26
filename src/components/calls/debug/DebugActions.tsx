
import { Button } from "@/components/ui/button";
import { Loader2, Settings, RefreshCw } from "lucide-react";

interface DebugActionsProps {
  isSetupRunning: boolean;
  isDebugging: boolean;
  onRunSetup: () => void;
  onRunDebug: () => void;
}

export function DebugActions({ 
  isSetupRunning, 
  isDebugging, 
  onRunSetup, 
  onRunDebug 
}: DebugActionsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onRunSetup}
        disabled={isSetupRunning}
      >
        {isSetupRunning ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Settings className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onRunDebug}
        disabled={isDebugging}
      >
        {isDebugging ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
