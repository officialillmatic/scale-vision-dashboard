
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface RegisterFormButtonsProps {
  isLoading: boolean;
  invitationLoading: boolean;
}

export const RegisterFormButtons = ({ isLoading, invitationLoading }: RegisterFormButtonsProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2">
      <Button 
        className="w-full bg-brand-purple hover:bg-brand-deep-purple" 
        type="submit" 
        disabled={isLoading || invitationLoading}
      >
        {isLoading ? "Creating account..." : "Create Account"}
      </Button>
      <Button 
        className="w-full" 
        type="button" 
        variant="outline"
        onClick={() => navigate("/login")}
      >
        Back to Login
      </Button>
    </div>
  );
};
