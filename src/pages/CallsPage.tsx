import React from "react";
import { CallTable } from "@/components/calls/CallTable";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EnvWarning } from "@/components/common/EnvWarning";
import { CallData } from "../services/callService";

const CallsPage: React.FC = () => {
  return (
    <DashboardLayout>
      <EnvWarning />
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-semibold mb-4">Calls</h1>
        <CallTable />
      </div>
    </DashboardLayout>
  );
};

export default CallsPage;
