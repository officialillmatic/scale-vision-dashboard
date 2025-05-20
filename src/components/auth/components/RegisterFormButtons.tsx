
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Loader } from "lucide-react";

interface RegisterFormButtonsProps {
  isLoading: boolean;
  invitationLoading: boolean;
}

export const RegisterFormButtons = ({ isLoading, invitationLoading }: RegisterFormButtonsProps) => {
  const navigate = useNavigate();

  return (
    <>
      <Button 
        className="w-full bg-brand-green hover:bg-brand-deep-green transition-all" 
        type="submit" 
        disabled={isLoading || invitationLoading}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>
      <Button 
        className="w-full" 
        type="button" 
        variant="outline"
        onClick={() => navigate("/login")}
      >
        Back to Login
      </Button>
    </>
  );
};
