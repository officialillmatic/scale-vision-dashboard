
import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";

interface ProductionDashboardLayoutProps {
  children: React.ReactNode;
}

export const ProductionDashboardLayout: React.FC<ProductionDashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-72">
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
