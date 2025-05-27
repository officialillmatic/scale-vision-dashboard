
import React from "react";
import { Button } from "@/components/ui/button";
import { QuickTestPanel } from "./QuickTestPanel";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface EmptyStateMessageProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
  showTestPanel?: boolean;
}

export function EmptyStateMessage({ 
  title, 
  description, 
  actionLabel, 
  onAction, 
  isLoading = false,
  showTestPanel = true
}: EmptyStateMessageProps) {
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
        
        {actionLabel && onAction && (
          <Button 
            onClick={onAction} 
            disabled={isLoading}
            variant="outline"
            className="bg-white hover:bg-gray-50"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                Loading...
              </>
            ) : (
              actionLabel
            )}
          </Button>
        )}
      </div>
      
      {showTestPanel && <QuickTestPanel />}
    </div>
  );
}
