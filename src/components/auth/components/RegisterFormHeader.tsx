
import React from "react";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { InvitationCheckResult } from "@/services/invitation";
import { InvitationAlert } from "./InvitationAlert";

interface RegisterFormHeaderProps {
  invitation: InvitationCheckResult | null;
  invitationToken: string | null;
}

export const RegisterFormHeader = ({ invitation, invitationToken }: RegisterFormHeaderProps) => {
  return (
    <div className="flex flex-col items-center space-y-4 text-center">
      <div className="mb-2">
        <img 
          src="/lovable-uploads/3cab64ed-2b97-4974-9c76-8ae4f310234d.png" 
          alt="Dr. Scale Logo" 
          className="h-12 w-auto"
        />
      </div>
      <CardTitle className="text-2xl font-bold">Dr. Scale</CardTitle>
      <CardDescription className="text-base">
        {invitation?.valid && invitation.company 
          ? `Join ${invitation.company.name} by creating an account`
          : "Create a new account to get started"}
      </CardDescription>
      
      <InvitationAlert invitation={invitation} invitationToken={invitationToken} />
    </div>
  );
};
