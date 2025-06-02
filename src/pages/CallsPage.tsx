
import React from "react";
import { WhiteLabelCallsTable } from "@/components/calls/WhiteLabelCallsTable";
import { ProductionDashboardLayout } from "@/components/dashboard/ProductionDashboardLayout";

const CallsPage: React.FC = () => {
  return (
    <ProductionDashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Communication Hub</h1>
          <p className="text-gray-600">Manage and analyze your communication interactions with advanced filtering and insights.</p>
        </div>
        
        <WhiteLabelCallsTable />
      </div>
    </ProductionDashboardLayout>
  );
};

export default CallsPage;
