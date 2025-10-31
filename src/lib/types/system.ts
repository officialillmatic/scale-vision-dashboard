
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'error';
  webhook_endpoint: 'active' | 'inactive';
  retell_integration: 'healthy' | 'error' | 'no_agents';
  retell_secret_configured: boolean;
  timestamp: string;
}
