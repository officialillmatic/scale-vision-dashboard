
import { CallStatus, CallDisposition, SentimentLevel } from '@/lib/types/call-enhanced';

export const formatCallDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};

export const formatCallCost = (cost: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(cost);
};

export const getCallStatusConfig = (status: CallStatus) => {
  const configs = {
    completed: { variant: 'default' as const, color: 'bg-green-100 text-green-800', label: 'Completed' },
    user_hangup: { variant: 'outline' as const, color: 'bg-yellow-100 text-yellow-800', label: 'User Hangup' },
    dial_no_answer: { variant: 'outline' as const, color: 'bg-red-100 text-red-800', label: 'No Answer' },
    voicemail: { variant: 'outline' as const, color: 'bg-blue-100 text-blue-800', label: 'Voicemail' },
    failed: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', label: 'Failed' },
    unknown: { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800', label: 'Unknown' }
  };
  
  return configs[status] || configs.unknown;
};

export const getSentimentConfig = (sentiment: string | null, score?: number | null) => {
  if (!sentiment && score === null) {
    return { variant: 'secondary' as const, label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  }
  
  const numericScore = score ?? (sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? 0.2 : 0.5);
  
  if (numericScore >= 0.7) {
    return { variant: 'default' as const, label: 'Positive', color: 'bg-green-100 text-green-800' };
  } else if (numericScore >= 0.3) {
    return { variant: 'outline' as const, label: 'Neutral', color: 'bg-yellow-100 text-yellow-800' };
  } else {
    return { variant: 'destructive' as const, label: 'Negative', color: 'bg-red-100 text-red-800' };
  }
};

export const getDispositionConfig = (disposition: string | null) => {
  if (!disposition) return { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' };
  
  const lowerDisposition = disposition.toLowerCase();
  
  if (['enrolled', 'completed', 'success'].includes(lowerDisposition)) {
    return { variant: 'default' as const, color: 'bg-green-100 text-green-800' };
  } else if (['no_answer', 'voicemail', 'busy'].includes(lowerDisposition)) {
    return { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' };
  } else if (['declined', 'failed', 'error'].includes(lowerDisposition)) {
    return { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' };
  } else {
    return { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' };
  }
};

export const parseTranscript = (transcriptText: string): { speaker: string; text: string }[] => {
  if (!transcriptText) return [];
  
  try {
    // Try parsing as JSON first
    if (transcriptText.trim().startsWith('[') || transcriptText.trim().startsWith('{')) {
      const parsed = JSON.parse(transcriptText);
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          speaker: item.speaker || "Unknown",
          text: item.text || ""
        }));
      }
    }
    
    // Parse as plain text format "Speaker: Text"
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
};
