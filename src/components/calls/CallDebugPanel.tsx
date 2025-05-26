
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug } from "lucide-react";
import { useDebugOperations } from "./debug/useDebugOperations";
import { DebugActions } from "./debug/DebugActions";
import { DebugResults } from "./debug/DebugResults";

export function CallDebugPanel() {
  const {
    isDebugging,
    isSetupRunning,
    results,
    runSetupTestData,
    runDebugTests
  } = useDebugOperations();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bug className="h-4 w-4" />
          Data Pipeline Debug
        </CardTitle>
        <DebugActions
          isSetupRunning={isSetupRunning}
          isDebugging={isDebugging}
          onRunSetup={runSetupTestData}
          onRunDebug={runDebugTests}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <DebugResults results={results} />
      </CardContent>
    </Card>
  );
}
