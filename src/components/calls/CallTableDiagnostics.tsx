
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Settings, RefreshCw } from 'lucide-react';
import { useUserAgentManager } from '@/hooks/useUserAgentManager';
import { useAuth } from '@/contexts/AuthContext';

interface CallTableDiagnosticsProps {
  visible: boolean;
  onClose: () => void;
}

export function CallTableDiagnostics({ visible, onClose }: CallTableDiagnosticsProps) {
  const { user, company } = useAuth();
  const {
    autoMapOrphanedCalls,
    isAutoMapping,
    auditMappings,
    isAuditing
  } = useUserAgentManager();

  if (!visible) return null;

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Settings className="h-5 w-5" />
            Call Integration Diagnostics
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Status */}
        <div className="space-y-2">
          <h4 className="font-medium text-orange-800">System Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Retell API Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Database Accessible</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm">User Mappings Need Check</span>
            </div>
          </div>
        </div>

        {/* Current Session Info */}
        <div className="space-y-2">
          <h4 className="font-medium text-orange-800">Current Session</h4>
          <div className="bg-white p-3 rounded border space-y-1">
            <div className="flex justify-between text-sm">
              <span>User ID:</span>
              <Badge variant="outline">{user?.id ? `${user.id.slice(0, 8)}...` : 'Not loaded'}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Company ID:</span>
              <Badge variant="outline">{company?.id ? `${company.id.slice(0, 8)}...` : 'Not loaded'}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Company Name:</span>
              <Badge variant="outline">{company?.name || 'Not loaded'}</Badge>
            </div>
          </div>
        </div>

        {/* Diagnostic Actions */}
        <div className="space-y-2">
          <h4 className="font-medium text-orange-800">Diagnostic Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => auditMappings()}
              disabled={isAuditing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isAuditing ? "animate-spin" : ""}`} />
              {isAuditing ? "Auditing..." : "Audit User Mappings"}
            </Button>

            <Button
              onClick={() => autoMapOrphanedCalls()}
              disabled={isAutoMapping}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isAutoMapping ? "animate-spin" : ""}`} />
              {isAutoMapping ? "Mapping..." : "Auto-Map Agents"}
            </Button>
          </div>
        </div>

        {/* Common Issues */}
        <div className="space-y-2">
          <h4 className="font-medium text-orange-800">Common Issues & Solutions</h4>
          <div className="bg-white p-3 rounded border space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>No calls visible:</strong> Usually caused by missing user-agent mappings. 
                Click "Auto-Map Agents" to resolve.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Sync not working:</strong> Check if agents in Retell are properly linked to users. 
                Use "Audit User Mappings" to identify issues.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Webhook failures:</strong> Ensure RETELL_SECRET is properly configured in edge function settings.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
