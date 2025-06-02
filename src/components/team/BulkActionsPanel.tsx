
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Users, Zap, FileUp, Settings } from 'lucide-react';

export function BulkActionsPanel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const bulkActions = [
    {
      title: 'Import Users from CSV',
      description: 'Upload a CSV file to import multiple users at once',
      icon: FileUp,
      action: 'import'
    },
    {
      title: 'Bulk Role Assignment',
      description: 'Change roles for multiple users simultaneously',
      icon: Settings,
      action: 'roles'
    },
    {
      title: 'Bulk Agent Assignment',
      description: 'Assign agents to multiple users at once',
      icon: Users,
      action: 'agents'
    },
    {
      title: 'Department Transfer',
      description: 'Move multiple users to a different department',
      icon: Upload,
      action: 'departments'
    }
  ];

  const recentBulkActions = [
    {
      action: 'Import Users',
      count: 25,
      status: 'completed',
      timestamp: '2 hours ago'
    },
    {
      action: 'Role Update',
      count: 12,
      status: 'completed',
      timestamp: '1 day ago'
    },
    {
      action: 'Agent Assignment',
      count: 8,
      status: 'failed',
      timestamp: '2 days ago'
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bulk Actions</h2>
        <p className="text-gray-600">Perform actions on multiple users efficiently</p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {bulkActions.map((action, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <action.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Start Action
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CSV Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            CSV Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium">Upload CSV file</p>
              <p className="text-xs text-gray-500">Drag and drop or click to browse</p>
            </label>
          </div>
          
          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <Button size="sm">Process File</Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" size="sm">
              View Import Guide
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bulk Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentBulkActions.map((action, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={
                      action.status === 'completed' 
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {action.status}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{action.action}</p>
                    <p className="text-xs text-gray-600">{action.count} users affected</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{action.timestamp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
