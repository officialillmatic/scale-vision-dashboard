import { debugLog } from "@/lib/debug";

// This file now re-exports the AudioPlayer component
// This ensures backward compatibility with any other components that might be importing it
import { AudioPlayer } from "./AudioPlayer";

// Re-export the AudioPlayer component as CallAudioPlayer
export { AudioPlayer as CallAudioPlayer };

// Also export with a console log for debugging purposes
debugLog("CallAudioPlayer: Using AudioPlayer implementation");
