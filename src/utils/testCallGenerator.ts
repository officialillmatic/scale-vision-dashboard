
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MockCallParams {
  agentId: string;
  userId: string;
  companyId: string;
  count?: number;
}

export interface GeneratedCall {
  call_id: string;
  user_id: string;
  company_id: string;
  agent_id: string;
  timestamp: string;
  start_time: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  from_number: string;
  to_number: string;
  sentiment?: string;
  sentiment_score?: number;
  call_summary?: string;
  transcript?: string;
  recording_url?: string;
  call_type: string;
}

// Generate realistic phone numbers
function generatePhoneNumber(): string {
  const areaCode = Math.floor(Math.random() * 800) + 200;
  const exchange = Math.floor(Math.random() * 800) + 200;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${exchange}${number}`;
}

// Generate realistic call data
function generateMockCall(params: MockCallParams, index: number): GeneratedCall {
  const { agentId, userId, companyId } = params;
  
  // Generate timestamp within last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  const randomTime = new Date(
    thirtyDaysAgo.getTime() + 
    Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
  );
  
  // Generate realistic duration (30 seconds to 10 minutes)
  const durationSec = Math.floor(Math.random() * 570) + 30;
  
  // Calculate cost based on duration (assuming $0.02 per minute)
  const costUsd = Number((durationSec / 60 * 0.02).toFixed(4));
  
  // Random call outcomes
  const statuses = ['completed', 'user_hangup', 'failed', 'voicemail'];
  const weights = [0.7, 0.15, 0.10, 0.05]; // 70% completed, etc.
  
  let callStatus = 'completed';
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < statuses.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      callStatus = statuses[i];
      break;
    }
  }
  
  // Generate sentiment data
  const sentiments = ['positive', 'neutral', 'negative'];
  const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
  const sentimentScore = sentiment === 'positive' ? 
    Math.random() * 0.4 + 0.6 : // 0.6-1.0 
    sentiment === 'negative' ? 
    Math.random() * 0.4 : // 0.0-0.4
    Math.random() * 0.4 + 0.3; // 0.3-0.7
  
  // Sample call summaries
  const summaries = [
    "Customer inquired about product pricing and availability. Provided detailed information and scheduled follow-up.",
    "Lead qualification call. Customer showed strong interest in premium package. Next steps discussed.",
    "Support call regarding account setup. Issue resolved successfully. Customer satisfied.",
    "Sales follow-up call. Customer requested more time to consider proposal. Follow-up scheduled.",
    "Product demo call. Customer impressed with features. Moving to trial phase.",
    "Customer onboarding call. Walked through platform features. Training session scheduled.",
    "Billing inquiry call. Clarified charges and updated payment method. Issue resolved.",
    "Feature request call. Customer provided valuable feedback for product development.",
  ];
  
  const callId = `test_call_${Date.now()}_${index}`;
  
  return {
    call_id: callId,
    user_id: userId,
    company_id: companyId,
    agent_id: agentId,
    timestamp: randomTime.toISOString(),
    start_time: randomTime.toISOString(),
    duration_sec: durationSec,
    cost_usd: costUsd,
    call_status: callStatus,
    from_number: generatePhoneNumber(),
    to_number: generatePhoneNumber(),
    sentiment,
    sentiment_score: Number(sentimentScore.toFixed(2)),
    call_summary: summaries[Math.floor(Math.random() * summaries.length)],
    transcript: callStatus === 'completed' ? `Sample transcript for call ${callId}` : null,
    recording_url: callStatus === 'completed' ? `https://example.com/recordings/${callId}.mp3` : null,
    call_type: 'phone_call'
  };
}

export async function generateTestCalls(params: MockCallParams): Promise<boolean> {
  const { count = 20 } = params;
  
  try {
    console.log(`Generating ${count} test calls...`);
    
    const calls: GeneratedCall[] = [];
    for (let i = 0; i < count; i++) {
      calls.push(generateMockCall(params, i));
    }
    
    // Insert calls in batches to avoid timeout
    const batchSize = 10;
    let inserted = 0;
    
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('calls')
        .insert(batch);
      
      if (error) {
        console.error('Error inserting batch:', error);
        throw error;
      }
      
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${calls.length} calls`);
    }
    
    console.log(`Successfully generated ${inserted} test calls`);
    return true;
    
  } catch (error) {
    console.error('Error generating test calls:', error);
    throw error;
  }
}

export async function clearTestCalls(): Promise<boolean> {
  try {
    console.log('Clearing test calls...');
    
    const { error } = await supabase
      .from('calls')
      .delete()
      .like('call_id', 'test_call_%');
    
    if (error) {
      console.error('Error clearing test calls:', error);
      throw error;
    }
    
    console.log('Successfully cleared test calls');
    return true;
    
  } catch (error) {
    console.error('Error clearing test calls:', error);
    throw error;
  }
}

export async function testRetellSync(): Promise<boolean> {
  try {
    console.log('Testing Retell API sync...');
    
    const { data, error } = await supabase.functions.invoke('sync-calls', {
      body: { test: true }
    });
    
    if (error) {
      console.error('Retell sync test failed:', error);
      throw error;
    }
    
    console.log('Retell sync test result:', data);
    return true;
    
  } catch (error) {
    console.error('Error testing Retell sync:', error);
    throw error;
  }
}
