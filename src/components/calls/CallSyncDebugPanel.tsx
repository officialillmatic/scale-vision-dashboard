
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bug, 
  Database, 
  Globe, 
  Server, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Trash2,
  AlertTriangle,
  Zap
} from "lucide-react";
import { useCallSyncDebug } from "@/hooks/useCallSyncDebug";
import { DirectSyncStatus } from "./DirectSyncStatus";
import { DirectSyncButton } from "./DirectSyncButton";

export function CallSyncDebugPanel() {
  const {
    loadingStates,
    isAnyTestRunning,
    debugResults,
    testDirectRetellAPI,
    testDatabaseInsertion,
    testEdgeFunction,
    testAPIConnectivity,
    clearResults
  } = useCallSyncDebug();

  const getResultIcon = (result: any) => {
    if (!result) return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    return result.success ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> : 
      <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getResultBadge = (result: any) => {
    if (!result) return <Badge variant="outline">Not Run</Badge>;
    return result.success ? 
      <Badge className="bg-green-100 text-green-800">Passed</Badge> : 
      <Badge className="bg-red-100 text-red-800">Failed</Badge>;
  };

  const handleButtonClick = (testFunction: (e?: React.MouseEvent) => Promise<void>) => {
    return (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      testFunction(e);
    };
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Bug className="h-5 w-5 text-purple-600" />
                Call Sync Debug Panel
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <DirectSyncButton />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearResults}
                className="text-gray-600"
                disabled={isAnyTestRunning}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear Results
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* New Direct Sync Status */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-600" />
              Production Sync Method
            </h3>
            <DirectSyncStatus />
          </div>

          <Separator className="my-6" />

          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bug className="h-5 w-5 text-purple-600" />
            Component Tests
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Test 1: Direct API Call */}
            <Card className="border border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-gray-900">Direct API Test</h3>
                  </div>
                  {getResultIcon(debugResults.directApiTest)}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Call Retell API directly from frontend ✅ Working
                </p>
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={handleButtonClick(testDirectRetellAPI)} 
                    disabled={isAnyTestRunning}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loadingStates.directApi ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Test API
                  </Button>
                  {getResultBadge(debugResults.directApiTest)}
                </div>
              </CardContent>
            </Card>

            {/* Test 2: Database Insertion */}
            <Card className="border border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-green-600" />
                    <h3 className="font-medium text-gray-900">Database Test</h3>
                  </div>
                  {getResultIcon(debugResults.dbTest)}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Insert test call record to database ✅ Working
                </p>
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={handleButtonClick(testDatabaseInsertion)} 
                    disabled={isAnyTestRunning}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loadingStates.database ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Test DB
                  </Button>
                  {getResultBadge(debugResults.dbTest)}
                </div>
              </CardContent>
            </Card>

            {/* Test 3: Edge Function */}
            <Card className="border border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-red-600" />
                    <h3 className="font-medium text-gray-900">Edge Function Test</h3>
                  </div>
                  {getResultIcon(debugResults.edgeFunctionTest)}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Test edge function sync ❌ Broken - bypassed
                </p>
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={handleButtonClick(testEdgeFunction)} 
                    disabled={isAnyTestRunning}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600"
                  >
                    {loadingStates.edgeFunction ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Test (Broken)
                  </Button>
                  {getResultBadge(debugResults.edgeFunctionTest)}
                </div>
              </CardContent>
            </Card>

            {/* Test 4: API Connectivity */}
            <Card className="border border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-red-600" />
                    <h3 className="font-medium text-gray-900">Edge API Test</h3>
                  </div>
                  {getResultIcon(debugResults.apiTest)}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Test API through edge function ❌ Broken - bypassed
                </p>
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={handleButtonClick(testAPIConnectivity)} 
                    disabled={isAnyTestRunning}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600"
                  >
                    {loadingStates.apiConnectivity ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Test (Broken)
                  </Button>
                  {getResultBadge(debugResults.apiTest)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Global Status */}
          {isAnyTestRunning && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Test in progress... Please wait for completion before running another test.</span>
              </div>
            </div>
          )}

          {/* Results Display */}
          {Object.keys(debugResults).length > 0 && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Debug Results</h3>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {Object.entries(debugResults).map(([testType, result]) => (
                      <Card key={testType} className={`border-l-4 ${result.success ? 'border-l-green-500' : 'border-l-red-500'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 capitalize">
                              {testType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </h4>
                            <div className="flex items-center gap-2">
                              {getResultIcon(result)}
                              <span className="text-xs text-gray-500">
                                {new Date(result.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          
                          {result.error && (
                            <div className="mb-2">
                              <p className="text-sm font-medium text-red-600">Error:</p>
                              <p className="text-sm text-red-700 bg-red-50 p-2 rounded">{result.error}</p>
                            </div>
                          )}
                          
                          {result.data && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Data:</p>
                              <pre className="text-xs text-gray-700 bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
