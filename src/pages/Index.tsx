import React, { useRef, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Star, ArrowDown, Users, Shield, Clock, Headphones, Play, Pause, Volume2, Loader2, Crown, Zap, Sparkles, ArrowRight } from "lucide-react";
const Index = () => {
  const navigate = useNavigate();
  const {
    user,
    isLoading
  } = useAuth();

  // Audio player refs and state
  const audioRefs = useRef([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [playingStates, setPlayingStates] = useState(Array(6).fill(false));
  const [loadingStates, setLoadingStates] = useState(Array(6).fill(false));
  const [progressStates, setProgressStates] = useState(Array(6).fill(0));
  const [durationStates, setDurationStates] = useState(Array(6).fill(0));
  const [currentTimeStates, setCurrentTimeStates] = useState(Array(6).fill(0));
  const audioFiles = [{
    title: "Customer Support Hotline",
    description: "Resolve FAQs and escalate complex cases.",
    url: "https://raw.githubusercontent.com/officialillmatic/scale-vision-dashboard/main/public/audios/audio1.mp3"
  }, {
    title: "After-Hours Answering Service",
    description: "Capture every lead and support request when offices are closed.",
    url: "https://raw.githubusercontent.com/officialillmatic/scale-vision-dashboard/main/public/audios/audio2.mp3"
  }, {
    title: "Appointment Scheduling & Reminders",
    description: "Reduce no-shows and free internal resources.",
    url: "https://raw.githubusercontent.com/officialillmatic/scale-vision-dashboard/main/public/audios/audio3.mp3"
  }, {
    title: "Order Status & Tracking",
    description: "Provide instant updates to enhance customer satisfaction.",
    url: "https://raw.githubusercontent.com/officialillmatic/scale-vision-dashboard/main/public/audios/audio4.mp3"
  }, {
    title: "Customer Support Ticket",
    description: "AI handling customer inquiries and routing tickets",
    url: "https://raw.githubusercontent.com/officialillmatic/scale-vision-dashboard/main/public/audios/audio5.mp3"
  }, {
    title: "Appointment Confirmation",
    description: "Automated appointment confirmations and rescheduling",
    url: "https://raw.githubusercontent.com/officialillmatic/scale-vision-dashboard/main/public/audios/audio6.mp3"
  }];

  // Componente de ecualizador visual
  const AudioEqualizer = ({
    isPlaying
  }) => {
    if (!isPlaying) return null;
    return <div className="flex items-center gap-1 ml-2">
        {[...Array(4)].map((_, i) => <div key={i} className="w-1 bg-brand-green rounded-full animate-pulse" style={{
        height: '12px',
        animationDelay: `${i * 0.1}s`,
        animationDuration: `${0.5 + i * 0.1}s`
      }} />)}
      </div>;
  };
  const formatTime = time => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  const handleLoadStart = index => {
    setLoadingStates(prev => prev.map((_, i) => i === index ? true : prev[i]));
  };
  const handleCanPlay = index => {
    setLoadingStates(prev => prev.map((_, i) => i === index ? false : prev[i]));
  };
  const handleLoadedMetadata = index => {
    const audio = audioRefs.current[index];
    if (audio) {
      setDurationStates(prev => prev.map((_, i) => i === index ? audio.duration : prev[i]));
    }
  };
  const handleTimeUpdate = index => {
    const audio = audioRefs.current[index];
    if (audio) {
      const progress = audio.currentTime / audio.duration * 100;
      setProgressStates(prev => prev.map((_, i) => i === index ? progress : prev[i]));
      setCurrentTimeStates(prev => prev.map((_, i) => i === index ? audio.currentTime : prev[i]));
    }
  };
  const handlePlayPause = index => {
    const audio = audioRefs.current[index];
    if (currentlyPlaying === index) {
      // Pause current audio
      audio.pause();
      setCurrentlyPlaying(null);
      setPlayingStates(prev => prev.map((_, i) => i === index ? false : prev[i]));
    } else {
      // Pause all other audios
      audioRefs.current.forEach((audioRef, i) => {
        if (audioRef && i !== index) {
          audioRef.pause();
        }
      });

      // Play selected audio
      setLoadingStates(prev => prev.map((_, i) => i === index ? true : prev[i]));
      audio.play().then(() => {
        setLoadingStates(prev => prev.map((_, i) => i === index ? false : prev[i]));
      }).catch(() => {
        setLoadingStates(prev => prev.map((_, i) => i === index ? false : prev[i]));
      });
      setCurrentlyPlaying(index);
      setPlayingStates(prev => prev.map((_, i) => i === index ? true : false));
    }
  };
  const handleAudioEnd = index => {
    setCurrentlyPlaying(null);
    setPlayingStates(prev => prev.map((_, i) => i === index ? false : prev[i]));
    setProgressStates(prev => prev.map((_, i) => i === index ? 0 : prev[i]));
    setCurrentTimeStates(prev => prev.map((_, i) => i === index ? 0 : prev[i]));
  };
  const handleProgressClick = (index, event) => {
    const audio = audioRefs.current[index];
    const progressBar = event.currentTarget;
    const clickX = event.nativeEvent.offsetX;
    const width = progressBar.offsetWidth;
    const clickTime = clickX / width * audio.duration;
    audio.currentTime = clickTime;
  };
  const handleLoginClick = () => {
    navigate("/login");
  };
  const handleSignUpClick = () => {
    navigate("/register");
  };
  const handleDashboardClick = () => {
    navigate("/dashboard");
  };
  return <div className="min-h-screen bg-gradient-to-br from-brand-background via-background to-brand-light-green/20">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/3cab64ed-2b97-4974-9c76-8ae4f310234d.png" alt="Dr. Scale Logo" className="h-10 w-auto" />
            <span className="font-bold text-xl">Dr. Scale</span>
          </div>
          <div>
            {!isLoading && user ? <Button onClick={handleDashboardClick}>
                Go to Dashboard
              </Button> : <>
                <Button variant="ghost" onClick={handleLoginClick} className="mr-2">
                  Log in
                </Button>
                <Button onClick={handleSignUpClick}>
                  Sign up
                </Button>
              </>}
          </div>
        </header>

        <main className="mt-20">
          {/* Enhanced Hero Section */}
          <div className="max-w-6xl mx-auto relative py-16 md:py-20">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-green/5 to-brand-purple/5 rounded-3xl blur-3xl"></div>
            <div className="grid lg:grid-cols-2 gap-12 items-center relative">
              {/* Left Content */}
              <div className="text-center lg:text-left">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-brand-green via-brand-navy to-brand-purple bg-clip-text text-transparent leading-[1.1]">
                  AI Answering Service for 24/7 Customer Support—Built for Business
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed">
                  Reduce call-center overhead and deliver consistent, professional service around the clock. Dr. Scale's AI agents handle every call, ticket, and after-hours inquiry—seamlessly integrated with your existing systems.
                </p>
                <div className="flex flex-col sm:flex-row lg:justify-start justify-center gap-4 mb-8">
                  {!isLoading && user && <Button size="lg" onClick={handleDashboardClick} className="bg-brand-green hover:bg-brand-deep-green text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                      Access Your Dashboard
                    </Button>}
                </div>
              </div>
              
              {/* Right Hero Image */}
              <div className="relative lg:order-2">
                <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-brand-green/10 to-brand-purple/10 p-8 flex items-center justify-center">
                  <img src="/lovable-uploads/3cab64ed-2b97-4974-9c76-8ae4f310234d.png" alt="Dr. Scale Logo - AI-powered sales automation platform" className="w-full max-w-md h-auto rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/20 to-transparent rounded-2xl"></div>
                  
                  {/* Floating Stats Cards */}
                  <div className="absolute -top-4 -left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-brand-green/20">
                    <div className="text-2xl font-bold text-brand-green">     300%</div>
                    <div className="text-sm text-muted-foreground">Close Rate Boost</div>
                  </div>
                  
                  <div className="absolute -bottom-4 -right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-brand-purple/20">
                    <div className="text-2xl font-bold text-brand-purple">    24/7</div>
                    <div className="text-sm text-muted-foreground">Always Available</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Video Section */}
          <section className="relative py-16 lg:py-24 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 my-16">
            {/* Animated background elements */}
            <div className="absolute inset-0">
              <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-brand-green/10 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-brand-purple/10 rounded-full blur-2xl animate-pulse delay-700"></div>
            </div>
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="text-center mb-12 lg:mb-16">
                <div className="inline-flex items-center px-4 py-2 bg-brand-green/10 border border-brand-green/20 rounded-full text-brand-green font-medium text-sm mb-6 animate-fade-in">
                  <span className="w-2 h-2 bg-brand-green rounded-full mr-2 animate-pulse"></span>
                  See It In Action
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 animate-fade-in">
                  Experience the Future of 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-brand-purple"> AI Voice Operations</span>
                </h2>
                <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto animate-fade-in">
                  Watch how Dr. Scale transforms customer interactions with intelligent, always-available AI agents
                </p>
              </div>
              
              {/* Video Container */}
              <div className="relative max-w-5xl mx-auto">
                {/* Glow effect behind video */}
                <div className="absolute inset-0 bg-gradient-to-r from-brand-green/20 to-brand-purple/20 blur-xl scale-105 animate-pulse"></div>
                
                {/* Video wrapper with premium styling */}
                <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-3 sm:p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-700/50 shadow-2xl">
                  <div className="relative rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl bg-black">
                    <video
                      className="w-full h-auto aspect-video object-cover"
                      controls
                      preload="metadata"
                      poster="/placeholder.svg"
                    >
                      <source src="/videos/demo-video.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    
                    {/* Play button overlay for better UX */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 text-white">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Video stats */}
                  <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse"></div>
                      <span>Live Demo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-brand-purple rounded-full animate-pulse"></div>
                      <span>Real-time Processing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                      <span>24/7 Availability</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bottom CTA */}
              <div className="text-center mt-12 lg:mt-16 animate-fade-in">
                <p className="text-slate-300 mb-6 text-lg">
                  Ready to transform your customer service?
                </p>
                <Button 
                  size="lg" 
                  onClick={handleSignUpClick}
                  className="bg-gradient-to-r from-brand-green to-brand-purple hover:from-brand-deep-green hover:to-brand-navy text-white shadow-2xl shadow-brand-green/25 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 hover:scale-105"
                >
                  Start Your Free Trial
                </Button>
              </div>
            </div>
          </section>

          {/* Pricing Plans CTA Section */}
          <div className="max-w-6xl mx-auto py-12 md:py-16">
            <div className="bg-gradient-to-br from-brand-green/5 via-brand-purple/5 to-brand-navy/5 rounded-3xl p-8 md:p-12 border border-brand-green/20 shadow-xl">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-brand-green/10 text-brand-green px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <Star className="h-4 w-4" />
                  Choose Your Perfect Plan
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-brand-green to-brand-purple bg-clip-text text-transparent">
                  Scale Your AI Voice Operations
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  From essential features to enterprise-grade solutions with comprehensive support
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-8">
                {/* Essential Plan */}
                <div className="group bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-blue-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Zap className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Essential Support</h3>
                      <p className="text-sm text-muted-foreground">Perfect for small teams</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-gray-900">$150<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                    <div className="text-xs text-muted-foreground">Starting from</div>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Standard tech support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Email & chat support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Monthly performance reports</span>
                    </li>
                  </ul>
                </div>

                {/* Professional Plan */}
                <div className="group bg-white/70 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Most Popular
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Crown className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Professional Support</h3>
                      <p className="text-sm text-muted-foreground">Ideal for growing businesses</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-gray-900">$350<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                    <div className="text-xs text-muted-foreground">Starting from</div>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Everything in Essential</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Priority support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Advanced customization</span>
                    </li>
                  </ul>
                </div>

                {/* Enterprise Plan */}
                <div className="group bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-green-100 hover:border-green-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Enterprise Custom</h3>
                      <p className="text-sm text-muted-foreground">Fully customized solution</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-gray-900">$650<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                    <div className="text-xs text-muted-foreground">Starting from</div>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Everything in Professional</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Dedicated account manager</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>24/7 priority support</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="text-center">
                <Button 
                  size="lg" 
                  onClick={() => navigate("/pricing")}
                  className="bg-gradient-to-r from-brand-green to-brand-purple hover:from-brand-deep-green hover:to-brand-navy text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  View All Plans & Features
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mt-24 md:mt-32 max-w-6xl mx-auto py-16 md:py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-[1.1]">How It Works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Get up and running in minutes with our simple 3-step process</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-green to-brand-deep-green rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 relative z-10">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  {/* Connection line - properly centered */}
                  <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-brand-green to-brand-purple transform translate-x-10 z-0"></div>
                </div>
                <h3 className="text-xl font-semibold mb-3">Choose Your Support Type</h3>
                <p className="text-muted-foreground">Select inbound, outbound, or a blended model. We configure the platform to match your business processes and compliance requirements.</p>
              </div>
              
              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-purple to-brand-navy rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 relative z-10">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-brand-purple to-brand-green transform translate-x-10 z-0"></div>
                </div>
                <h3 className="text-xl font-semibold mb-3">Collaborate with Our Implementation Specialist</h3>
                <p className="text-muted-foreground">A dedicated Dr. Scale technician works directly with your team to integrate CRMs, set up routing, and customize scripts—so deployment is effortless.</p>
              </div>
              
              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-green to-brand-purple rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 relative z-10">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">Go Live & Monitor Performance</h3>
                <p className="text-muted-foreground">Launch in minutes. View real-time analytics, SLAs, and call metrics, and scale capacity instantly as demand grows.</p>
              </div>
            </div>
          </div>

          {/* Enhanced Feature Highlights - 2x2 Grid */}
          <div className="mt-24 md:mt-32 max-w-5xl mx-auto py-16 md:py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-[1.1]">Enterprise-Grade Features</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Everything you need to deliver exceptional customer support around the clock</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="group bg-card rounded-xl p-8 shadow-sm border border-muted hover:shadow-lg hover:border-brand-green/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-green to-brand-deep-green flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Advanced Voicemail Detection</h3>
                <p className="text-muted-foreground">Maximize connect rates by skipping voicemail in real time.</p>
              </div>

              <div className="group bg-card rounded-xl p-8 shadow-sm border border-muted hover:shadow-lg hover:border-brand-purple/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-purple to-brand-navy flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Live Call Transfers</h3>
                <p className="text-muted-foreground">Route qualified calls directly to your team for high-value conversations.</p>
              </div>

              <div className="group bg-card rounded-xl p-8 shadow-sm border border-muted hover:shadow-lg hover:border-brand-green/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-green to-brand-purple flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Intelligent Ticket & Lead Routing</h3>
                <p className="text-muted-foreground">Automatically classify and prioritize inquiries, ensuring fast resolution.</p>
              </div>

              <div className="group bg-card rounded-xl p-8 shadow-sm border border-muted hover:shadow-lg hover:border-brand-purple/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-purple to-brand-green flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Headphones className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">24/7 Customer Engagement</h3>
                <p className="text-muted-foreground">Provide consistent, human-like support across time zones—without staffing night shifts.</p>
              </div>
            </div>
          </div>

          {/* Voice Agents Cases Section */}
          <div className="mt-32 max-w-6xl mx-auto py-16 md:py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Voice Agent Applications</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Listen to real conversations with our AI agents in action</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {audioFiles.map((audio, index) => <div key={index} className="group bg-card rounded-xl p-6 shadow-sm border border-muted hover:shadow-lg hover:border-brand-green/30 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => handlePlayPause(index)} disabled={loadingStates[index]} className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${playingStates[index] ? 'bg-brand-green border-brand-green text-white shadow-lg' : 'border-brand-green text-brand-green hover:bg-brand-green hover:text-white group-hover:shadow-md'} ${loadingStates[index] ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {loadingStates[index] ? <Loader2 className="h-5 w-5 animate-spin" /> : playingStates[index] ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                    </button>
                    <Volume2 className="h-5 w-5 text-brand-green/70" />
                    <AudioEqualizer isPlaying={playingStates[index]} />
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-brand-green transition-colors">
                    {audio.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {audio.description}
                  </p>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2 mb-2 cursor-pointer hover:h-2.5 transition-all duration-200" onClick={e => handleProgressClick(index, e)}>
                    <div className={`h-full rounded-full transition-all duration-200 ${playingStates[index] ? 'bg-brand-green shadow-sm' : 'bg-brand-green/40'}`} style={{
                  width: `${progressStates[index] || 0}%`
                }}></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTimeStates[index])}</span>
                    <span>{formatTime(durationStates[index])}</span>
                  </div>
                  
                  {/* Hidden audio element */}
                  <audio ref={el => audioRefs.current[index] = el} src={audio.url} onLoadStart={() => handleLoadStart(index)} onCanPlay={() => handleCanPlay(index)} onLoadedMetadata={() => handleLoadedMetadata(index)} onTimeUpdate={() => handleTimeUpdate(index)} onEnded={() => handleAudioEnd(index)} preload="metadata" />
                </div>)}
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
                <div className="flex justify-center items-center mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />)}
                </div>
                <p className="text-muted-foreground mb-6 italic text-lg">"We doubled our appointment rate in two weeks. The AI agents are so natural, prospects actually prefer talking to them over our human reps."</p>
                <div className="flex items-center gap-3">
                  <img src="/lovable-uploads/de797862-a6b9-48eb-8519-b1abbc1ac7af.png" alt="Mike Johnson, CEO of SolarCorp" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold">Mike Johnson</div>
                    <div className="text-sm text-muted-foreground">CEO, SolarCorp</div>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl p-8 shadow-sm border border-muted">
                <div className="flex justify-center items-center mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />)}
                </div>
                <p className="text-muted-foreground mb-6 italic text-lg">"Our inbound call costs dropped 40% while CSAT improved. Dr. Scale gives us true 24/7 coverage without adding headcount."</p>
                <div className="flex items-center gap-3">
                  <img src="/lovable-uploads/1324861e-c0cc-441f-be79-541f8093e1f7.png" alt="Sarah R., VP of Support" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold">Sarah R.</div>
                    <div className="text-sm text-muted-foreground">VP of Support</div>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl p-8 shadow-sm border border-muted">
                <div className="flex justify-center items-center mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />)}
                </div>
                <p className="text-muted-foreground mb-6 italic text-lg">"The ROI is incredible. We're booking 10x more appointments with half the overhead. It's like having 50 top performers working 24/7."</p>
                <div className="flex items-center gap-3">
                  <img src="/lovable-uploads/67f04a61-20f5-4c88-b471-20c5bd987615.png" alt="David Kim, Founder of PropData" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold">David Kim</div>
                    <div className="text-sm text-muted-foreground">Founder, PropData</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div id="pricing" className="mt-16 md:mt-32 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/20 to-emerald-900/30 rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 border border-white/10 shadow-2xl backdrop-blur-sm">
                {/* Premium background effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-purple-500/5 to-blue-500/5 animate-pulse"></div>
                <div className="absolute -top-20 md:-top-40 -left-20 md:-left-40 w-40 md:w-80 h-40 md:h-80 bg-gradient-to-r from-emerald-400/20 to-purple-400/20 rounded-full blur-2xl md:blur-3xl"></div>
                <div className="absolute -bottom-20 md:-bottom-40 -right-20 md:-right-40 w-40 md:w-80 h-40 md:h-80 bg-gradient-to-r from-purple-400/20 to-blue-400/20 rounded-full blur-2xl md:blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-purple-500/20 backdrop-blur-sm border border-white/20 text-white px-3 sm:px-4 md:px-6 py-2 md:py-3 rounded-full text-xs sm:text-sm font-semibold mb-4 md:mb-6 shadow-lg">
                    <div className="w-1.5 md:w-2 h-1.5 md:h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="tracking-wide">ENTERPRISE-GRADE SOLUTION</span>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black mb-4 md:mb-6 bg-gradient-to-r from-white via-emerald-200 to-purple-200 bg-clip-text text-transparent leading-tight">
                    Premium, Performance-Driven
                    <br />
                    <span className="text-xl sm:text-2xl md:text-3xl lg:text-5xl">Pricing</span>
                  </h2>
                  <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 mb-8 md:mb-12 font-light max-w-2xl mx-auto leading-relaxed px-2">
                    Choose the plan that scales with your growth and transforms your operations
                  </p>
                  
                  <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 lg:p-12 border border-white/20 shadow-xl mb-6 md:mb-8">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-6 md:mb-8">
                      <div className="w-8 md:w-12 h-8 md:h-12 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-4 md:w-6 h-4 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center sm:text-left">Pay-As-You-Grow</h3>
                    </div>
                    
                    <div className="grid gap-4 md:gap-6 text-left max-w-3xl mx-auto">
                      <div className="group flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg md:rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border-l-4 border-emerald-400 hover:from-emerald-500/20 transition-all duration-300">
                        <div className="mt-0.5 sm:mt-1 w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Check className="h-3 sm:h-5 w-3 sm:w-5 text-white font-bold" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed text-white font-medium">
                            <span className="text-emerald-300 font-bold text-base sm:text-lg md:text-xl">From just $0.34 per connected minute</span>
                            <br />
                            <span className="text-white/80 text-sm sm:text-base">Pay only for productive talk time, never idle minutes.</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="group flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg md:rounded-xl bg-gradient-to-r from-purple-500/10 to-transparent border-l-4 border-purple-400 hover:from-purple-500/20 transition-all duration-300">
                        <div className="mt-0.5 sm:mt-1 w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Check className="h-3 sm:h-5 w-3 sm:w-5 text-white font-bold" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed text-white font-medium">
                            <span className="text-purple-300 font-bold">Slash overhead & payroll</span>
                            <br />
                            <span className="text-white/80 text-sm sm:text-base">Replace expensive staffing with always-on AI voice agents.</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="group flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg md:rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent border-l-4 border-blue-400 hover:from-blue-500/20 transition-all duration-300">
                        <div className="mt-0.5 sm:mt-1 w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Check className="h-3 sm:h-5 w-3 sm:w-5 text-white font-bold" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed text-white font-medium">
                            <span className="text-blue-300 font-bold">Zero contracts, total control</span>
                            <br />
                            <span className="text-white/80 text-sm sm:text-base">Scale up or down instantly with no long-term lock-ins.</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="group flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg md:rounded-xl bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-yellow-400 hover:from-yellow-500/20 transition-all duration-300">
                        <div className="mt-0.5 sm:mt-1 w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Check className="h-3 sm:h-5 w-3 sm:w-5 text-white font-bold" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed text-white font-medium">
                            <span className="text-yellow-300 font-bold">Elastic capacity</span>
                            <br />
                            <span className="text-white/80 text-sm sm:text-base">Absorb call spikes in seconds without hiring or training.</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="group flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg md:rounded-xl bg-gradient-to-r from-rose-500/10 to-transparent border-l-4 border-rose-400 hover:from-rose-500/20 transition-all duration-300">
                        <div className="mt-0.5 sm:mt-1 w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Check className="h-3 sm:h-5 w-3 sm:w-5 text-white font-bold" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed text-white font-medium">
                            <span className="text-rose-300 font-bold">Proven ROI</span>
                            <br />
                            <span className="text-white/80 text-sm sm:text-base">Clients cut support costs by 30–60% while boosting customer satisfaction.</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button size="lg" className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800 text-white px-6 sm:px-8 md:px-12 py-3 sm:py-4 text-base sm:text-lg md:text-xl font-bold shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 transform hover:scale-105 border-0 rounded-xl md:rounded-2xl w-full sm:w-auto">
                    <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
                      <svg className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule Demo
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 group-hover:animate-pulse"></div>
                  </Button>
                  <p className="text-white/60 text-xs sm:text-sm mt-3 sm:mt-4 font-medium">
                    ✨ No setup fees • Cancel anytime • 99.9% uptime SLA
                  </p>
                </div>
              </div>
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Headphones className="h-4 w-4 text-brand-green" />
                  <span>24/7 Live Support</span>
                </div>
              </div>
            </div>

            {/* Footer Links */}
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <img src="/lovable-uploads/3cab64ed-2b97-4974-9c76-8ae4f310234d.png" alt="Dr. Scale Logo" className="h-8 w-auto" />
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
    </div>;
};
export default Index;
