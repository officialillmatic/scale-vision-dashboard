
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
  AlertTriangle 
} from "lucide-react";
import { useCallSyncDebug } from "@/hooks/useCallSyncDebug";

export function CallSyncDebugPanel() {
  const {
    isDebugging,
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearResults}
              className="text-gray-600"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Results
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
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
                  Call Retell API directly from frontend to check raw response
                </p>
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={testDirectRetellAPI} 
                    disabled={isDebugging}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isDebugging ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
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
                  Insert a test call record to verify database works
                </p>
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={testDatabaseInsertion} 
                    disabled={isDebugging}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isDebugging ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Test DB
                  </Button>
                  {getResultBadge(debugResults.dbTest)}
                </div>
              </CardContent>
            </Card>

            {/* Test 3: Edge Function */}
            <Card className="border border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-purple-600" />
                    <h3 className="font-medium text-gray-900">Edge Function Test</h3>
                  </div>
                  {getResultIcon(debugResults.edgeFunctionTest)}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Test full sync with bypass validation enabled
                </p>
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={testEdgeFunction} 
                    disabled={isDebugging}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isDebugging ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Test Sync
                  </Button>
                  {getResultBadge(debugResults.edgeFunctionTest)}
                </div>
              </CardContent>
            </Card>

            {/* Test 4: API Connectivity */}
            <Card className="border border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-orange-600" />
                    <h3 className="font-medium text-gray-900">API Connectivity</h3>
                  </div>
                  {getResultIcon(debugResults.apiTest)}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Test API connection through edge function
                </p>
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={testAPIConnectivity} 
                    disabled={isDebugging}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isDebugging ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Test API
                  </Button>
                  {getResultBadge(debugResults.apiTest)}
                </div>
              </CardContent>
            </Card>
          </div>

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
