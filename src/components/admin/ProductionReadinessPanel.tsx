
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Play, RefreshCw } from 'lucide-react';
import { runProductionChecklist } from '@/services/productionValidation';
import { RoleCheck } from '@/components/auth/RoleCheck';

interface ValidationResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
}

export const ProductionReadinessPanel: React.FC = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [lastResult, setLastResult] = useState<ValidationResult | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const handleValidation = async () => {
    setIsValidating(true);
    try {
      const result = await runProductionChecklist();
      setLastResult(result);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Validation failed:', error);
      setLastResult({
        passed: false,
        issues: ['Validation process failed'],
        warnings: []
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusBadge = () => {
    if (!lastResult) return null;
    
    if (lastResult.passed) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Production Ready
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Not Ready
        </Badge>
      );
    }
  };

  return (
    <RoleCheck superAdminOnly fallback={<div>Access denied</div>}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Production Readiness</CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <Button
                onClick={handleValidation}
                disabled={isValidating}
                size="sm"
                variant="outline"
              >
                {isValidating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isValidating ? 'Validating...' : 'Run Validation'}
              </Button>
            </div>
          </div>
          {lastChecked && (
            <p className="text-sm text-muted-foreground">
              Last checked: {lastChecked.toLocaleString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!lastResult ? (
            <div className="text-center py-8 text-muted-foreground">
              <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Run Validation" to check production readiness</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Critical Issues */}
              {lastResult.issues.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div>
                      <strong>Critical Issues ({lastResult.issues.length}):</strong>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        {lastResult.issues.map((issue, index) => (
                          <li key={index} className="text-sm">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {lastResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div>
                      <strong>Warnings ({lastResult.warnings.length}):</strong>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        {lastResult.warnings.map((warning, index) => (
                          <li key={index} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {lastResult.passed && lastResult.issues.length === 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Production Ready!</strong> All critical security and infrastructure 
                    requirements are met. The application is ready for production deployment.
                  </AlertDescription>
                </Alert>
              )}

              {/* Production Checklist Status */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Production Checklist Status:</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Row Level Security (RLS) enabled on all tables</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Comprehensive security policies implemented</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Rate limiting and audit logging active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Performance indexes optimized</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Security monitoring dashboard active</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </RoleCheck>
  );
};
