import React, { useRef, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Star, ArrowDown, Users, Shield, Clock, Headphones, Play, Pause, Volume2, Loader2 } from "lucide-react";
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
          <div className="max-w-6xl mx-auto relative py-24 md:py-32">
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
                  {!isLoading && user ? <Button size="lg" onClick={handleDashboardClick} className="bg-brand-green hover:bg-brand-deep-green text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                      Access Your Dashboard
                    </Button> : <>
                      <Button size="lg" onClick={handleSignUpClick} className="bg-brand-green hover:bg-brand-deep-green text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                        Book a Live Demo
                      </Button>
                      <button onClick={() => document.getElementById('pricing')?.scrollIntoView({
                    behavior: 'smooth'
                  })} className="text-brand-green hover:text-brand-deep-green text-lg font-semibold underline decoration-2 underline-offset-4 transition-colors duration-300">
                        See Enterprise Pricing
                      </button>
                    </>}
                </div>
              </div>
              
              {/* Right Hero Image */}
              <div className="relative lg:order-2">
                <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-brand-green/10 to-brand-purple/10 p-8 flex items-center justify-center">
                  <img src="/lovable-uploads/3cab64ed-2b97-4974-9c76-8ae4f310234d.png" alt="Dr. Scale Logo - AI-powered sales automation platform" className="w-full max-w-md h-auto rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/20 to-transparent rounded-2xl"></div>
                  
                  {/* Floating Stats Cards */}
                  <div className="absolute -top-4 -left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-brand-green/20">
                    <div className="text-2xl font-bold text-brand-green">     300%</div>
                    <div className="text-sm text-muted-foreground">Close Rate Boost</div>
                  </div>
                  
                  <div className="absolute -bottom-4 -right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-brand-purple/20">
                    <div className="text-2xl font-bold text-brand-purple">    24/7</div>
                    <div className="text-sm text-muted-foreground">Always Available</div>
                  </div>
                </div>
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
          <div id="pricing" className="mt-32 max-w-2xl mx-auto text-center">
            <div className="bg-gradient-to-br from-brand-light-green to-brand-background rounded-2xl p-8 md:p-12 border border-brand-green/20">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-muted-foreground mb-8">Choose the plan that fits your scale</p>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-semibold mb-6">Pay-As-You-Go</h3>
                <ul className="space-y-4 text-muted-foreground text-left max-w-lg mx-auto">
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-brand-green to-brand-deep-green flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-lg leading-relaxed"><strong>Starting at $0.65 per connected minute</strong> – pay only for live talk time.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-brand-green to-brand-deep-green flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span className="leading-relaxed"><strong>No contracts, no long-term commitments.</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-brand-green to-brand-deep-green flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span className="leading-relaxed"><strong>Instant elasticity to match call volume spikes.</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-brand-green to-brand-deep-green flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span className="leading-relaxed">Ideal for <strong>fast-moving organizations that need to launch, learn, and scale without delay.</strong></span>
                  </li>
                </ul>
              </div>
              
              <Button size="lg" className="bg-brand-green hover:bg-brand-deep-green text-white w-full sm:w-auto">
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