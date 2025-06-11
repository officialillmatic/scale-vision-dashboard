import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  Clock,
  DollarSign,
  User,
  Calendar,
  Copy,
  CheckCircle,
  MessageSquare,
  FileText,
  Activity,
  Info,
  Volume2,
  Play,
  Pause,
  Download
} from "lucide-react";
import { useAgents } from "@/hooks/useAgents"; // NUEVO IMPORT

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
  end_reason?: string;  // NUEVO CAMPO AGREGADO
  call_agent?: {
    id: string;
    name: string;
    rate_per_minute: number;
  };
  agents?: {
    id: string;
    name: string;
    rate_per_minute: number;
  };
}

interface CallDetailModalProps {
  call: Call | null;
  isOpen: boolean;
  onClose: () => void;
  audioDuration?: number;
}

// FUNCIÓN PARA CALCULAR COSTO CORRECTO (CORREGIDA para usar audioDuration)
const calculateCallCost = (call: Call, audioDurationParam?: number) => {
  const getCallDuration = (call: any) => {
    // PRIORIDAD 1: Usar audioDurationParam si se pasa
    if (audioDurationParam && audioDurationParam > 0) {
      return audioDurationParam;
    }
    
    const possibleFields = ['duration_sec', 'duration', 'call_duration', 'length', 'time_duration', 'total_duration'];
    for (const field of possibleFields) {
      if (call[field] && call[field] > 0) {
        return call[field];
      }
    }
    return 0;
  };

  const durationMinutes = getCallDuration(call) / 60;
  const agentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute || 0;
  
  console.log(`💰 Modal calculateCallCost: duration=${getCallDuration(call)}s, rate=$${agentRate}/min, result=$${(durationMinutes * agentRate).toFixed(2)}`);
  
  if (agentRate === 0) {
    console.warn(`Modal: No agent rate found for call ${call.call_id?.substring(0, 8)}, using original cost`);
    return call.cost_usd || 0;
  }
  
  return durationMinutes * agentRate;
};

