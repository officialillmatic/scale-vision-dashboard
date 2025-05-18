
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallData } from "@/services/callService";
import { CallInfo } from "./CallInfo";
import { CallAnalysis } from "./CallAnalysis";
import { CallAudioPlayer } from "./CallAudioPlayer";
import { CallTranscript } from "./CallTranscript";
import { CallDataView } from "./CallData";
import { CallLogs } from "./CallLogs";

interface CallDetailsPanelProps {
  call: CallData;
  onClose: () => void;
}

export function CallDetailsPanel({ call, onClose }: CallDetailsPanelProps) {
  // Mock transcript data - in a real app, this would come from the API
  const transcript = [
    { speaker: "Agent", text: "Hello, thank you for calling Mr Scale support. How may I assist you today?" },
    { speaker: "Customer", text: "Hi, I'm having trouble with setting up my account." },
    { speaker: "Agent", text: "I understand. Let me help you with that. Could you please provide me with your account email?" },
    { speaker: "Customer", text: "Sure, it's customer@example.com." },
    { speaker: "Agent", text: "Perfect, I've found your account. Let me guide you through the setup process step by step." },
  ];

  // Clean up audio on unmount
  const handleClose = () => {
    onClose();
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
          <CallInfo call={call} />
          
          {/* Call Analysis */}
          <CallAnalysis call={call} />
          
          {/* Audio Player (if available) */}
          {call.audio_url && (
            <CallAudioPlayer audioUrl={call.audio_url} duration={call.duration_sec} />
          )}
          
          {/* Tabs for Transcript, Data, and Logs */}
          <Tabs defaultValue="transcript">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transcript">Transcription</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="transcript" className="mt-4">
              <CallTranscript transcript={transcript} timestamp={call.timestamp} />
            </TabsContent>
            <TabsContent value="data" className="mt-4">
              <CallDataView call={call} />
            </TabsContent>
            <TabsContent value="logs" className="mt-4">
              <CallLogs call={call} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
