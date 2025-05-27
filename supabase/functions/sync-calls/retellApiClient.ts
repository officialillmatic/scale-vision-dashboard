
// Retell API client for fetching calls data

export interface RetellCallsResponse {
  calls: any[];
  has_more: boolean;
  next_page_token?: string;
}

export class RetellApiClient {
  constructor(
    private apiKey: string,
    private baseUrl: string
  ) {}

  async testConnectivity(requestId: string): Promise<RetellCallsResponse> {
    console.log(`[SYNC-CALLS-${requestId}] Test mode - checking Retell API connectivity`);
    
    const response = await fetch(`${this.baseUrl}/list-calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ limit: 1 })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SYNC-CALLS-${requestId}] Test failed: ${response.status} - ${errorText}`);
      throw new Error(`Retell API responded with ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  async fetchCalls(
    agentId: string,
    batchSize: number,
    pageToken?: string
  ): Promise<RetellCallsResponse> {
    const requestBody: any = {
      agent_id: agentId,
      limit: batchSize
    };

    if (pageToken) {
      requestBody.page_token = pageToken;
    }

    const response = await fetch(`${this.baseUrl}/list-calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Retell API error for agent ${agentId}: ${response.status} - ${errorText}`);
      throw new Error(`Retell API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }
}
