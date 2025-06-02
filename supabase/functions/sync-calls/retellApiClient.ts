
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
    console.log(`[SYNC-CALLS-${requestId}] Using API URL: ${this.baseUrl}/list-calls`);
    console.log(`[SYNC-CALLS-${requestId}] API Key format: ${this.apiKey.substring(0, 10)}...`);
    
    const requestBody = { limit: 1 };
    console.log(`[SYNC-CALLS-${requestId}] Test request body:`, JSON.stringify(requestBody));

    try {
      const response = await fetch(`${this.baseUrl}/list-calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`[SYNC-CALLS-${requestId}] Test API response status: ${response.status}`);
      console.log(`[SYNC-CALLS-${requestId}] Test API response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SYNC-CALLS-${requestId}] Test failed: ${response.status} - ${errorText}`);
        throw new Error(`Retell API responded with ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`[SYNC-CALLS-${requestId}] Test successful - API response data:`, JSON.stringify(data, null, 2));
      console.log(`[SYNC-CALLS-${requestId}] Test found ${data.calls?.length || 0} calls`);
      return data;
    } catch (error) {
      console.error(`[SYNC-CALLS-${requestId}] Test connectivity error:`, error);
      throw error;
    }
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

    console.log(`[RETELL_API_CLIENT] Fetching calls with params:`, JSON.stringify(requestBody));
    console.log(`[RETELL_API_CLIENT] API URL: ${this.baseUrl}/list-calls`);

    try {
      const response = await fetch(`${this.baseUrl}/list-calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`[RETELL_API_CLIENT] API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[RETELL_API_CLIENT] API error: ${response.status} - ${errorText}`);
        throw new Error(`Retell API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[RETELL_API_CLIENT] Fetched ${data.calls?.length || 0} calls, has_more: ${data.has_more}`);
      console.log(`[RETELL_API_CLIENT] API response sample:`, JSON.stringify(data.calls?.slice(0, 1) || [], null, 2));
      
      return data;
    } catch (error) {
      console.error(`[RETELL_API_CLIENT] Fetch calls error:`, error);
      throw error;
    }
  }

  async fetchCallDetails(callId: string): Promise<any> {
    console.log(`[RETELL_API_CLIENT] Fetching call details for: ${callId}`);

    try {
      const response = await fetch(`${this.baseUrl}/get-call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ call_id: callId })
      });

      console.log(`[RETELL_API_CLIENT] Call details response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[RETELL_API_CLIENT] Failed to fetch call details: ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch call details: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[RETELL_API_CLIENT] Call details fetched for ${callId}`);
      return data.call;
    } catch (error) {
      console.error(`[RETELL_API_CLIENT] Call details error:`, error);
      throw error;
    }
  }
}
