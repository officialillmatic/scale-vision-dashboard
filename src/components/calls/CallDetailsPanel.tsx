import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallData } from "@/services/callService";

interface CallDetailsPanelProps {
  call: CallData;
  onClose: () => void;
}

export function CallDetailsPanel({ call, onClose }: CallDetailsPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef] = useState<HTMLAudioElement | null>(call.audio_url ? new Audio(call.audio_url) : null);

  // Mock transcript data - in a real app, this would come from the API
  const transcript = [
    { speaker: "Agent", text: "Hello, thank you for calling Mr Scale support. How may I assist you today?" },
    { speaker: "Customer", text: "Hi, I'm having trouble with setting up my account." },
    { speaker: "Agent", text: "I understand. Let me help you with that. Could you please provide me with your account email?" },
    { speaker: "Customer", text: "Sure, it's customer@example.com." },
    { speaker: "Agent", text: "Perfect, I've found your account. Let me guide you through the setup process step by step." },
  ];

  const togglePlayback = () => {
    if (!audioRef) return;

    if (isPlaying) {
      audioRef.pause();
    } else {
      audioRef.play().catch(e => console.error("Error playing audio:", e));
    }
    setIsPlaying(!isPlaying);
  };

  // Clean up audio on unmount
  const handleClose = () => {
    if (audioRef && isPlaying) {
      audioRef.pause();
    }
    onClose();
  };

  const getStatusIcon = () => {
    if (call.call_status === "completed") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-green-500">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    }
  };

  const getSentimentIcon = () => {
    if (!call.sentiment) return null;
    
    if (call.sentiment === "positive") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-green-500">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      );
    } else if (call.sentiment === "negative") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-500">
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      );
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case "completed": return "Call Successful";
      case "user_hangup": return "User Hung Up";
      case "dial_no_answer": return "No Answer";
      case "voicemail": return "Voicemail Detected";
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }
  };

  return (
    <div className="animate-slide-in-right h-full flex flex-col bg-background border-l">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-medium">Call Details</h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
          <span className="sr-only">Close</span>
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="space-y-6">
          {/* Call Basic Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Call Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Time</span>
                <span>{format(call.timestamp, "MMM dd, yyyy HH:mm:ss")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign</span>
                <span>Sales Outreach</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">From → To</span>
                <span>{call.from} → {call.to}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span>{Math.floor(call.duration_sec / 60)}:{(call.duration_sec % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost</span>
                <span>${call.cost_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Call ID</span>
                <span>{call.call_id}</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Call Analysis */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Conversation Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span>Call Status</span>
                </div>
                <Badge className={call.call_status === "completed" ? "bg-green-500" : "bg-red-500"}>
                  {getStatusText(call.call_status)}
                </Badge>
              </div>
              
              {call.sentiment && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getSentimentIcon()}
                    <span>User Sentiment</span>
                  </div>
                  <Badge variant="outline">
                    {call.sentiment.charAt(0).toUpperCase() + call.sentiment.slice(1)}
                  </Badge>
                </div>
              )}
              
              {call.disconnection_reason && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-blue-500">
                      <path d="M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
                      <path d="M17 12H7" />
                      <path d="M12 17V7" />
                    </svg>
                    <span>Disconnection</span>
                  </div>
                  <Badge variant="outline">
                    {call.disconnection_reason}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Audio Player (if available) */}
          {call.audio_url && (
            <Card className="p-4">
              <div className="flex items-center gap-4 justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePlayback}
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  )}
                </Button>
                <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-brand-purple transition-all duration-300 ${
                      isPlaying ? "animate-pulse" : ""
                    }`}
                    style={{ width: "35%" }}
                  ></div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(call.duration_sec / 60)}:{(call.duration_sec % 60)
                    .toString()
                    .padStart(2, "0")}
                </span>
              </div>
              <audio 
                src={call.audio_url} 
                className="hidden" 
                controls 
              />
            </Card>
          )}
          
          {/* Tabs for Transcript, Data, and Logs */}
          <Tabs defaultValue="transcript">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transcript">Transcription</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="transcript" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Conversation</CardTitle>
                  <CardDescription>Full transcript of the call</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {transcript.map((line, index) => (
                    <div key={index} className="pb-4 border-b last:border-b-0">
                      <div className="font-medium text-sm mb-1">
                        {line.speaker}{" "}
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(call.timestamp.getTime() + index * 60000), "h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm">{line.text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="data" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Call Data</CardTitle>
                  <CardDescription>Raw metrics and data points</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap custom-scrollbar">
                    {JSON.stringify({
                      id: call.id,
                      call_id: call.call_id,
                      timestamp: call.timestamp.toISOString(),
                      duration_seconds: call.duration_sec,
                      cost_usd: call.cost_usd,
                      call_status: call.call_status,
                      sentiment: call.sentiment,
                      disconnection_reason: call.disconnection_reason,
                      from: call.from,
                      to: call.to,
                      audio_url: call.audio_url
                    }, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="logs" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">System Logs</CardTitle>
                  <CardDescription>Technical logs related to this call</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap custom-scrollbar h-[200px]">
                    {`
[${format(new Date(call.timestamp.getTime() - 60000), "yyyy-MM-dd HH:mm:ss")}] INFO: Call initiated from ${call.from}
[${format(new Date(call.timestamp.getTime() - 55000), "yyyy-MM-dd HH:mm:ss")}] INFO: Connecting to destination ${call.to}
[${format(new Date(call.timestamp.getTime() - 50000), "yyyy-MM-dd HH:mm:ss")}] INFO: Call established successfully
[${format(new Date(call.timestamp.getTime() - 40000), "yyyy-MM-dd HH:mm:ss")}] INFO: Recording started
[${format(new Date(call.timestamp.getTime() - 30000), "yyyy-MM-dd HH:mm:ss")}] INFO: Voice activity detected
[${format(new Date(call.timestamp.getTime() - 5000), "yyyy-MM-dd HH:mm:ss")}] INFO: Call ended with status: ${call.call_status}
[${format(new Date(call.timestamp.getTime()), "yyyy-MM-dd HH:mm:ss")}] INFO: Recording saved to storage
                    `}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
