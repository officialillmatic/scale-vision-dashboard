
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface CallTablePermissionAlertProps {
  canViewCalls: boolean;
}

export function CallTablePermissionAlert({ canViewCalls }: CallTablePermissionAlertProps) {
  if (canViewCalls) return null;

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        You don't have permission to view calls. Please contact your administrator.
      </AlertDescription>
    </Alert>
  );
}
