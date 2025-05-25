
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface DashboardLayoutProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

export function DashboardLayout({ children, isLoading }: DashboardLayoutProps) {
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="pl-64">
        <DashboardHeader />
        <main className="flex-1 p-8 w-full">
          <div className="w-full max-w-none mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
