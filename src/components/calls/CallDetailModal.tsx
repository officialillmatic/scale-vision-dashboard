
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Clock,
  DollarSign,
  User,
  Calendar,
  Play,
  Pause,
  Volume2,
  Download,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wifi,
  MessageSquare,
  FileText,
  Activity,
  Info
} from "lucide-react";

interface Call {
  id: string;
  call_id: string;
  user_id: string;
  agent_id: string;
  company_id: string;
  timestamp: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  from_number: string;
  to_number: string;
  transcript?: string;
  call_summary?: string;
  sentiment?: string;
  recording_url?: string;
  disconnection_reason?: string;
  end_to_end_latency?: number;
  agent_name?: string;
  version?: string;
}

interface CallDetailModalProps {
  call: Call | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CallDetailModal: React.FC<CallDetailModalProps> = ({
  call,
  isOpen,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  if (!call) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'ended': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-700 border-green-200';
      case 'negative': return 'bg-red-100 text-red-700 border-red-200';
      case 'neutral': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleCopyTranscript = async () => {
    if (call.transcript) {
      await navigator.clipboard.writeText(call.transcript);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // Audio playback logic would go here
  };

  const maskPhoneNumber = (phone: string) => {
    if (!phone || phone === 'unknown') return 'Unknown';
    if (phone.length >= 10) {
      return `${phone.substring(0, 4)}****${phone.substring(phone.length - 3)}`;
    }
    return phone;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Call Details
          </DialogTitle>
          <div className="text-sm text-gray-600">
            Call ID: {call.call_id} • {formatDate(call.timestamp)}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Analysis
              </TabsTrigger>
              <TabsTrigger value="transcript" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transcript
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Audio
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Call Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Date & Time</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{formatDate(call.timestamp)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Duration</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{formatDuration(call.duration_sec)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Cost</span>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{formatCurrency(call.cost_usd)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">From</span>
                        <span className="font-medium">{maskPhoneNumber(call.from_number)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">To</span>
                        <span className="font-medium">{maskPhoneNumber(call.to_number)}</span>
                      </div>
                      {call.agent_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Agent</span>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{call.agent_name}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Call Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Call Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {call.call_summary ? (
                        <p className="text-gray-700 leading-relaxed">{call.call_summary}</p>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p>No summary available for this call</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Call Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Call Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status</span>
                        <Badge className={`flex items-center gap-1 ${getStatusColor(call.call_status)}`}>
                          {getStatusIcon(call.call_status)}
                          {call.call_status}
                        </Badge>
                      </div>
                      {call.sentiment && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Sentiment</span>
                          <Badge className={getSentimentColor(call.sentiment)}>
                            {call.sentiment}
                          </Badge>
                        </div>
                      )}
                      {call.disconnection_reason && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Disconnection</span>
                          <span className="font-medium text-red-600">{call.disconnection_reason}</span>
                        </div>
                      )}
                      {call.end_to_end_latency && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Latency</span>
                          <div className="flex items-center gap-1">
                            <Wifi className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{call.end_to_end_latency}ms</span>
                          </div>
                        </div>
                      )}
                      {call.version && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Version</span>
                          <span className="font-medium">{call.version}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Performance Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Performance Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center py-8 text-gray-500">
                        <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p>Performance metrics will be displayed here</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="transcript" className="mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Call Transcript
                      </CardTitle>
                      {call.transcript && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyTranscript}
                          className="flex items-center gap-1"
                        >
                          {isCopied ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          {isCopied ? 'Copied!' : 'Copy'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {call.transcript ? (
                      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                          {call.transcript}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-lg font-medium mb-2">No transcript available</p>
                        <p className="text-sm">The transcript for this call is not yet available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audio" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5" />
                      Audio Recording
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {call.recording_url ? (
                      <div className="space-y-6">
                        {/* Audio Player Controls */}
                        <div className="bg-gray-50 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePlayPause}
                                className="flex items-center gap-2"
                              >
                                {isPlaying ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                                {isPlaying ? 'Pause' : 'Play'}
                              </Button>
                              <div className="text-sm text-gray-600">
                                {formatTime(currentTime)} / {formatDuration(call.duration_sec)}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="flex items-center gap-2"
                            >
                              <a href={call.recording_url} download={`call-${call.call_id}.mp3`}>
                                <Download className="h-4 w-4" />
                                Download
                              </a>
                            </Button>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(currentTime / call.duration_sec) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Volume2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-lg font-medium mb-2">No audio recording available</p>
                        <p className="text-sm">The audio recording for this call is not available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
