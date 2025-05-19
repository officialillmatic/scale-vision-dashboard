
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardLayoutProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

export function DashboardLayout({ children, isLoading = false }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="dashboard-container min-h-screen w-full bg-background">
        <DashboardHeader />
        <div className="flex w-full overflow-hidden">
          <DashboardSidebar />
          <main className="flex-1 overflow-hidden">
            <div className="h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar w-full px-4 md:px-6 lg:px-8 py-4 md:py-6">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4 max-w-md" />
                  <Skeleton className="h-4 w-1/2 max-w-sm" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
                    <Skeleton className="h-32 rounded-lg" />
                    <Skeleton className="h-32 rounded-lg" />
                    <Skeleton className="h-32 rounded-lg" />
                    <Skeleton className="h-32 rounded-lg" />
                  </div>
                  <Skeleton className="h-64 w-full rounded-lg" />
                </div>
              ) : (
                children
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
