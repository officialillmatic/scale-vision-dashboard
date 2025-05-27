
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TestTube, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const QuickTestPanel: React.FC = () => {
  return (
    <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <TestTube className="h-5 w-5" />
          No Call Data Yet?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-blue-800 text-sm">
          Your dashboard is ready! Generate some test calls to see your analytics in action.
        </p>
        
        <div className="flex gap-3">
          <Link to="/test-data">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Generate Test Data
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
        
        <div className="text-xs text-blue-600">
          <p>✓ Creates realistic call data with costs and outcomes</p>
          <p>✓ Safe to clear anytime - won't affect real data</p>
        </div>
      </CardContent>
    </Card>
  );
};
