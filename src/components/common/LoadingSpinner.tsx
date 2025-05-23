
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
    'lg': 'h-12 w-12 border-2'
  };

  return (
    <div 
      className={cn(
        "animate-spin rounded-full border-t-2 border-b-2 border-brand-purple", 
        sizeClasses[size],
        className
      )}
    />
  );
};
