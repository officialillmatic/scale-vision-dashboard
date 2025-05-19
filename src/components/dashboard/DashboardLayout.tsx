
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="dashboard-container min-h-screen w-full">
        <DashboardHeader />
        <div className="flex w-full overflow-hidden">
          <DashboardSidebar />
          <main className="flex-1 overflow-hidden">
            <div className="h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar w-full px-4 md:px-6 lg:px-8 py-4 md:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
