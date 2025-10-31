
// This file now re-exports the AudioPlayer component
// This ensures backward compatibility with any other components that might be importing it
import { AudioPlayer } from "./AudioPlayer";

// Re-export the AudioPlayer component as CallAudioPlayer
export { AudioPlayer as CallAudioPlayer };

// Also export with a console log for debugging purposes
console.log("CallAudioPlayer: Using AudioPlayer implementation");
