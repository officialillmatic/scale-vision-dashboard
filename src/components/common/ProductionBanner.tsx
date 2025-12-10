
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, Database, Zap, Lock } from 'lucide-react';

export const ProductionBanner: React.FC = () => {
  return (
    <Alert className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 mb-6 shadow-sm">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <strong>🎉 Production Ready!</strong> Your AI calling platform is now secured and optimized for production use.
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span>RLS Active</span>
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span>Storage Ready</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="h-4 w-4" />
              <span>Auth Secured</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span>Rate Limited</span>
            </div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
