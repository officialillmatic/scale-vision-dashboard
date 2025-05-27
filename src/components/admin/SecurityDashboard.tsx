
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSecurityMonitor } from "@/hooks/useSecurityMonitor";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Shield, AlertTriangle, CheckCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function SecurityDashboard() {
  const { isSuperAdmin } = useSuperAdmin();
  const {
    alerts,
    isMonitoring,
    validateSystemSecurity,
    clearAlerts
  } = useSecurityMonitor();
  
  const [securityChecks, setSecurityChecks] = useState<string[]>([]);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runSecurityValidation = async () => {
    if (!isSuperAdmin) {
      toast.error("Super admin access required");
      return;
    }

    setIsRunningCheck(true);
    try {
      const results = await validateSystemSecurity();
      setSecurityChecks(results);
      toast.success("Security validation completed");
    } catch (error) {
      console.error("Security validation failed:", error);
      toast.error("Security validation failed");
    } finally {
      setIsRunningCheck(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      runSecurityValidation();
    }
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Super admin access required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Security Status</CardTitle>
            <div className="flex items-center gap-2">
              {isMonitoring ? (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Monitoring Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Monitoring Inactive
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Security Alerts</span>
                <Badge variant="outline">
                  {alerts.length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Rate Limiting</span>
                <Badge variant="outline" className="text-green-600">
                  Active
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">RLS Policies</span>
                <Badge variant="outline" className="text-green-600">
                  Enforced
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Security Validation</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={runSecurityValidation}
              disabled={isRunningCheck}
            >
              {isRunningCheck ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Last Check</span>
                <span className="text-xs text-muted-foreground">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Security Checks</span>
                <Badge variant="outline">
                  {securityChecks.length} items
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full"
              >
                {showDetails ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Details
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showDetails && securityChecks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Security Check Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {securityChecks.map((check, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {check}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {alerts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Security Alerts</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAlerts}
            >
              Clear All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50"
                >
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {alert.type}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          alert.severity === 'critical' ? 'text-red-600' :
                          alert.severity === 'high' ? 'text-orange-600' :
                          alert.severity === 'medium' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`}
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-yellow-800 mt-1">{alert.message}</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
