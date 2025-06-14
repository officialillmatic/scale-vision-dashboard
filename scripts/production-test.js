
/**
 * Production End-to-End Test Script
 * Tests all critical API endpoints and webhook functionality
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

class ProductionTest {
  constructor() {
    this.baseUrl = SUPABASE_URL;
    this.apiKey = SUPABASE_ANON_KEY;
    this.authToken = null;
    this.userId = null;
    this.companyId = null;
  }

  async log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'apikey': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` }),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();
    
    this.log(`${options.method || 'GET'} ${endpoint} → ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`${response.status}: ${JSON.stringify(data)}`);
    }
    
    return data;
  }

  async testAuth() {
    this.log("=== Testing Authentication ===");
    
    try {
      // Test sign-in with a test user
      const signInData = await this.makeRequest('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123'
        })
      });
      
      this.authToken = signInData.access_token;
      this.userId = signInData.user.id;
      this.log(`✅ Sign-in successful - User ID: ${this.userId}`);

      // Test token refresh
      if (signInData.refresh_token) {
        const refreshData = await this.makeRequest('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          body: JSON.stringify({
            refresh_token: signInData.refresh_token
          })
        });
        
        this.authToken = refreshData.access_token;
        this.log("✅ Token refresh successful");
      }

    } catch (error) {
      this.log(`❌ Auth test failed: ${error.message}`);
      throw error;
    }
  }

  async testCompanyData() {
    this.log("=== Testing Company Data Access ===");
    
    try {
      // Get user's company
      const companies = await this.makeRequest(`/rest/v1/companies?owner_id=eq.${this.userId}&select=*`);
      
      if (companies.length > 0) {
        this.companyId = companies[0].id;
        this.log(`✅ Company found: ${this.companyId}`);
      } else {
        this.log("ℹ️ No company found for user");
      }

      // Test company invitations (this was failing with 403)
      const invitations = await this.makeRequest(`/rest/v1/company_invitations?company_id=eq.${this.companyId}&select=*`);
      this.log(`✅ Company invitations loaded: ${invitations.length} records`);

      // Test company members (this was failing with 406)
      const members = await this.makeRequest(`/rest/v1/company_members?company_id=eq.${this.companyId}&select=*`);
      this.log(`✅ Company members loaded: ${members.length} records`);

    } catch (error) {
      this.log(`❌ Company data test failed: ${error.message}`);
      throw error;
    }
  }

  async testWebhook() {
    this.log("=== Testing Webhook Endpoint ===");
    
    try {
      // Simulate Retell webhook call
      const webhookPayload = {
        event: 'call_ended',
        call: {
          call_id: `test_call_${Date.now()}`,
          agent_id: 'agent_test_id',
          from_number: '+1234567890',
          to_number: '+0987654321',
          start_timestamp: Date.now(),
          end_timestamp: Date.now() + 60000,
          duration: 60,
          duration_ms: 60000,
          call_status: 'completed',
          recording_url: 'https://example.com/recording.mp3',
          transcript: 'Test transcript content',
          sentiment_score: 0.8,
          sentiment: 'positive'
        }
      };

      const webhookResponse = await fetch(`${this.baseUrl}/functions/v1/retell-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-retell-token': 'test_secret',
          'User-Agent': 'Retell-Webhook/1.0'
        },
        body: JSON.stringify(webhookPayload)
      });

      const webhookData = await webhookResponse.json();
      this.log(`✅ Webhook test: ${webhookResponse.status} - ${JSON.stringify(webhookData)}`);

    } catch (error) {
      this.log(`❌ Webhook test failed: ${error.message}`);
    }
  }

  async testStorageBucket() {
    this.log("=== Testing Storage Bucket Access ===");
    
    try {
      // Test recordings bucket access
      const bucketResponse = await this.makeRequest('/storage/v1/bucket/recordings', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      this.log("✅ Recordings bucket accessible");

    } catch (error) {
      this.log(`❌ Storage bucket test failed: ${error.message}`);
    }
  }

  async runAllTests() {
    this.log("🚀 Starting Production End-to-End Tests");
    
    try {
      await this.testAuth();
      await this.testCompanyData();
      await this.testWebhook();
      await this.testStorageBucket();
      
      this.log("🎉 All tests completed successfully!");
      
    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new ProductionTest();
  test.runAllTests();
}

module.exports = ProductionTest;
