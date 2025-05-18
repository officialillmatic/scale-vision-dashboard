
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface CallTranscriptProps {
  transcript: { speaker: string; text: string }[];
  timestamp: Date;
}

export function CallTranscript({ transcript, timestamp }: CallTranscriptProps) {
  return (
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
                {format(new Date(timestamp.getTime() + index * 60000), "h:mm a")}
              </span>
            </div>
            <p className="text-sm">{line.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
