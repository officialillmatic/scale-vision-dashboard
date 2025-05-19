
import { CallData } from "@/services/callService";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { CallDetailsPanel } from "./CallDetailsPanel";
import { format } from "date-fns";

interface CallDetailsModalProps {
  call: CallData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CallDetailsModal({ call, isOpen, onClose }: CallDetailsModalProps) {
  if (!call) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Call Details</DialogTitle>
          <DialogDescription>
            {call.call_id} • {format(call.timestamp, "MMM d, yyyy h:mm a")}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <CallDetailsPanel call={call} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
