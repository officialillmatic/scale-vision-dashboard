
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallData } from "@/services/callService";
import { CallInfo } from "./CallInfo";
import { CallAnalysis } from "./CallAnalysis";
import { AudioPlayer } from "./AudioPlayer";
import { CallTranscript } from "./CallTranscript";
import { CallDataView } from "./CallData";
import { CallLogs } from "./CallLogs";

interface CallDetailsPanelProps {
  call: CallData;
  onClose: () => void;
}

export function CallDetailsPanel({ call, onClose }: CallDetailsPanelProps) {
  // Parse transcript from the call data if available
  const transcriptContent = call.transcript ? 
    parseTranscript(call.transcript) : 
    [];
  
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
            <AudioPlayer audioUrl={call.audio_url} duration={call.duration_sec} />
          )}
          
          {/* Tabs for Transcript, Data, and Logs */}
          <Tabs defaultValue="transcript">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transcript">Transcription</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="transcript" className="mt-4">
              <CallTranscript 
                transcript={transcriptContent} 
                timestamp={call.timestamp}
                isLoading={transcriptContent.length === 0}
              />
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

// Helper function to parse transcript text into structured format
function parseTranscript(transcriptText: string): { speaker: string; text: string }[] {
  try {
    // If it's already JSON, parse it directly
    if (transcriptText.trim().startsWith('[') || transcriptText.trim().startsWith('{')) {
      const parsed = JSON.parse(transcriptText);
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          speaker: item.speaker || "Unknown",
          text: item.text || ""
        }));
      }
    }
    
    // Basic parsing for format like "Speaker: Text\nSpeaker2: Text2"
    const lines = transcriptText.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const parts = line.split(':', 2);
      if (parts.length === 2) {
        return {
          speaker: parts[0].trim(),
          text: parts[1].trim()
        };
      }
      return {
        speaker: "Unknown",
        text: line.trim()
      };
    });
  } catch (error) {
    console.error("Error parsing transcript:", error);
    return [{
      speaker: "System",
      text: "Transcript format not recognized"
    }];
  }
}
