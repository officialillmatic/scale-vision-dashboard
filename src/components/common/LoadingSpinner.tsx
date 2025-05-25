
import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  className
}) => {
  const sizeClasses = {
    'sm': 'h-4 w-4 border-2',
    'md': 'h-8 w-8 border-2',
    'lg': 'h-12 w-12 border-3'
  };

  return (
    <div className="relative">
      <div 
        className={cn(
          "animate-spin rounded-full border-t-brand-green border-r-transparent border-b-brand-green border-l-transparent", 
          sizeClasses[size],
          className
        )}
      />
      <div 
        className={cn(
          "absolute top-0 left-0 animate-spin rounded-full border-t-transparent border-r-brand-green/30 border-b-transparent border-l-brand-green/30", 
          sizeClasses[size],
          "animation-delay-75"
        )}
      />
    </div>
  );
};
