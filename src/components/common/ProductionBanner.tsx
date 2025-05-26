
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle } from 'lucide-react';

export const ProductionBanner: React.FC = () => {
  return (
    <Alert className="border-green-200 bg-green-50 mb-6">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <div className="flex items-center justify-between">
          <div>
            <strong>Production Ready!</strong> All security policies and infrastructure hardening are now active.
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            Security: Enhanced
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
