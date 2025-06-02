
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

    const data = await response.json();
    console.log(`[SYNC-CALLS-${requestId}] Test successful - found ${data.calls?.length || 0} calls`);
    return data;
  }

  async fetchCalls(
    agentId?: string,
    batchSize: number = 50,
    pageToken?: string
  ): Promise<RetellCallsResponse> {
    const requestBody: any = {
      limit: batchSize
    };

    if (agentId) {
      requestBody.agent_id = agentId;
    }

    if (pageToken) {
      requestBody.page_token = pageToken;
    }

    console.log(`[RETELL_API_CLIENT] Fetching calls with params:`, requestBody);

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
      console.error(`[RETELL_API_CLIENT] API error: ${response.status} - ${errorText}`);
      throw new Error(`Retell API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[RETELL_API_CLIENT] Fetched ${data.calls?.length || 0} calls, has_more: ${data.has_more}`);
    
    return data;
  }

  async fetchCallDetails(callId: string): Promise<any> {
    console.log(`[RETELL_API_CLIENT] Fetching call details for: ${callId}`);

    const response = await fetch(`${this.baseUrl}/get-call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ call_id: callId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RETELL_API_CLIENT] Failed to fetch call details: ${response.status} - ${errorText}`);
      throw new Error(`Failed to fetch call details: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[RETELL_API_CLIENT] Call details fetched for ${callId}`);
    return data.call;
  }
}
