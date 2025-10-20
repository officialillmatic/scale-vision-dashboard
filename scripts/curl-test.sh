
#!/bin/bash

# Production API Test Script
# Tests the three failing endpoints with proper headers

SUPABASE_URL="https://jqkkhwoybcenxqpvodev.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxa2tod295YmNlbnhxcHZvZGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDk4MzksImV4cCI6MjA2MzE4NTgzOX0._CudusgLYlJEv_AkJNGpjavmZNTqxXy4lvAv4laAGd8"
SUPER_ADMIN_UUID=${SUPER_ADMIN_UUID:-"replace-with-super-admin-uuid"}

echo "🔍 Testing Production API Endpoints"
echo "=================================="

# Test 1: Company Invitations (was returning 403)
echo "📧 Testing company invitations endpoint..."
curl -s -w "\nStatus: %{http_code}\n" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/company_invitations?select=*&company_id=eq.1cd546c3-07dc-4a85-9875-123456789012"

echo ""

# Test 2: Company Members (was returning 406)
echo "👥 Testing company members endpoint..."
curl -s -w "\nStatus: %{http_code}\n" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/company_members?select=*&user_id=eq.$SUPER_ADMIN_UUID"

echo ""

# Test 3: Token Refresh (was returning 400)
echo "🔄 Testing token refresh endpoint..."
curl -s -w "\nStatus: %{http_code}\n" \
  -X POST \
  -H "apikey: $ANON_KEY" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"test_token"}' \
  "$SUPABASE_URL/auth/v1/token?grant_type=refresh_token"

echo ""

# Test 4: Webhook endpoint
echo "🪝 Testing webhook endpoint..."
curl -s -w "\nStatus: %{http_code}\n" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-retell-token: test_secret" \
  -H "User-Agent: Retell-Webhook/1.0" \
  -d '{
    "event": "call_ended",
    "call": {
      "call_id": "test_call_123",
      "agent_id": "agent_test",
      "duration": 60,
      "call_status": "completed"
    }
  }' \
  "$SUPABASE_URL/functions/v1/retell-webhook"

echo ""
echo "✅ Test script completed"
