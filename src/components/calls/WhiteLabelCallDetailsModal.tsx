
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDuration } from "@/lib/formatters";
import { format } from "date-fns";
import { Phone, Clock, DollarSign, User, Bot, FileText, Headphones } from "lucide-react";

interface WhiteLabelCallDetailsModalProps {
  call: any;
  isOpen: boolean;
  onClose: () => void;
}

export function WhiteLabelCallDetailsModal({ call, isOpen, onClose }: WhiteLabelCallDetailsModalProps) {
  if (!call) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      in_progress: "bg-blue-100 text-blue-800",
      user_hangup: "bg-yellow-100 text-yellow-800",
      dial_no_answer: "bg-gray-100 text-gray-800",
      voicemail: "bg-purple-100 text-purple-800"
    };
    return colors[status] || colors.completed;
  };

  const formatTranscript = (transcript: string) => {
    if (!transcript) return [];
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(transcript);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [{ speaker: "System", text: transcript }];
    } catch {
      // Parse as simple text format
      const lines = transcript.split('\n').filter(line => line.trim());
      return lines.map(line => {
        const parts = line.split(':', 2);
        if (parts.length === 2) {
          return { speaker: parts[0].trim(), text: parts[1].trim() };
        }
        return { speaker: "Unknown", text: line.trim() };
      });
    }
  };

  const transcriptLines = formatTranscript(call.transcript || "");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Call Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Call Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>Call Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Call ID:</span>
                  <span className="font-mono text-sm">{call.call_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">From:</span>
                  <span className="font-mono">{call.from_number || call.from}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">To:</span>
                  <span className="font-mono">{call.to_number || call.to}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date/Time:</span>
                  <span>{format(new Date(call.timestamp), "MMM dd, yyyy HH:mm:ss")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={getStatusColor(call.call_status)}>
                    {call.call_status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{formatDuration(call.duration_sec || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost:</span>
                  <span className="font-medium">{formatCurrency(call.cost_usd || 0)}</span>
                </div>
                {call.latency_ms && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Latency:</span>
                    <span className="font-medium">{call.latency_ms}ms</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Agent:</span>
                  <div className="flex items-center space-x-1">
                    <Bot className="h-4 w-4 text-blue-500" />
                    <span>{call.agent?.name || "Unknown"}</span>
                  </div>
                </div>
                {call.sentiment && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sentiment:</span>
                    <Badge variant="outline" className={
                      call.sentiment === 'positive' ? 'border-green-200 text-green-700' :
                      call.sentiment === 'negative' ? 'border-red-200 text-red-700' :
                      'border-yellow-200 text-yellow-700'
                    }>
                      {call.sentiment}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Call Summary */}
          {call.call_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Call Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{call.call_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Tabs for Transcript and Audio */}
          <Tabs defaultValue="transcript" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transcript" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Transcript</span>
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center space-x-2">
                <Headphones className="h-4 w-4" />
                <span>Audio</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transcript" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Call Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  {transcriptLines.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {transcriptLines.map((line, index) => (
                        <div key={index} className="border-l-2 border-gray-200 pl-4 py-2">
                          <div className="flex items-center space-x-2 mb-1">
                            {line.speaker === 'agent' ? (
                              <Bot className="h-4 w-4 text-blue-500" />
                            ) : (
                              <User className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="font-medium text-sm text-gray-900">
                              {line.speaker === 'agent' ? 'AI Agent' : 'Customer'}
                            </span>
                          </div>
                          <p className="text-gray-700 ml-6">{line.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No transcript available for this call</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audio" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Call Recording</CardTitle>
                </CardHeader>
                <CardContent>
                  {call.recording_url || call.audio_url ? (
                    <div className="space-y-4">
                      <audio controls className="w-full">
                        <source src={call.recording_url || call.audio_url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                      <p className="text-sm text-gray-600">
                        Duration: {formatDuration(call.duration_sec || 0)}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Headphones className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No audio recording available for this call</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
