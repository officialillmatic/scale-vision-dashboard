
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

interface CallTableActionsProps {
  isSyncing: boolean;
  onSync: () => void;
}

export function CallTableActions({ isSyncing, onSync }: CallTableActionsProps) {
  return (
    <Button 
      variant="outline"
      onClick={onSync}
      disabled={isSyncing}
    >
      {isSyncing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 h-4 w-4" />
      )}
      Sync Calls
    </Button>
  );
}
