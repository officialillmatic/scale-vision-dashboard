
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { generateTestCalls, clearTestCalls, testRetellSync } from '@/utils/testCallGenerator';
import { toast } from 'sonner';
import { 
  TestTube, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Database,
  Zap
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const TestDataGenerator: React.FC = () => {
  const { user, company } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [callCount, setCallCount] = useState(25);

  const handleGenerateTestCalls = async () => {
    if (!user || !company) {
      toast.error('User or company information missing');
      return;
    }

    setIsGenerating(true);
    try {
      await generateTestCalls({
        userId: user.id,
        companyId: company.id,
        count: callCount
      });
      
      toast.success(`Successfully generated ${callCount} test calls!`);
      
      // Refresh the page after a short delay to show new data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Failed to generate test calls:', error);
      toast.error(`Failed to generate test calls: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearTestCalls = async () => {
    setIsClearing(true);
    try {
      await clearTestCalls();
      toast.success('Successfully cleared all test calls!');
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Failed to clear test calls:', error);
      toast.error(`Failed to clear test calls: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleTestRetellSync = async () => {
    setIsTesting(true);
    try {
      await testRetellSync();
      toast.success('Retell API connection test successful!');
    } catch (error: any) {
      console.error('Retell sync test failed:', error);
      toast.error(`Retell sync test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (!user || !company) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="h-5 w-5" />
            <span>Please sign in to use test data generation</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Test Data Generator
        </CardTitle>
        <CardDescription>
          Generate sample call data to test your dashboard or sync with Retell AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Generate Mock Calls Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-600" />
            <h3 className="font-medium">Generate Mock Calls</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label htmlFor="callCount">Number of calls</Label>
                <Input
                  id="callCount"
                  type="number"
                  min="1"
                  max="100"
                  value={callCount}
                  onChange={(e) => setCallCount(parseInt(e.target.value) || 25)}
                  className="w-24"
                />
              </div>
              <Button
                onClick={handleGenerateTestCalls}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Generate Test Calls
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-sm text-gray-600">
              Creates realistic sample call data with various outcomes, timestamps, and costs. 
              If no agents exist, a test agent will be created automatically.
            </p>
          </div>
        </div>

        <Separator />

        {/* Retell Sync Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-600" />
            <h3 className="font-medium">Retell AI Integration</h3>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={handleTestRetellSync}
              disabled={isTesting}
              variant="outline"
              className="border-green-200 hover:bg-green-50"
            >
              {isTesting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Retell API Connection
                </>
              )}
            </Button>
            
            <p className="text-sm text-gray-600">
              Test your Retell AI integration and sync real call data
            </p>
          </div>
        </div>

        <Separator />

        {/* Clear Data Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-600" />
            <h3 className="font-medium text-red-700">Clear Test Data</h3>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={handleClearTestCalls}
              disabled={isClearing}
              variant="destructive"
              size="sm"
            >
              {isClearing ? (
                <>
                  <LoadingSpinner size="sm" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Test Calls
                </>
              )}
            </Button>
            
            <p className="text-sm text-gray-600">
              Remove all generated test calls (only affects calls with "test_call_" prefix)
            </p>
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-blue-900">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Test calls will appear in your dashboard immediately</li>
                <li>• Data includes realistic costs, durations, and outcomes</li>
                <li>• Charts and metrics will populate with the new data</li>
                <li>• You can generate more calls or clear them anytime</li>
                <li>• Test agents will be created automatically if needed</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
