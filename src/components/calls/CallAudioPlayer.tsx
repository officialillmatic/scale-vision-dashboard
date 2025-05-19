
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface CallAudioPlayerProps {
  audioUrl: string;
  duration: number;
}

export function CallAudioPlayer({ audioUrl, duration }: CallAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    if (audioUrl) {
      setIsLoading(true);
      setHasError(false);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.addEventListener('loadeddata', () => {
        setIsLoading(false);
      });
      
      audio.addEventListener('error', (e) => {
        console.error("Audio error:", e);
        setIsLoading(false);
        setHasError(true);
        toast.error("Failed to load audio file");
      });
      
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
      
      return () => {
        audio.pause();
        audio.src = '';
        audioRef.current = null;
      };
    }
  }, [audioUrl]);

  const togglePlayback = () => {
    if (!audioRef.current || hasError) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .catch(e => {
            console.error("Error playing audio:", e);
            setHasError(true);
            toast.error("Failed to play audio");
          });
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
      setHasError(true);
      toast.error("Audio playback error");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4 justify-center">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlayback}
          disabled={isLoading || hasError}
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          ) : isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : hasError ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </Button>
        <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${hasError ? 'bg-red-500' : 'bg-brand-purple'} transition-all duration-300`}
            style={{ width: `${hasError ? 100 : progress}%`, opacity: hasError ? 0.5 : 1 }}
          ></div>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatTime(duration)}
        </span>
      </div>
      {hasError && (
        <p className="text-xs text-red-500 mt-2 text-center">
          Unable to play audio. The file may be unavailable or in an unsupported format.
        </p>
      )}
    </Card>
  );
}
