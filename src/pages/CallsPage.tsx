
import React from "react";
import { CallTable } from "@/components/calls/CallTable";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EnvWarning } from "@/components/common/EnvWarning";
import { CallData } from "../services/callService";

const CallsPage: React.FC = () => {
  // Define a dummy onSelectCall handler since we're attaching this functionality inside CallTable
  const handleSelectCall = (call: CallData) => {
    // This function is intentionally empty as the actual call selection logic
    // is handled inside the CallTable component's internal handler
    console.log("Call selected at page level:", call.id);
  };

  return (
    <DashboardLayout>
      <EnvWarning />
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-semibold mb-4">Calls</h1>
        <CallTable onSelectCall={handleSelectCall} />
      </div>
    </DashboardLayout>
  );
};

export default CallsPage;
