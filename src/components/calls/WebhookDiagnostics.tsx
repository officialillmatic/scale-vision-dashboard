
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Globe, Settings } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

interface WebhookDiagnostic {
  name: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

export const WebhookDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<WebhookDiagnostic[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: WebhookDiagnostic[] = [];

    try {
      // 1. Verificar configuración de variables de entorno
      console.log("🔍 [WEBHOOK_DIAGNOSTICS] Checking environment configuration...");
      
      // 2. Verificar URL del webhook
      try {
        const { data: registerData, error: registerError } = await supabase.functions.invoke('register-retell-webhook', {
          body: { test: true },
          headers: { 'Content-Type': 'application/json' }
        });

        if (registerError) {
          results.push({
            name: "Webhook Registration",
            status: 'error',
            message: "Error registering webhook",
            details: registerError.message
          });
        } else {
          results.push({
            name: "Webhook Registration",
            status: 'success',
            message: "Webhook registration function accessible",
            details: registerData?.webhook_url || 'No URL returned'
          });
          setWebhookUrl(registerData?.webhook_url || '');
        }
      } catch (error: any) {
        results.push({
          name: "Webhook Registration",
          status: 'error',
          message: "Cannot access webhook registration function",
          details: error.message
        });
      }

      // 3. Verificar el edge function de webhook
      try {
        const testPayload = {
          event: "test",
          data: {
            call_id: "test-call-123",
            agent_id: "test-agent-123"
          }
        };

        const response = await fetch(`${SUPABASE_URL}/functions/v1/retell-webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(testPayload)
        });

        if (response.ok) {
          results.push({
            name: "Webhook Endpoint",
            status: 'success',
            message: "Webhook endpoint is accessible",
            details: `Status: ${response.status}`
          });
        } else {
          results.push({
            name: "Webhook Endpoint",
            status: 'error',
            message: "Webhook endpoint returned error",
            details: `Status: ${response.status} - ${await response.text()}`
          });
        }
      } catch (error: any) {
        results.push({
          name: "Webhook Endpoint",
          status: 'error',
          message: "Cannot reach webhook endpoint",
          details: error.message
        });
      }

      // 4. Verificar logs recientes de webhook
      try {
        const { data: webhookLogs, error: logsError } = await supabase
          .from('webhook_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (logsError) {
          results.push({
            name: "Webhook Logs",
            status: 'warning',
            message: "Cannot access webhook logs",
            details: logsError.message
          });
        } else {
          const retellLogs = webhookLogs?.filter(log => 
            log.event_type && 
            ['call_started', 'call_ended', 'call_analyzed'].includes(log.event_type)
          ) || [];

          results.push({
            name: "Webhook Logs",
            status: retellLogs.length > 0 ? 'success' : 'warning',
            message: `Found ${retellLogs.length} Retell webhook events`,
            details: `Total logs: ${webhookLogs?.length || 0}, Retell logs: ${retellLogs.length}`
          });
        }
      } catch (error: any) {
        results.push({
          name: "Webhook Logs",
          status: 'error',
          message: "Error checking webhook logs",
          details: error.message
        });
      }

      // 5. Verificar configuración de Retell
      try {
        const { data: configData, error: configError } = await supabase.functions.invoke('register-retell-webhook', {
          body: { check_config: true },
          headers: { 'Content-Type': 'application/json' }
        });

        if (configError) {
          results.push({
            name: "Retell Configuration",
            status: 'error',
            message: "Cannot check Retell configuration",
            details: configError.message
          });
        } else {
          results.push({
            name: "Retell Configuration",
            status: 'info',
            message: "Retell configuration check completed",
            details: JSON.stringify(configData, null, 2)
          });
        }
      } catch (error: any) {
        results.push({
          name: "Retell Configuration",
          status: 'warning',
          message: "Retell configuration check not available",
          details: error.message
        });
      }

      setDiagnostics(results);
      
    } catch (error: any) {
      console.error("[WEBHOOK_DIAGNOSTICS] Error running diagnostics:", error);
      toast.error(`Diagnostics failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const registerWebhook = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('register-retell-webhook', {
        body: {},
        headers: { 'Content-Type': 'application/json' }
      });

      if (error) {
        toast.error(`Webhook registration failed: ${error.message}`);
      } else {
        toast.success("Webhook registration completed");
        console.log("Webhook registration result:", data);
        // Re-run diagnostics after registration
        setTimeout(runDiagnostics, 2000);
      }
    } catch (error: any) {
      toast.error(`Registration error: ${error.message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'info': return <Globe className="w-4 h-4 text-blue-600" />;
      default: return <Settings className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900">
            Webhook Diagnostics
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runDiagnostics}
              disabled={isRunning}
              className="bg-white hover:bg-gray-50"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Run Diagnostics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={registerWebhook}
              className="bg-white hover:bg-gray-50"
            >
              Register Webhook
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {webhookUrl && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Webhook URL</h3>
            <code className="text-sm text-blue-800 break-all">{webhookUrl}</code>
          </div>
        )}

        {diagnostics.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>Click "Run Diagnostics" to check webhook configuration</p>
          </div>
        ) : (
          <div className="space-y-4">
            {diagnostics.map((diagnostic, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getStatusColor(diagnostic.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(diagnostic.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{diagnostic.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {diagnostic.status}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{diagnostic.message}</p>
                    {diagnostic.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                          Show details
                        </summary>
                        <pre className="mt-2 p-2 bg-white/50 rounded text-xs overflow-x-auto">
                          {diagnostic.details}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-medium text-yellow-900 mb-2">🔍 Debug Info</h3>
          <div className="text-sm text-yellow-800 space-y-1">
            <p><strong>Expected webhook URL:</strong> {`${SUPABASE_URL}/functions/v1/retell-webhook`}</p>
            <p><strong>Project ID:</strong> {SUPABASE_URL.replace('https://', '').split('.')[0]}</p>
            <p><strong>Retell needs to send webhooks to this URL for calls to appear</strong></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
