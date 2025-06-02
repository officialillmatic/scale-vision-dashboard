
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrentUserCalls } from '@/hooks/useCurrentUserCalls';
import { formatCurrency } from '@/lib/formatters';
import { Phone, Clock, User, Bot, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UnifiedRecentActivityFeed() {
  const { userCalls, isLoading } = useCurrentUserCalls();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Recent Call Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userCalls || userCalls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Recent Call Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No calls yet</h3>
            <p className="text-gray-600 mb-4">
              Once your assigned AI agents start handling calls, you'll see them here.
            </p>
            <Button variant="outline" onClick={() => navigate('/agents')}>
              View My Agents
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentCalls = userCalls.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Recent Call Activity ({userCalls.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/calls')}>
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentCalls.map((call) => (
            <div key={call.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {call.agent_details ? (
                    <Bot className="w-5 h-5 text-blue-600" />
                  ) : (
                    <User className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {call.from_number || 'Unknown'} → {call.to_number || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <span>{new Date(call.start_timestamp).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round((call.duration_sec || 0) / 60)}m
                    </span>
                    {call.agent_details && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          {call.agent_details.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  {formatCurrency(call.cost_usd || 0)}
                </div>
                <Badge 
                  variant={call.call_status === 'completed' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {call.call_status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
