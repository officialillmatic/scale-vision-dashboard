
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Star, ArrowDown, Users, Shield, Clock } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-brand-background via-background to-brand-light-green/20">
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
              <Button onClick={handleDashboardClick}>
                Go to Dashboard
              </Button>
            ) : (
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
          {/* Enhanced Hero Section */}
          <div className="max-w-5xl mx-auto text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-green/10 to-brand-purple/10 rounded-3xl blur-3xl"></div>
            <div className="relative">
              <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-brand-green via-brand-navy to-brand-purple bg-clip-text text-transparent leading-tight">
                Automate Your Outbound Sales with Human-Like AI Agents
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                Replace entire sales teams with AI agents that qualify leads, book appointments, and close deals 24/7. No payroll, no burnout—just results on autopilot.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                {!isLoading && user ? (
                  <Button size="lg" onClick={handleDashboardClick} className="bg-brand-green hover:bg-brand-deep-green text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                    Access Your Dashboard
                  </Button>
                ) : (
                  <>
                    <Button size="lg" onClick={handleSignUpClick} className="bg-brand-green hover:bg-brand-deep-green text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                      Start Free Trial
                    </Button>
                    <Button size="lg" variant="outline" onClick={handleLoginClick} className="border-brand-green text-brand-green hover:bg-brand-green hover:text-white px-8 py-4 text-lg font-semibold transition-all duration-300">
                      Watch Demo
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-brand-green" />
                <span>No credit card required</span>
                <span className="mx-2">•</span>
                <Check className="h-4 w-4 text-brand-green" />
                <span>Setup in 5 minutes</span>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mt-32 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Get up and running in minutes with our simple 3-step process</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-green to-brand-deep-green rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  {/* Connection line */}
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-brand-green to-brand-purple transform -translate-x-1/2"></div>
                </div>
                <h3 className="text-xl font-semibold mb-3">Integrate Your Numbers</h3>
                <p className="text-muted-foreground">Connect your existing phone system or get new numbers. Our AI integrates seamlessly with your current setup.</p>
              </div>
              
              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-purple to-brand-navy rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-brand-purple to-brand-green transform -translate-x-1/2"></div>
                </div>
                <h3 className="text-xl font-semibold mb-3">Configure AI Scripts</h3>
                <p className="text-muted-foreground">Customize conversation flows, objection handling, and appointment booking for your specific industry and goals.</p>
              </div>
              
              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-green to-brand-purple rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">Start Calling & Get Transfers</h3>
                <p className="text-muted-foreground">Launch your campaign and receive qualified leads with live transfers, appointments booked, and detailed call analytics.</p>
              </div>
            </div>
          </div>

          {/* Enhanced Feature Highlights - 3 Column Grid */}
          <div className="mt-32 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features That Drive Results</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Everything you need to automate and scale your sales operations</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="group bg-card rounded-xl p-8 shadow-sm border border-muted hover:shadow-lg hover:border-brand-green/30 transition-all duration-300 cursor-pointer">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-green to-brand-deep-green flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Voicemail Detection</h3>
                <p className="text-muted-foreground">Never waste minutes on voicemails again. Our AI detects voicemails instantly and moves to the next call, maximizing your connect rate.</p>
              </div>

              <div className="group bg-card rounded-xl p-8 shadow-sm border border-muted hover:shadow-lg hover:border-brand-purple/30 transition-all duration-300 cursor-pointer">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-purple to-brand-navy flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Real-Time Transfers</h3>
                <p className="text-muted-foreground">Qualified prospects get transferred to your sales team instantly while the conversation is hot, increasing your close rate by 300%.</p>
              </div>

              <div className="group bg-card rounded-xl p-8 shadow-sm border border-muted hover:shadow-lg hover:border-brand-green/30 transition-all duration-300 cursor-pointer">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-green to-brand-purple flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Smart Lead Qualification</h3>
                <p className="text-muted-foreground">AI agents qualify leads using your exact criteria, ensuring only high-intent prospects reach your team. No more time wasted on tire-kickers.</p>
              </div>
            </div>
          </div>

          {/* Social Proof Section */}
          <div className="mt-32 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Industry Leaders</h2>
              <p className="text-xl text-muted-foreground">Join hundreds of companies scaling their sales with Dr. Scale</p>
            </div>
            
            {/* Client Logos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 opacity-60">
              <div className="flex items-center justify-center h-20 bg-card rounded-lg border border-muted">
                <span className="text-lg font-semibold text-muted-foreground">SolarCorp</span>
              </div>
              <div className="flex items-center justify-center h-20 bg-card rounded-lg border border-muted">
                <span className="text-lg font-semibold text-muted-foreground">RoofTech</span>
              </div>
              <div className="flex items-center justify-center h-20 bg-card rounded-lg border border-muted">
                <span className="text-lg font-semibold text-muted-foreground">PropData</span>
              </div>
              <div className="flex items-center justify-center h-20 bg-card rounded-lg border border-muted">
                <span className="text-lg font-semibold text-muted-foreground">InsureMax</span>
              </div>
            </div>

            {/* Testimonials */}
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card rounded-xl p-8 shadow-sm border border-muted">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">"We doubled our appointment rate in two weeks. The AI agents are so natural, prospects actually prefer talking to them over our human reps."</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-green to-brand-deep-green rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">MJ</span>
                  </div>
                  <div>
                    <div className="font-semibold">Mike Johnson</div>
                    <div className="text-sm text-muted-foreground">CEO, SolarCorp</div>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl p-8 shadow-sm border border-muted">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">"Reduced our cost per lead by 75% while increasing quality. The AI never gets tired and handles objections better than our junior reps."</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-purple to-brand-navy rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">SR</span>
                  </div>
                  <div>
                    <div className="font-semibold">Sarah Rodriguez</div>
                    <div className="text-sm text-muted-foreground">VP Sales, RoofTech</div>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl p-8 shadow-sm border border-muted">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">"The ROI is incredible. We're booking 10x more appointments with half the overhead. It's like having 50 top performers working 24/7."</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-green to-brand-purple rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">DK</span>
                  </div>
                  <div>
                    <div className="font-semibold">David Kim</div>
                    <div className="text-sm text-muted-foreground">Founder, PropData</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Tease Section */}
          <div className="mt-32 max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-brand-light-green to-brand-background rounded-2xl p-8 md:p-12 border border-brand-green/20">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-muted-foreground mb-8">Choose the plan that fits your scale</p>
              
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="text-left">
                  <h3 className="text-xl font-semibold mb-3">Pay-As-You-Go</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand-green" />
                      <span>$0.15 per minute</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand-green" />
                      <span>No monthly commitments</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand-green" />
                      <span>Perfect for testing</span>
                    </li>
                  </ul>
                </div>
                
                <div className="text-left">
                  <h3 className="text-xl font-semibold mb-3">Subscription Plans</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand-green" />
                      <span>Up to 40% savings</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand-green" />
                      <span>Priority support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand-green" />
                      <span>Advanced analytics</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <Button size="lg" variant="outline" className="border-brand-green text-brand-green hover:bg-brand-green hover:text-white">
                View Detailed Pricing
              </Button>
            </div>
          </div>
        </main>

        {/* Enhanced Footer */}
        <footer className="mt-32 bg-gradient-to-br from-brand-navy/5 to-brand-green/5 py-16 border-t">
          <div className="max-w-6xl mx-auto">
            {/* Trust Badges */}
            <div className="text-center mb-12">
              <p className="text-sm text-muted-foreground mb-6">Trusted by 500+ companies worldwide</p>
              <div className="flex flex-wrap justify-center items-center gap-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-brand-green" />
                  <span>GDPR Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-brand-green" />
                  <span>SOC 2 Certified</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-brand-green" />
                  <span>Enterprise Security</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-brand-green" />
                  <span>99.9% Uptime SLA</span>
                </div>
              </div>
            </div>

            {/* Footer Links */}
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <img 
                    src="/lovable-uploads/3cab64ed-2b97-4974-9c76-8ae4f310234d.png" 
                    alt="Dr. Scale Logo" 
                    className="h-8 w-auto"
                  />
                  <span className="font-bold text-lg">Dr. Scale</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  AI-powered sales automation that replaces entire teams with intelligent agents.
                </p>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-brand-green/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-brand-green/20 transition-colors">
                    <span className="text-xs font-bold">𝕏</span>
                  </div>
                  <div className="w-8 h-8 bg-brand-green/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-brand-green/20 transition-colors">
                    <span className="text-xs font-bold">in</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="#" className="hover:text-brand-green transition-colors">Features</Link></li>
                  <li><Link to="#" className="hover:text-brand-green transition-colors">Pricing</Link></li>
                  <li><Link to="#" className="hover:text-brand-green transition-colors">Integrations</Link></li>
                  <li><Link to="#" className="hover:text-brand-green transition-colors">API Docs</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="#" className="hover:text-brand-green transition-colors">About Us</Link></li>
                  <li><Link to="#" className="hover:text-brand-green transition-colors">Careers</Link></li>
                  <li><Link to="#" className="hover:text-brand-green transition-colors">Blog</Link></li>
                  <li><Link to="/support" className="hover:text-brand-green transition-colors">Support</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/privacy-policy" className="hover:text-brand-green transition-colors">Privacy Policy</Link></li>
                  <li><Link to="/terms-of-service" className="hover:text-brand-green transition-colors">Terms of Service</Link></li>
                  <li><Link to="#" className="hover:text-brand-green transition-colors">Security</Link></li>
                  <li><Link to="#" className="hover:text-brand-green transition-colors">Compliance</Link></li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 border-t border-muted flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Dr. Scale. All rights reserved.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>As featured in:</span>
                <span className="font-medium text-foreground">TechCrunch</span>
                <span>•</span>
                <span className="font-medium text-foreground">Forbes</span>
                <span>•</span>
                <span className="font-medium text-foreground">VentureBeat</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