export const CallDetailModal: React.FC<CallDetailModalProps> = ({
  call,
  isOpen,
  onClose,
  audioDuration,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // NUEVO: Usar el hook de agentes para obtener nombres
  const { getAgentName, getAgent } = useAgents();

  // Audio setup
  useEffect(() => {
    if (call?.recording_url) {
      const audio = new Audio(call.recording_url);
      setAudioElement(audio);

      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('ended', handleEnded);
        audio.pause();
      };
    }
  }, [call?.recording_url]);

  const togglePlayPause = () => {
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Helper function to get actual duration from call object or audio
  const getCallDuration = (call: any) => {
    // First try to get duration from passed audio duration
    if (audioDuration) {
      console.log(`🎵 Modal - Using passed audio duration: ${audioDuration}s`);
      return audioDuration;
    }
    
    // Try different possible duration fields from database
    const possibleFields = [
      'duration_sec',
      'duration', 
      'call_duration',
      'length',
      'time_duration',
      'total_duration'
    ];
    
    for (const field of possibleFields) {
      if (call[field] && call[field] > 0) {
        console.log(`🎵 Modal - Found non-zero duration in field '${field}':`, call[field]);
        return call[field];
      }
    }
    
    console.log("🎵 Modal - No duration found, using 0");
    return 0;
  };

  // Fixed duration formatting - same as in CallsSimple.tsx with debug
  const formatDuration = (seconds: number) => {
    // Handle null, undefined, or non-numeric values
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
      return "0:00";
    }
    
    // Convert to number if it's a string
    const numSeconds = Number(seconds);
    if (numSeconds === 0) {
      return "0:00";
    }
    
    const mins = Math.floor(numSeconds / 60);
    const secs = Math.floor(numSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio time formatting
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ended':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'negative':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'neutral':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };
  const getEndReasonColor = (endReason: string) => {
  if (!endReason) return 'bg-gray-100 text-gray-600 border-gray-200';
  
  switch (endReason.toLowerCase()) {
    case 'user hangup':
    case 'user_hangup':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'agent hangup':
    case 'agent_hangup':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'dial no answer':
    case 'dial_no_answer':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'voicemail_reached':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'error llm websocket open':
    case 'error_llm_websocket_open':
    case 'technical_error':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'call completed':
    case 'call_completed':
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!call) return null;

  // NUEVO: Obtener información del agente
  const agent = getAgent(call.agent_id);
  const agentName = getAgentName(call.agent_id);

  // Console log for debugging
  console.log("🎵 Call data in modal:", call);
  console.log("🎵 Recording URL:", call.recording_url);
  console.log("🎵 Duration sec:", call.duration_sec, typeof call.duration_sec);
  console.log("🎵 Raw call object keys:", Object.keys(call));
  console.log("💰 Modal cost calculation:", {
    original_cost: call.cost_usd,
    calculated_cost: calculateCallCost(call),
    agent_rate: call.call_agent?.rate_per_minute || call.agents?.rate_per_minute
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Call Details
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {formatDate(call.timestamp)} • {call.call_id}
          </p>
        </DialogHeader>

        <div className="overflow-y-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Date:</span>
                      <span className="text-sm">{formatDate(call.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Duration:</span>
                      <span className="text-sm font-bold text-blue-600">
                        {formatDuration(getCallDuration(call))}
                        {audioDuration && <span className="text-xs text-gray-500 ml-1">(from audio)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Cost:</span>
                      <span className="text-sm">{formatCurrency(calculateCallCost(call, audioDuration))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">End Reason:</span>
                      {call.end_reason ? (
                        <Badge className={getEndReasonColor(call.end_reason)} size="sm">
                          {call.end_reason.replace(/_/g, ' ')}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-500">Not specified</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">From:</span>
                      <span className="text-sm font-mono">{call.from_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">To:</span>
                      <span className="text-sm font-mono">{call.to_number}</span>
                    </div>
                    {/* CAMBIO PRINCIPAL: Mostrar nombre del agente en lugar del ID */}
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-500">Agent:</div>
                        <div className="text-sm font-medium text-gray-900">
                          {agentName}
                        </div>
                        {agent?.status && (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mr-2 ${
                            agent.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {agent.status}
                          </span>
                        )}
                        <div className="text-xs text-gray-500">
                          ID: {call.agent_id}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Call Summary */}
              {call.call_summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      Call Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {call.call_summary}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    Conversation Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Call Status</span>
                        </div>
                        <Badge className={getStatusColor(call.call_status)}>
                          {call.call_status}
                        </Badge>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">User Sentiment</span>
                        </div>
                        <Badge className={getSentimentColor(call.sentiment || 'neutral')}>
                          {call.sentiment || 'Neutral'}
                        </Badge>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium">End Reason</span>
                        </div>
                        {call.end_reason ? (
                          <Badge className={getEndReasonColor(call.end_reason)}>
                            {call.end_reason.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">Not specified</span>
                        )}
                      </div>

                      {/* NUEVO: Mostrar información del agente en Analysis */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium">Assigned Agent</span>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{agentName}</div>
                          {agent?.description && (
                            <div className="text-xs text-gray-500 mt-1">{agent.description}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Call ID</span>
                        </div>
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {call.call_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Clock className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-blue-800">Duration</div>
                      <div className="text-lg font-bold text-blue-900">
                        {formatDuration(getCallDuration(call))}
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-green-800">Cost</div>
                      <div className="text-lg font-bold text-green-900">
                        {formatCurrency(calculateCallCost(call, audioDuration))}
                      </div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Activity className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-purple-800">Status</div>
                      <div className="text-lg font-bold text-purple-900">
                        {call.call_status}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transcript" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Full Transcript
                  </CardTitle>
                  {call.transcript && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(call.transcript!)}
                      className="flex items-center gap-1"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {call.transcript ? (
                    <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                        {call.transcript}
                      </pre>
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

            <TabsContent value="audio" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-red-600" />
                    Audio Recording
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {call.recording_url ? (
                    <div className="space-y-4">
                      {/* Custom Audio Player Controls */}
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={togglePlayPause}
                          className="flex items-center gap-2"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          {isPlaying ? 'Pause' : 'Play'}
                        </Button>
                        
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm text-gray-600 min-w-12">
                            {formatTime(currentTime)}
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 min-w-12">
                            {formatTime(duration)}
                          </span>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={call.recording_url}
                            download={`call-${call.call_id}.mp3`}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      </div>

                      {/* Native Audio Element (visible for fallback) */}
                      <div className="border-t pt-4">
                        <p className="text-sm text-gray-600 mb-2">Native audio controls:</p>
                        <audio
                          src={call.recording_url}
                          className="w-full"
                          controls
                          preload="metadata"
                        />
                      </div>

                      {/* Debug info */}
                      <div className="text-xs text-gray-500 mt-2 p-2 bg-yellow-50 rounded">
                        <strong>Debug:</strong> Recording URL: {call.recording_url}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Volume2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">No audio recording available</p>
                      <p className="text-sm">This call does not have a recording URL</p>
                      
                      {/* Debug info when no recording */}
                      <div className="text-xs text-gray-400 mt-4 p-2 bg-gray-50 rounded">
                        <strong>Debug:</strong> recording_url field is {call.recording_url ? 'present but empty' : 'not present'}
                      </div>
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
};