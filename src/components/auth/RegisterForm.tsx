
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { checkInvitation, acceptInvitation } from "@/services/invitation";
import { RegisterFormHeader } from "./components/RegisterFormHeader";
import { RegisterFormFields, registerSchema, RegisterFormValues } from "./components/RegisterFormFields";
import { RegisterFormButtons } from "./components/RegisterFormButtons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('token');
  const [invitation, setInvitation] = useState(null);
  const [invitationLoading, setInvitationLoading] = useState(invitationToken !== null);
  
  const navigate = useNavigate();
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    // Check invitation token if present
    const verifyInvitation = async () => {
      if (invitationToken) {
        setInvitationLoading(true);
        try {
          const result = await checkInvitation(invitationToken);
          setInvitation(result);
          
          // Pre-fill email field if we have it
          if (result.valid && result.invitation?.email) {
            form.setValue('email', result.invitation.email);
          }
        } catch (error) {
          console.error("Error verifying invitation:", error);
          toast.error("Failed to verify invitation");
        } finally {
          setInvitationLoading(false);
        }
      }
    };
    
    verifyInvitation();
  }, [invitationToken, form]);
  
  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    
    try {
      // If we have an invitation but emails don't match
      if (invitation?.valid && invitation.invitation?.email && invitation.invitation.email !== values.email) {
        toast.error(`This invitation was sent to ${invitation.invitation.email}. Please use that email address.`);
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });
      
      if (error) {
        throw error;
      }
      
      // If we have a valid invitation token, accept it
      if (invitation?.valid && invitationToken && data.user) {
        const accepted = await acceptInvitation(invitationToken, data.user.id);
        if (accepted) {
          toast.success(`You've successfully joined ${invitation.company?.name}`);
        } else {
          toast.error("There was an issue joining the company. Please contact support.");
        }
      }
      
      toast.success("Account created! Please check your email to confirm your registration.");
      navigate("/login");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="pb-2">
        <RegisterFormHeader invitation={invitation} invitationToken={invitationToken} />
      </CardHeader>
      
      {invitationLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      )}
      
      {(!invitationLoading || !invitationToken) && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 pt-4">
              <RegisterFormFields form={form} invitation={invitation} />
            </CardContent>
            <CardFooter className="flex-col gap-4 pt-2">
              <RegisterFormButtons isLoading={isLoading} invitationLoading={invitationLoading} />
            </CardFooter>
          </form>
        </Form>
      )}
    </Card>
  );
}
