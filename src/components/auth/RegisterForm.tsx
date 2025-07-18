
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
  const emailParam = searchParams.get('email');
  const [invitation, setInvitation] = useState(null);
  const [invitationLoading, setInvitationLoading] = useState(invitationToken !== null);
  
  const navigate = useNavigate();
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: emailParam || "",
      password: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    // Pre-fill email from URL parameter
    if (emailParam) {
      console.log('📧 Pre-filling email from URL:', emailParam);
      form.setValue('email', emailParam);
    }

    // Check invitation token if present
    const verifyInvitation = async () => {
      if (invitationToken) {
        setInvitationLoading(true);
        try {
          console.log('🔍 Verifying invitation token:', invitationToken);
          const result = await checkInvitation(invitationToken);
          console.log('✅ Invitation verification result:', result);
          setInvitation(result);
          
          // Pre-fill email field if we have it from invitation
          if (result.valid && result.invitation?.email) {
            console.log('📧 Pre-filling email from invitation:', result.invitation.email);
            form.setValue('email', result.invitation.email);
          }
        } catch (error) {
          console.error("💥 Error verifying invitation:", error);
          toast.error("Failed to verify invitation");
        } finally {
          setInvitationLoading(false);
        }
      }
    };
    
    verifyInvitation();
  }, [invitationToken, emailParam, form]);
  
  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    
    try {
      console.log('🚀 [RegisterForm] Starting registration process...');
      console.log('📧 [RegisterForm] Email:', values.email);
      console.log('🎫 [RegisterForm] Has invitation token:', Boolean(invitationToken));
      
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
      
      console.log('✅ [RegisterForm] User created successfully:', data.user?.id);
      
      // If we have a valid invitation token, accept it
      if (invitation?.valid && invitationToken && data.user) {
        console.log('🎯 [RegisterForm] Accepting invitation...');
        const accepted = await acceptInvitation(invitationToken, data.user.id);
        if (accepted) {
          toast.success(`Welcome to ${invitation.company?.name}! Your account is ready.`, {
            action: {
              label: "Go to Dashboard",
              onClick: () => navigate("/dashboard")
            }
          });
          
          // CRITICAL: Trigger team list refresh immediately and with delays
          console.log('🔄 [RegisterForm] Broadcasting team refresh event immediately...');
          
          // Immediate broadcast
          window.dispatchEvent(new CustomEvent('teamMemberRegistered', {
            detail: { 
              email: values.email, 
              userId: data.user.id,
              timestamp: new Date().toISOString(),
              source: 'registration'
            }
          }));
          
          // Additional broadcasts with delays to ensure sync
          setTimeout(() => {
            console.log('🔄 [RegisterForm] Broadcasting delayed refresh (2s)...');
            window.dispatchEvent(new CustomEvent('teamMemberRegistered', {
              detail: { 
                email: values.email, 
                userId: data.user.id,
                timestamp: new Date().toISOString(),
                source: 'registration-delayed-2s'
              }
            }));
          }, 2000);
          
          setTimeout(() => {
            console.log('🔄 [RegisterForm] Broadcasting delayed refresh (5s)...');
            window.dispatchEvent(new CustomEvent('teamMemberRegistered', {
              detail: { 
                email: values.email, 
                userId: data.user.id,
                timestamp: new Date().toISOString(),
                source: 'registration-delayed-5s'
              }
            }));
          }, 5000);
          
        } else {
          toast.error("There was an issue joining the company. Please contact support.");
        }
      } else {
        toast.success("Welcome to Dr. Scale! Your account is ready to use.", {
          action: {
            label: "Go to Dashboard",
            onClick: () => navigate("/dashboard")
          }
        });
      }
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (error: any) {
      console.error("💥 [RegisterForm] Signup error:", error);
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
              <RegisterFormFields 
                form={form} 
                invitation={invitation} 
                invitedEmail={emailParam || undefined}
              />
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
