
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

  async fetchAllCalls(
    batchSize: number = 100,
    pageToken?: string
  ): Promise<RetellCallsResponse> {
    // Simplified request body - NO filters, fetch ALL calls
    const requestBody: any = {
      limit: batchSize
    };

    // Only add page token if provided
    if (pageToken) {
      requestBody.page_token = pageToken;
    }

    const apiUrl = `${this.baseUrl}/list-calls`;
    
    console.log(`[RETELL_API_CLIENT] === DETAILED API REQUEST DEBUG ===`);
    console.log(`[RETELL_API_CLIENT] Full API URL: ${apiUrl}`);
    console.log(`[RETELL_API_CLIENT] Request method: POST`);
    console.log(`[RETELL_API_CLIENT] Request headers:`, {
      'Authorization': `Bearer ${this.apiKey.substring(0, 15)}...`,
      'Content-Type': 'application/json'
    });
    console.log(`[RETELL_API_CLIENT] Request body (RAW):`, JSON.stringify(requestBody, null, 2));
    console.log(`[RETELL_API_CLIENT] === END REQUEST DEBUG ===`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`[RETELL_API_CLIENT] === DETAILED API RESPONSE DEBUG ===`);
      console.log(`[RETELL_API_CLIENT] Response status: ${response.status}`);
      console.log(`[RETELL_API_CLIENT] Response status text: ${response.statusText}`);
      console.log(`[RETELL_API_CLIENT] Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[RETELL_API_CLIENT] API error response body:`, errorText);
        console.error(`[RETELL_API_CLIENT] API error: ${response.status} - ${errorText}`);
        throw new Error(`Retell API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[RETELL_API_CLIENT] Raw API response (FULL):`, JSON.stringify(data, null, 2));
      console.log(`[RETELL_API_CLIENT] Calls count in response: ${data.calls?.length || 0}`);
      console.log(`[RETELL_API_CLIENT] Has more pages: ${data.has_more}`);
      console.log(`[RETELL_API_CLIENT] Next page token: ${data.next_page_token || 'none'}`);
      
      // Log first few calls if any exist
      if (data.calls && data.calls.length > 0) {
        console.log(`[RETELL_API_CLIENT] First call sample:`, JSON.stringify(data.calls[0], null, 2));
        if (data.calls.length > 1) {
          console.log(`[RETELL_API_CLIENT] Second call sample:`, JSON.stringify(data.calls[1], null, 2));
        }
      } else {
        console.log(`[RETELL_API_CLIENT] NO CALLS FOUND IN API RESPONSE!`);
      }
      console.log(`[RETELL_API_CLIENT] === END RESPONSE DEBUG ===`);
      
      return data;
    } catch (error) {
      console.error(`[RETELL_API_CLIENT] Fetch calls error:`, error);
      console.error(`[RETELL_API_CLIENT] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
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
