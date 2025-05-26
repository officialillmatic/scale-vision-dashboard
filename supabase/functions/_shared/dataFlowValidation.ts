
import { createErrorResponse, createSuccessResponse } from './corsUtils.ts';

export async function validateDataFlow(supabaseClient: any) {
  try {
    console.log('[WEBHOOK-TEST] Validating data flow...');
    
    // Check recent calls and their data completeness
    const { data: recentCalls, error } = await supabaseClient
      .from('calls')
      .select(`
        call_id,
        timestamp,
        duration_sec,
        cost_usd,
        call_status,
        agent_id,
        user_id,
        company_id,
        recording_url,
        transcript,
        transcript_url,
        sentiment_score,
        from_number,
        to_number
      `)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) throw error;

    const dataQuality = {
      total_recent_calls: recentCalls.length,
      calls_with_recordings: recentCalls.filter(c => c.recording_url).length,
      calls_with_transcripts: recentCalls.filter(c => c.transcript).length,
      calls_with_transcript_urls: recentCalls.filter(c => c.transcript_url).length,
      calls_with_sentiment: recentCalls.filter(c => c.sentiment_score !== null).length,
      calls_with_agents: recentCalls.filter(c => c.agent_id).length,
      calls_with_phone_numbers: recentCalls.filter(c => c.from_number && c.to_number).length,
      average_cost: recentCalls.length > 0 ? 
        recentCalls.reduce((sum, c) => sum + (c.cost_usd || 0), 0) / recentCalls.length : 0,
      average_duration: recentCalls.length > 0 ? 
        recentCalls.reduce((sum, c) => sum + (c.duration_sec || 0), 0) / recentCalls.length : 0,
      data_completeness_score: recentCalls.length > 0 ? 
        recentCalls.reduce((sum, c) => {
          let score = 0;
          if (c.recording_url) score += 1;
          if (c.transcript) score += 1;
          if (c.sentiment_score !== null) score += 1;
          if (c.agent_id) score += 1;
          if (c.from_number && c.to_number) score += 1;
          return sum + (score / 5);
        }, 0) / recentCalls.length : 0
    };

    return createSuccessResponse(dataQuality);

  } catch (error) {
    return createErrorResponse(`Data flow validation failed: ${error.message}`, 500);
  }
}
