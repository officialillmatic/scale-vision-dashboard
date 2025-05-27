
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ProductionDashboardHeader } from "@/components/dashboard/ProductionDashboardHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { SidebarProvider } from "@/components/ui/sidebar";

interface ProductionDashboardLayoutProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

export function ProductionDashboardLayout({ children, isLoading }: ProductionDashboardLayoutProps) {
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 text-sm font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <ProductionDashboardHeader />
          <main className="flex-1 p-6 overflow-auto">
            <div className="w-full max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
