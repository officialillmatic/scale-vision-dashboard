
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyStateMessageProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

export function EmptyStateMessage({ 
  title, 
  description, 
  actionLabel, 
  onAction, 
  isLoading 
}: EmptyStateMessageProps) {
  return (
    <Card className="border-dashed border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 bg-gradient-to-br from-gray-50/50 to-white">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="relative mb-6">
          <div className="p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm">
            <Sparkles className="h-8 w-8 text-gray-500" />
          </div>
          {isLoading && (
            <div className="absolute -top-1 -right-1">
              <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
            </div>
          )}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 mb-8 max-w-md leading-relaxed font-medium">{description}</p>
        {actionLabel && onAction && (
          <Button 
            onClick={onAction} 
            disabled={isLoading}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-green to-brand-deep-green hover:from-brand-deep-green hover:to-brand-green transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
