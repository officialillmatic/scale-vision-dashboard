
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="dashboard-container">
        <DashboardHeader />
        <div className="flex w-full">
          <DashboardSidebar />
          <main className="flex-1 overflow-hidden">
            <div className="container p-4 md:p-6 h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
