import React from "react";
import { InvitationCheckResult } from "@/services/invitation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InvitationAlertProps {
  invitation: InvitationCheckResult | null;
  invitationToken: string | null;
}

export const InvitationAlert = ({ invitation, invitationToken }: InvitationAlertProps) => {
  if (invitation === null && invitationToken) {
    return (
      <div className="w-full mt-2">
        <Alert>
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>Verifying invitation...</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (invitation?.valid === false) {
    return (
      <div className="w-full mt-2">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>This invitation link is invalid or has expired</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (invitation?.valid && invitation.company && invitation.invitation?.role) {
    return (
      <div className="flex flex-col items-center mt-2">
        <p className="text-sm text-center mb-2">
          You've been invited as a:
        </p>
        <Badge variant="outline" className={
          invitation.invitation.role === 'admin' ? 'bg-purple-100 text-purple-800' :
          invitation.invitation.role === 'member' ? 'bg-blue-100 text-blue-800' : 
          'bg-green-100 text-green-800'
        }>
          {invitation.invitation.role.charAt(0).toUpperCase() + invitation.invitation.role.slice(1)}
        </Badge>
      </div>
    );
  }

  return null;
};
