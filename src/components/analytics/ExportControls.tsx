
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CallData } from '@/pages/AnalyticsPage';
import { Download, FileText, BarChart3 } from 'lucide-react';
import { formatCurrency, formatDuration, formatDate } from '@/lib/formatters';

interface ExportControlsProps {
  data: CallData[];
  dateRange: [Date | null, Date | null];
}

export function ExportControls({ data, dateRange }: ExportControlsProps) {
  const [exportFormat, setExportFormat] = React.useState<'csv' | 'json' | 'pdf'>('csv');
  const [exportType, setExportType] = React.useState<'calls' | 'summary' | 'agents'>('calls');

  const generateCSV = (data: any[], headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header] || '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');
    return csvContent;
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const [startDate, endDate] = dateRange;
    const dateRangeStr = startDate && endDate ? 
      `_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}` : 
      '_all_time';

    switch (exportType) {
      case 'calls':
        exportCallsData(timestamp, dateRangeStr);
        break;
      case 'summary':
        exportSummaryData(timestamp, dateRangeStr);
        break;
      case 'agents':
        exportAgentsData(timestamp, dateRangeStr);
        break;
    }
  };

  const exportCallsData = (timestamp: string, dateRangeStr: string) => {
    const headers = [
      'Call ID', 'Date', 'Time', 'Duration', 'Status', 'From', 'To', 
      'Agent', 'Cost', 'Sentiment', 'Disposition'
    ];

    const callsData = data.map(call => ({
      'Call ID': call.call_id,
      'Date': formatDate(call.timestamp).split(',')[0],
      'Time': formatDate(call.timestamp).split(',')[1],
      'Duration': formatDuration(call.duration_sec),
      'Status': call.call_status,
      'From': call.from,
      'To': call.to,
      'Agent': call.agent?.name || 'Unknown',
      'Cost': call.cost_usd?.toFixed(4) || '0.0000',
      'Sentiment': call.sentiment || 'Unknown',
      'Disposition': call.disposition || 'N/A'
    }));

    if (exportFormat === 'csv') {
      const csvContent = generateCSV(callsData, headers);
      downloadFile(csvContent, `call_details${dateRangeStr}_${timestamp}.csv`, 'text/csv');
    } else if (exportFormat === 'json') {
      const jsonContent = JSON.stringify(callsData, null, 2);
      downloadFile(jsonContent, `call_details${dateRangeStr}_${timestamp}.json`, 'application/json');
    }
  };

  const exportSummaryData = (timestamp: string, dateRangeStr: string) => {
    const totalCalls = data.length;
    const successfulCalls = data.filter(call => call.call_status === 'completed').length;
    const totalDuration = data.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
    const totalCost = data.reduce((sum, call) => sum + (call.cost_usd || 0), 0);

    const summaryData = {
      reportDate: new Date().toISOString(),
      dateRange: {
        start: dateRange[0]?.toISOString() || 'All time',
        end: dateRange[1]?.toISOString() || 'All time'
      },
      metrics: {
        totalCalls,
        successfulCalls,
        successRate: totalCalls > 0 ? (successfulCalls / totalCalls * 100).toFixed(2) + '%' : '0%',
        totalDuration: formatDuration(totalDuration),
        avgDuration: formatDuration(totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0),
        totalCost: formatCurrency(totalCost),
        avgCostPerCall: formatCurrency(totalCalls > 0 ? totalCost / totalCalls : 0)
      },
      callStatusBreakdown: data.reduce((acc, call) => {
        acc[call.call_status] = (acc[call.call_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    if (exportFormat === 'json') {
      const jsonContent = JSON.stringify(summaryData, null, 2);
      downloadFile(jsonContent, `call_summary${dateRangeStr}_${timestamp}.json`, 'application/json');
    } else if (exportFormat === 'csv') {
      const headers = ['Metric', 'Value'];
      const csvData = [
        { Metric: 'Total Calls', Value: summaryData.metrics.totalCalls },
        { Metric: 'Successful Calls', Value: summaryData.metrics.successfulCalls },
        { Metric: 'Success Rate', Value: summaryData.metrics.successRate },
        { Metric: 'Total Duration', Value: summaryData.metrics.totalDuration },
        { Metric: 'Avg Duration', Value: summaryData.metrics.avgDuration },
        { Metric: 'Total Cost', Value: summaryData.metrics.totalCost },
        { Metric: 'Avg Cost per Call', Value: summaryData.metrics.avgCostPerCall }
      ];
      const csvContent = generateCSV(csvData, headers);
      downloadFile(csvContent, `call_summary${dateRangeStr}_${timestamp}.csv`, 'text/csv');
    }
  };

  const exportAgentsData = (timestamp: string, dateRangeStr: string) => {
    const agentStats = data.reduce((acc, call) => {
      const agentName = call.agent?.name || 'Unknown';
      if (!acc[agentName]) {
        acc[agentName] = { 
          name: agentName, 
          totalCalls: 0, 
          successfulCalls: 0, 
          totalDuration: 0, 
          totalCost: 0 
        };
      }
      acc[agentName].totalCalls++;
      if (call.call_status === 'completed') acc[agentName].successfulCalls++;
      acc[agentName].totalDuration += call.duration_sec || 0;
      acc[agentName].totalCost += call.cost_usd || 0;
      return acc;
    }, {} as Record<string, any>);

    const agentsData = Object.values(agentStats).map((agent: any) => ({
      'Agent Name': agent.name,
      'Total Calls': agent.totalCalls,
      'Successful Calls': agent.successfulCalls,
      'Success Rate': agent.totalCalls > 0 ? ((agent.successfulCalls / agent.totalCalls) * 100).toFixed(1) + '%' : '0%',
      'Total Duration': formatDuration(agent.totalDuration),
      'Avg Duration': formatDuration(agent.totalCalls > 0 ? Math.round(agent.totalDuration / agent.totalCalls) : 0),
      'Total Revenue': formatCurrency(agent.totalCost),
      'Avg Revenue per Call': formatCurrency(agent.totalCalls > 0 ? agent.totalCost / agent.totalCalls : 0)
    }));

    const headers = [
      'Agent Name', 'Total Calls', 'Successful Calls', 'Success Rate', 
      'Total Duration', 'Avg Duration', 'Total Revenue', 'Avg Revenue per Call'
    ];

    if (exportFormat === 'csv') {
      const csvContent = generateCSV(agentsData, headers);
      downloadFile(csvContent, `agent_performance${dateRangeStr}_${timestamp}.csv`, 'text/csv');
    } else if (exportFormat === 'json') {
      const jsonContent = JSON.stringify(agentsData, null, 2);
      downloadFile(jsonContent, `agent_performance${dateRangeStr}_${timestamp}.json`, 'application/json');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Export Analytics</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Export Type</label>
            <Select value={exportType} onValueChange={(value: 'calls' | 'summary' | 'agents') => setExportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calls">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Call Details</span>
                  </div>
                </SelectItem>
                <SelectItem value="summary">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Summary Report</span>
                  </div>
                </SelectItem>
                <SelectItem value="agents">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Agent Performance</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Format</label>
            <Select value={exportFormat} onValueChange={(value: 'csv' | 'json' | 'pdf') => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                <SelectItem value="json">JSON Data</SelectItem>
                <SelectItem value="pdf" disabled>PDF Report (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={handleExport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <p className="font-medium">Export includes:</p>
            <p>{data.length} records</p>
            <p>
              {dateRange[0] && dateRange[1] ? 
                `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}` : 
                'All time data'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
