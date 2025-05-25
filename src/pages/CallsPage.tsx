
import React from "react";
import { CallTable } from "@/components/calls/CallTable";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EnvWarning } from "@/components/common/EnvWarning";
import { CallData } from "../services/callService";

const CallsPage: React.FC = () => {
  const handleSelectCall = (call: CallData) => {
    console.log("Call selected at page level:", call.id);
  };

  return (
    <DashboardLayout>
      <EnvWarning />
      <div className="space-y-8 w-full max-w-none">
        {/* Header Section */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Call Management 📞
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            View, analyze, and manage all your AI call interactions in one place
          </p>
        </div>
        
        {/* Call Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
          <CallTable onSelectCall={handleSelectCall} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CallsPage;
