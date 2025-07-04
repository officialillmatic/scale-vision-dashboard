
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Check } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleSignUpClick = () => {
    navigate("/register");
  };

  const handleDashboardClick = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/3cab64ed-2b97-4974-9c76-8ae4f310234d.png" 
              alt="Dr. Scale Logo" 
              className="h-10 w-auto"
            />
            <span className="font-bold text-xl">Dr. Scale</span>
          </div>
          <div>
            {!isLoading && user ? (
              // Show dashboard button for authenticated users
              <Button onClick={handleDashboardClick}>
                Go to Dashboard
              </Button>
            ) : (
              // Show login/signup for non-authenticated users
              <>
                <Button variant="ghost" onClick={handleLoginClick} className="mr-2">
                  Log in
                </Button>
                <Button onClick={handleSignUpClick}>
                  Sign up
                </Button>
              </>
            )}
          </div>
        </header>

        <main className="mt-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Intelligent Call Analytics
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              AI-powered analytics plus 24/7 customer service with automated support, real-time sentiment alerts, and proactive issue resolution.
            </p>
            <div className="flex justify-center gap-4">
              {!isLoading && user ? (
                <Button size="lg" onClick={handleDashboardClick} className="bg-brand-green hover:bg-brand-green/90">
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={handleSignUpClick} className="bg-brand-green hover:bg-brand-green/90">
                    Get Started
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleLoginClick}>
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* New Marketing Block - Styled like feature cards */}
          <div className="mt-16 mb-12 max-w-4xl mx-auto">
            <div className="bg-card rounded-lg p-8 md:p-10 shadow-sm border border-muted animate-fade-in">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
                Replace Entire Teams with One AI Powerhouse
              </h2>
              <p className="text-lg md:text-xl text-center text-muted-foreground mb-8 max-w-3xl mx-auto">
                Inbound. Outbound. Appointments. Sales. Support.<br />
                From solar and roofing to real estate, insurance, and final expense — Dr. Scale delivers 24/7 voice agents that qualify, close, and follow up without a single human.
              </p>
              <div className="max-w-md mx-auto grid gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-green to-brand-deep-green shadow-sm flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-lg font-medium">No payroll.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-green to-brand-deep-green shadow-sm flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-lg font-medium">No burnout.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-green to-brand-deep-green shadow-sm flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-lg font-medium">Just results — on autopilot.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-card rounded-lg p-6 shadow-sm border border-muted">
              <div className="h-12 w-12 rounded-full bg-brand-light-purple flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand-purple">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Call Recording</h3>
              <p className="text-muted-foreground">
                Automatically record and transcribe all your customer calls for later analysis
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-sm border border-muted">
              <div className="h-12 w-12 rounded-full bg-brand-light-purple flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand-purple">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Sentiment Analysis</h3>
              <p className="text-muted-foreground">
                Understand customer emotions and satisfaction through AI-powered sentiment analysis
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-sm border border-muted">
              <div className="h-12 w-12 rounded-full bg-brand-light-purple flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand-purple">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Team Management</h3>
              <p className="text-muted-foreground">
                Manage your team's performance and assign AI agents to optimize workflow
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-sm border border-muted">
              <div className="h-12 w-12 rounded-full bg-brand-light-purple flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand-purple">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <path d="M13 8H7" />
                  <path d="M17 12H7" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Customer Support Automation</h3>
              <p className="text-muted-foreground">
                Automate ticket triage, FAQ responses, and live-agent handoffs to resolve issues faster and boost satisfaction around the clock
              </p>
            </div>
          </div>
        </main>

        <footer className="mt-24 py-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Dr. Scale. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/terms-of-service" className="text-muted-foreground hover:text-brand-green">
                Terms of Service
              </Link>
              <Link to="/privacy-policy" className="text-muted-foreground hover:text-brand-green">
                Privacy Policy
              </Link>
              <Link to="/support" className="text-muted-foreground hover:text-brand-green">
                Support
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
