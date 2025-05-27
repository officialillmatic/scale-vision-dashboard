
import React from "react";
import { CallTable } from "@/components/calls/CallTable";
import { ProductionDashboardLayout } from "@/components/dashboard/ProductionDashboardLayout";
import { CallData } from "../services/callService";

const CallsPage: React.FC = () => {
  const handleSelectCall = (call: CallData) => {
    console.log("Call selected:", call.id);
  };

  return (
    <ProductionDashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Call Management</h1>
          <p className="text-gray-600">View and analyze your AI call interactions.</p>
        </div>
        
        <CallTable onSelectCall={handleSelectCall} />
      </div>
    </ProductionDashboardLayout>
  );
};

export default CallsPage;
