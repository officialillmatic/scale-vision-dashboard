
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CallData } from "@/services/callService";

interface CallSummaryProps {
  call: CallData;
}

export function CallSummary({ call }: CallSummaryProps) {
  const hasSummary = !!call.call_summary;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Call Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {hasSummary ? (
          <div className="text-sm space-y-2">
            <p className="whitespace-pre-wrap">{call.call_summary}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              No summary is available for this call yet.
            </p>
            <div className="bg-muted rounded p-3">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
