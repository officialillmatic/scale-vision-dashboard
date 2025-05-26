
import { EmptyStateMessage } from "@/components/dashboard/EmptyStateMessage";
import { CallData } from "@/services/callService";

interface CallTableEmptyStateProps {
  canViewCalls: boolean;
  canUploadCalls: boolean;
  isLoading: boolean;
  calls: CallData[];
  error: Error | null;
  isSyncing: boolean;
  handleSync: () => void;
}

export function CallTableEmptyState({
  canViewCalls,
  canUploadCalls,
  isLoading,
  calls,
  error,
  isSyncing,
  handleSync
}: CallTableEmptyStateProps) {
  if (!canViewCalls || isLoading || calls.length > 0 || error) {
    return null;
  }

  return (
    <EmptyStateMessage
      title="No calls found"
      description={canUploadCalls ? "Start by syncing your calls or making your first AI call to see data here." : "No calls have been made yet."}
      actionLabel={canUploadCalls && !isSyncing ? "Sync Calls" : undefined}
      onAction={canUploadCalls ? handleSync : undefined}
      isLoading={isSyncing}
    />
  );
}
