
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CallAudioPlayerProps {
  audioUrl: string;
  duration: number;
}

export function CallAudioPlayer({ audioUrl, duration }: CallAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef] = useState<HTMLAudioElement | null>(audioUrl ? new Audio(audioUrl) : null);

  const togglePlayback = () => {
    if (!audioRef) return;

    if (isPlaying) {
      audioRef.pause();
    } else {
      audioRef.play().catch(e => console.error("Error playing audio:", e));
    }
    setIsPlaying(!isPlaying);
  };

  return (
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
          {Math.floor(duration / 60)}:{(duration % 60)
            .toString()
            .padStart(2, "0")}
        </span>
      </div>
      <audio 
        src={audioUrl} 
        className="hidden" 
        controls 
      />
    </Card>
  );
}
