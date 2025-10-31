
import { format } from "date-fns";

interface TranscriptLine {
  speaker: string;
  text: string;
}

interface CallTranscriptProps {
  transcript: TranscriptLine[];
  timestamp: Date;
  isLoading?: boolean;
}

export function CallTranscript({ transcript, timestamp, isLoading = false }: CallTranscriptProps) {
  const formatTime = (date: Date) => {
    return format(date, "HH:mm:ss");
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4 rounded-md border">
        <div className="flex items-center space-x-2">
          <div className="h-5 w-20 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-5 w-24 bg-gray-100 animate-pulse rounded"></div>
        </div>
        <div className="h-4 w-3/4 bg-gray-100 animate-pulse rounded"></div>
        <div className="h-4 w-1/2 bg-gray-100 animate-pulse rounded"></div>
      </div>
    );
  }

  if (!transcript || transcript.length === 0) {
    return (
      <div className="p-4 text-center border rounded-md">
        <p className="text-gray-500">No transcript available for this call.</p>
        <p className="text-sm text-gray-400 mt-1">Transcripts are generated shortly after a call is completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-md">
      {transcript.map((line, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{line.speaker}</span>
            <span className="text-xs text-gray-500">
              {formatTime(new Date(timestamp.getTime() + index * 5000))}
            </span>
          </div>
          <p className="text-gray-700">{line.text}</p>
        </div>
      ))}
    </div>
  );
}
