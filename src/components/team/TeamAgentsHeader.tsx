
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TeamAgentsHeaderProps {
  isSuperAdmin: boolean;
}

export function TeamAgentsHeader({ isSuperAdmin }: TeamAgentsHeaderProps) {
  return (
    <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
      <Info className="h-4 w-4" />
      <AlertDescription className="text-sm flex items-center gap-2">
        {isSuperAdmin && (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
            <Crown className="h-3 w-3" />
            SUPER ADMIN
          </Badge>
        )}
        {isSuperAdmin 
          ? 'As a super administrator, you have full access to create, manage, and assign AI agents across all companies on the platform.'
          : 'As an administrator, you can create and assign AI agents to users. These agents handle calls and interactions for your team.'
        }
      </AlertDescription>
    </Alert>
  );
}
