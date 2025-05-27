
export interface SyncResponse {
  synced_calls?: number;
  processed_calls?: number;
  skipped_agents?: number;
  agents_found?: number;
  message?: string;
}

export interface TestResponse {
  callsFound?: number;
  message?: string;
}

export interface WebhookResponse {
  message?: string;
}

export interface ApiError {
  message?: string;
}
