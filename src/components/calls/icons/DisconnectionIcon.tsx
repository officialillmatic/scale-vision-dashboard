
import React from "react";

interface DisconnectionIconProps {
  className?: string;
}

export function DisconnectionIcon({ className = "h-5 w-5 text-blue-500" }: DisconnectionIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
      <path d="M17 12H7" />
      <path d="M12 17V7" />
    </svg>
  );
}
