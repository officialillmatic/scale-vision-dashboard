
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { checkInvitation, acceptInvitation, InvitationCheckResult } from "@/services/invitationService";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('token');
  const [invitation, setInvitation] = useState<InvitationCheckResult | null>(null);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check invitation token if present
    const verifyInvitation = async () => {
      if (invitationToken) {
        const result = await checkInvitation(invitationToken);
        setInvitation(result);
        
        // Pre-fill email field if we have it
        if (result.valid && result.invitation?.email) {
          form.setValue('email', result.invitation.email);
        }
      }
    };
    
    verifyInvitation();
  }, [invitationToken]);
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

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
        const accepted = await acceptInvitation(invitationToken);
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
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
          
          {invitation?.valid && invitation.company && invitation.invitation?.role && (
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
          )}
          
          {invitation === null && invitationToken && (
            <div className="w-full mt-2">
              <Alert>
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>Verifying invitation...</AlertDescription>
              </Alert>
            </div>
          )}
          
          {invitation?.valid === false && (
            <div className="w-full mt-2">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>This invitation link is invalid or has expired</AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      disabled={invitation?.valid && !!invitation.invitation?.email}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              className="w-full bg-brand-purple hover:bg-brand-deep-purple" 
              type="submit" 
              disabled={isLoading || (invitation === null && invitationToken !== null)}
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
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
