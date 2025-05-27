
export interface DatabaseTestResult {
  calls?: { count: number; error?: string };
  agents?: { count: number; error?: string };
  userAgents?: { count: number; error?: string };
  status: 'success' | 'error';
  error?: string;
}

export interface AgentTestResult {
  relationships?: any[];
  count: number;
  error?: string;
  status: 'success' | 'error';
}

export interface WebhookTestResult {
  response?: any;
  error?: string;
  status: 'success' | 'error';
}

export interface RetellTestResult {
  response?: any;
  error?: string;
  status: 'success' | 'error';
}

export interface DebugResults {
  timestamp: string;
  databaseTest?: DatabaseTestResult;
  agentTest?: AgentTestResult;
  webhookTest?: WebhookTestResult;
  retellTest?: RetellTestResult;
}
