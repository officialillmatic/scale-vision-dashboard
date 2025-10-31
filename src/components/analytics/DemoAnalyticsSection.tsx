
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricsDashboard } from './MetricsDashboard';
import { AnalyticsCharts } from './AnalyticsCharts';
import { AgentAnalytics } from './AgentAnalytics';
import { UserAnalytics } from './UserAnalytics';
import { RevenueAnalytics } from './RevenueAnalytics';
import { generateMockCallData, getQuickInsights } from '@/services/mockData';
import { Lightbulb, TrendingUp, BarChart3, Users, Bot, DollarSign, Zap } from 'lucide-react';

export function DemoAnalyticsSection() {
  // Generate mock data for demonstration
  const mockData = generateMockCallData();
  const insights = getQuickInsights(mockData);

  return (
    <div className="space-y-8">
      {/* Demo Banner */}
      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <Zap className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Demo Mode: Business Intelligence Platform</h3>
              <p className="text-blue-700 mt-1">
                Experiencing our platform with sample data. Connect your real call data to see actual metrics and insights.
              </p>
            </div>
            <Badge className="ml-auto bg-blue-100 text-blue-800 border-blue-200">
              Demo Data Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Dashboard */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <TrendingUp className="h-6 w-6" />
            <span>Executive Dashboard</span>
          </h2>
          <p className="text-gray-600">Real-time KPIs and performance indicators for data-driven decisions</p>
        </div>
        <MetricsDashboard data={mockData} />
      </div>

      {/* Quick Insights */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Lightbulb className="h-6 w-6" />
            <span>AI-Powered Insights</span>
          </h2>
          <p className="text-gray-600">Automated analysis and actionable recommendations</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">{insight.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                    <p className="text-2xl font-bold text-blue-600 my-1">{insight.value}</p>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Enhanced Analytics Charts */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <BarChart3 className="h-6 w-6" />
            <span>Advanced Analytics</span>
          </h2>
          <p className="text-gray-600">Interactive charts and visualizations for deep business analysis</p>
        </div>
        <AnalyticsCharts data={mockData} />
      </div>

      {/* Feature Showcase Tabs */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span>Agent Intelligence</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Deep dive into AI agent performance, utilization rates, and optimization opportunities.</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Agents</span>
                <span className="font-semibold">5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Success Rate</span>
                <span className="font-semibold text-green-600">87.3%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Peak Utilization</span>
                <span className="font-semibold">94.2%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Customer behavior patterns, engagement metrics, and retention analysis.</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Users</span>
                <span className="font-semibold">47</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Session Time</span>
                <span className="font-semibold">4m 32s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Return Rate</span>
                <span className="font-semibold text-purple-600">68.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Revenue Intelligence</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Financial performance tracking, ROI analysis, and cost optimization insights.</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Monthly Revenue</span>
                <span className="font-semibold">$2,847.32</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cost per Call</span>
                <span className="font-semibold">$0.043</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>ROI Growth</span>
                <span className="font-semibold text-orange-600">+23.7%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Empty State Alternative */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300">
        <CardContent className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900">Ready for Your Real Data</h3>
            <p className="text-gray-600">
              This demo showcases what your analytics will look like with real call data. Connect your communication platform to unlock:
            </p>
            <div className="grid gap-2 text-left text-sm text-gray-700 mt-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Real-time call volume and performance metrics</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>AI-powered conversation insights and sentiment analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Automated reporting and trend forecasting</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Custom dashboards and business intelligence</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
