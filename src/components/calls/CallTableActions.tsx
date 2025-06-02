
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Filter } from "lucide-react";

interface CallTableActionsProps {
  onRefresh: () => void;
  onExport?: () => void;
  onFilter?: () => void;
  isLoading?: boolean;
}

export function CallTableActions({ onRefresh, onExport, onFilter, isLoading }: CallTableActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="bg-white hover:bg-gray-50"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      
      {onFilter && (
        <Button 
          variant="outline"
          size="sm"
          onClick={onFilter}
          className="bg-white hover:bg-gray-50"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      )}
      
      {onExport && (
        <Button 
          variant="outline"
          size="sm"
          onClick={onExport}
          className="bg-white hover:bg-gray-50"
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      )}
    </div>
  );
}
