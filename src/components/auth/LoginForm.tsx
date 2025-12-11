import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client"; // ✅ CAMBIO CRÍTICO
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// ✅ Función helper para timeout
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};

export const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      console.log("🔐 [LoginForm] Attempting to sign in...");
      console.log("🔐 [LoginForm] Email:", values.email.trim());
      
      // ✅ Aumentar timeout a 30 segundos
      const loginPromise = supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });
      
      const { error, data } = await withTimeout(loginPromise, 30000);
      
      if (error) {
        console.error("❌ [LoginForm] Supabase login error:", error);
        throw error;
      }
      
      console.log("✅ [LoginForm] Login successful");
      console.log("✅ [LoginForm] User:", data.user?.email);
      console.log("✅ [LoginForm] Session:", !!data.session);
      
      toast.success("Successfully signed in");
      
      // ✅ Pequeña pausa para que AuthContext procese
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("➡️ [LoginForm] Navigating to dashboard...");
      navigate("/dashboard");
      
    } catch (error: any) {
      console.error("💥 [LoginForm] Full login error:", error);
      
      if (error.message === 'Request timeout') {
        setAuthError(
          "Login is taking too long. Please check your internet connection and try again."
        );
      } else if (error.message?.includes("Failed to fetch")) {
        setAuthError(
          "Network error connecting to authentication service. Please check your network connection or try again later."
        );
      } else if (error.message?.includes("Invalid login credentials")) {
        setAuthError("Invalid email or password. Please check your credentials and try again.");
      } else {
        setAuthError(error.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-0">
      <div className="flex flex-col items-center space-y-4 text-center pt-8">
        <div className="mb-2">
          <img 
            src="/lovable-uploads/3cab64ed-2b97-4974-9c76-8ae4f310234d.png" 
            alt="Dr. Scale Logo" 
            className="h-14 w-auto"
          />
        </div>
        <h1 className="text-2xl font-bold text-center">Welcome back</h1>
        <p className="text-muted-foreground text-center">
          Enter your credentials to sign in to your account
        </p>
      </div>
      <CardContent className="pt-8">
        {authError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                      className="h-11"
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link to="/forgot-password" className="text-sm text-brand-green hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-brand-green hover:bg-brand-deep-green h-11 mt-2" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 text-center pt-2 pb-8">
        <div className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="text-brand-green font-medium hover:underline">
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};
