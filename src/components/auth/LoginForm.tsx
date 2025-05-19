
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      toast.success("Successfully logged in!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to log in. Please check your credentials.");
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
            Sign in to your account to continue
          </CardDescription>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button 
                variant="link" 
                className="text-sm text-brand-purple p-0 h-auto" 
                type="button"
                onClick={() => toast.info("Please contact your administrator to reset your password.")}
              >
                Forgot password?
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            className="w-full bg-brand-purple hover:bg-brand-deep-purple" 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          <Button 
            className="w-full" 
            type="button" 
            variant="outline"
            onClick={() => navigate("/register")}
          >
            Create an account
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
