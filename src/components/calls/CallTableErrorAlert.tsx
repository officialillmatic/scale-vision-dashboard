
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface CallTableErrorAlertProps {
  error: Error | null;
}

export function CallTableErrorAlert({ error }: CallTableErrorAlertProps) {
  if (!error) return null;

  return (
    <Alert variant="destructive" className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        Unable to load calls. {error.message?.includes('permission') 
          ? 'Please check your permissions or contact support.' 
          : 'Please try refreshing or contact support if the issue persists.'}
      </AlertDescription>
    </Alert>
  );
}
