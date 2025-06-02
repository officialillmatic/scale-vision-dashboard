
import { CallData } from '@/pages/AnalyticsPage';

// Generate mock call data for demonstration purposes
export function generateMockCallData(): CallData[] {
  const mockCalls: CallData[] = [];
  const currentDate = new Date();
  
  // Agent data
  const agents = [
    { id: 'agent-1', name: 'Solar Expert AI', rate_per_minute: 0.05 },
    { id: 'agent-2', name: 'Sales Assistant AI', rate_per_minute: 0.04 },
    { id: 'agent-3', name: 'Support Specialist AI', rate_per_minute: 0.03 },
    { id: 'agent-4', name: 'Lead Qualifier AI', rate_per_minute: 0.06 },
    { id: 'agent-5', name: 'Customer Care AI', rate_per_minute: 0.035 }
  ];

  const callStatuses = ['completed', 'failed', 'user_hangup', 'dial_no_answer', 'voicemail'];
  const sentiments = ['positive', 'neutral', 'negative'];
  const callTypes = ['inbound', 'outbound'];
  const dispositions = ['qualified', 'not_interested', 'callback', 'converted', 'info_request'];

  // Generate 150 calls over the last 30 days
  for (let i = 0; i < 150; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const minutesAgo = Math.floor(Math.random() * 60);
    
    const callDate = new Date(currentDate);
    callDate.setDate(callDate.getDate() - daysAgo);
    callDate.setHours(callDate.getHours() - hoursAgo);
    callDate.setMinutes(callDate.getMinutes() - minutesAgo);

    const agent = agents[Math.floor(Math.random() * agents.length)];
    const status = callStatuses[Math.floor(Math.random() * callStatuses.length)];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const callType = callTypes[Math.floor(Math.random() * callTypes.length)];
    const disposition = dispositions[Math.floor(Math.random() * dispositions.length)];
    
    // Duration varies by success - completed calls tend to be longer
    const baseDuration = status === 'completed' 
      ? Math.floor(Math.random() * 600) + 120  // 2-12 minutes
      : Math.floor(Math.random() * 180) + 30;  // 30 seconds - 3 minutes

    const duration = baseDuration;
    const cost = (duration / 60) * agent.rate_per_minute;

    const userId = `user-${Math.floor(Math.random() * 50) + 1}`;
    const phoneNumber = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;

    mockCalls.push({
      id: `mock-call-${i}`,
      call_id: `call_${Date.now()}_${i}`,
      timestamp: callDate,
      duration_sec: duration,
      cost_usd: parseFloat(cost.toFixed(4)),
      sentiment,
      sentiment_score: sentiment === 'positive' ? 0.8 + Math.random() * 0.2 :
                      sentiment === 'neutral' ? 0.4 + Math.random() * 0.2 :
                      Math.random() * 0.4,
      disconnection_reason: status === 'user_hangup' ? 'user_hangup' : 
                           status === 'failed' ? 'technical_issue' : null,
      call_status: status,
      from: callType === 'outbound' ? '+15551234567' : phoneNumber,
      to: callType === 'inbound' ? '+15551234567' : phoneNumber,
      from_number: callType === 'outbound' ? '+15551234567' : phoneNumber,
      to_number: callType === 'inbound' ? '+15551234567' : phoneNumber,
      audio_url: `https://example.com/audio/call_${i}.mp3`,
      recording_url: `https://example.com/recordings/call_${i}.wav`,
      transcript: `This is a sample transcript for call ${i}. The conversation covered ${disposition} topics.`,
      transcript_url: `https://example.com/transcripts/call_${i}.txt`,
      user_id: userId,
      company_id: 'demo-company-1',
      call_type: callType,
      latency_ms: Math.floor(Math.random() * 500) + 100,
      call_summary: `Call with ${disposition} outcome. Duration: ${Math.floor(duration/60)}m ${duration%60}s`,
      disposition,
      agent: {
        id: agent.id,
        name: agent.name,
        rate_per_minute: agent.rate_per_minute,
        retell_agent_id: `retell_${agent.id}`
      }
    });
  }

  return mockCalls.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function getQuickInsights(data: CallData[]) {
  if (!data.length) return [];

  // Calculate peak hours
  const hourlyDistribution = Array(24).fill(0);
  data.forEach(call => {
    const hour = new Date(call.timestamp).getHours();
    hourlyDistribution[hour]++;
  });
  const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));

  // Find best performing agent
  const agentStats = data.reduce((acc, call) => {
    const agentName = call.agent?.name || 'Unknown';
    if (!acc[agentName]) {
      acc[agentName] = { calls: 0, successful: 0 };
    }
    acc[agentName].calls++;
    if (call.call_status === 'completed') acc[agentName].successful++;
    return acc;
  }, {} as Record<string, any>);

  const bestAgent = Object.entries(agentStats)
    .map(([name, stats]: [string, any]) => ({
      name,
      successRate: stats.calls > 0 ? (stats.successful / stats.calls) * 100 : 0
    }))
    .sort((a, b) => b.successRate - a.successRate)[0];

  // Calculate average duration
  const totalDuration = data.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
  const avgDuration = data.length > 0 ? totalDuration / data.length : 0;

  // Calculate conversion metrics
  const convertedCalls = data.filter(call => call.disposition === 'converted').length;
  const conversionRate = data.length > 0 ? (convertedCalls / data.length) * 100 : 0;

  return [
    {
      icon: '⏰',
      title: 'Peak Hours',
      value: `${peakHour}:00 - ${peakHour + 1}:00`,
      description: 'Highest call volume period'
    },
    {
      icon: '🏆',
      title: 'Top Performer',
      value: bestAgent?.name || 'N/A',
      description: `${bestAgent?.successRate.toFixed(1)}% success rate`
    },
    {
      icon: '📞',
      title: 'Avg Call Duration',
      value: `${Math.floor(avgDuration / 60)}m ${Math.floor(avgDuration % 60)}s`,
      description: 'Average conversation length'
    },
    {
      icon: '💰',
      title: 'Conversion Rate',
      value: `${conversionRate.toFixed(1)}%`,
      description: 'Calls resulting in conversion'
    },
    {
      icon: '📈',
      title: 'Daily Growth',
      value: '+12.5%',
      description: 'Week-over-week improvement'
    },
    {
      icon: '🎯',
      title: 'Quality Score',
      value: '94.2%',
      description: 'Customer satisfaction rating'
    }
  ];
}
