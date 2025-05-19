
import React from "react";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { InvitationCheckResult } from "@/services/invitationService";
import { InvitationAlert } from "./InvitationAlert";

interface RegisterFormHeaderProps {
  invitation: InvitationCheckResult | null;
  invitationToken: string | null;
}

export const RegisterFormHeader = ({ invitation, invitationToken }: RegisterFormHeaderProps) => {
  return (
    <div className="flex flex-col items-center space-y-2 text-center">
      <div className="rounded-full bg-brand-purple p-2 w-12 h-12 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 9h.01" />
          <path d="M15 9h.01" />
          <path d="M9 15l.01-.011" />
          <path d="M15 15l.01-.011" />
        </svg>
      </div>
      <CardTitle className="text-2xl font-bold">EchoWave</CardTitle>
      <CardDescription>
        {invitation?.valid && invitation.company 
          ? `Join ${invitation.company.name} by creating an account`
          : "Create a new account to get started"}
      </CardDescription>
      
      <InvitationAlert invitation={invitation} invitationToken={invitationToken} />
    </div>
  );
};
