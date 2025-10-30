
#!/bin/bash

# Webhook Authentication Test Script
# Tests the Retell webhook authentication with proper headers

SUPABASE_URL="https://jqkkhwoybcenxqpvodev.supabase.co"
RETELL_SECRET="your_retell_secret_here"  # This should be replaced with actual secret

echo "🔐 Testing Retell Webhook Authentication"
echo "========================================"

# Test 1: Health check
echo "🏥 Testing webhook-test health check..."
curl -s -w "\nStatus: %{http_code}\n" \
  -H "Accept: application/json" \
  "$SUPABASE_URL/functions/v1/webhook-test"

echo ""

# Test 2: Authentication test with proper headers
echo "🔑 Testing webhook authentication..."
curl -s -w "\nStatus: %{http_code}\n" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-retell-token: $RETELL_SECRET" \
  -H "User-Agent: Retell-Webhook-Test/1.0" \
  -d '{"action": "test_auth"}' \
  "$SUPABASE_URL/functions/v1/webhook-test"

echo ""

# Test 3: Missing authentication header
echo "❌ Testing missing authentication (should fail)..."
curl -s -w "\nStatus: %{http_code}\n" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "User-Agent: Retell-Webhook-Test/1.0" \
  -d '{"action": "test_auth"}' \
  "$SUPABASE_URL/functions/v1/webhook-test"

echo ""

# Test 4: Wrong authentication token
echo "🔒 Testing wrong authentication token (should fail)..."
curl -s -w "\nStatus: %{http_code}\n" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-retell-token: wrong_token" \
  -H "User-Agent: Retell-Webhook-Test/1.0" \
  -d '{"action": "test_auth"}' \
  "$SUPABASE_URL/functions/v1/webhook-test"

echo ""

# Test 5: Simulate actual webhook call
echo "📞 Testing simulated webhook call..."
curl -s -w "\nStatus: %{http_code}\n" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-retell-token: $RETELL_SECRET" \
  -H "User-Agent: Retell-Webhook/1.0" \
  -d '{
    "action": "simulate_webhook",
    "event": "call_ended",
    "agent_id": "test_agent_123"
  }' \
  "$SUPABASE_URL/functions/v1/webhook-test"

echo ""

# Test 6: Direct webhook endpoint test
echo "🎯 Testing direct webhook endpoint..."
curl -s -w "\nStatus: %{http_code}\n" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-retell-token: $RETELL_SECRET" \
  -H "User-Agent: Retell-Webhook/1.0" \
  -d '{
    "event": "call_ended",
    "call": {
      "call_id": "auth_test_123",
      "agent_id": "test_agent",
      "duration": 60,
      "call_status": "completed"
    }
  }' \
  "$SUPABASE_URL/functions/v1/retell-webhook"

echo ""
echo "✅ Authentication test script completed"
echo ""
echo "📋 Next Steps:"
echo "1. Replace 'your_retell_secret_here' with your actual RETELL_SECRET"
echo "2. Run this script to test webhook authentication"
echo "3. Check the Supabase function logs for detailed debug information"
echo "4. Verify that authentication passes with correct token and fails with wrong/missing token"

# Make script executable
chmod +x webhook-auth-test.sh
