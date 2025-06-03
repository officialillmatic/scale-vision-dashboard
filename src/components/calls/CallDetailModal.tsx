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
  const [copied, setCopied] = useState(false);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!call) return null;

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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
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
                      <span className="text-sm">{formatDuration(call.duration_sec)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Cost:</span>
                      <span className="text-sm">{formatCurrency(call.cost_usd)}</span>
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
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Agent ID:</span>
                      <span className="text-sm">{call.agent_id}</span>
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
                        {formatDuration(call.duration_sec)}
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-green-800">Cost</div>
                      <div className="text-lg font-bold text-green-900">
                        {formatCurrency(call.cost_usd)}
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
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};