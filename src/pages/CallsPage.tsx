
import { useState } from "react";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import { CallStats } from "../components/calls/CallStats";
import { CallTable } from "../components/calls/CallTable";
import { CallDetailsPanel } from "../components/calls/CallDetailsPanel";

const CallsPage = () => {
  const [selectedCall, setSelectedCall] = useState(null);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Call Logs</h2>
            <p className="text-muted-foreground">
              View and manage your call history
            </p>
          </div>
        </div>
        
        <CallStats />
        
        <div className={`dashboard-layout ${selectedCall ? "" : "xl:grid-cols-1"}`}>
          <div>
            <CallTable onSelectCall={(call) => setSelectedCall(call)} />
          </div>
          
          {selectedCall && (
            <div className="overflow-hidden hidden lg:block">
              <CallDetailsPanel 
                call={selectedCall} 
                onClose={() => setSelectedCall(null)} 
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile view drawer for selected call */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedCall(null)}
          ></div>
          <div className="absolute inset-y-0 right-0 w-full max-w-xs bg-background">
            <CallDetailsPanel
              call={selectedCall}
              onClose={() => setSelectedCall(null)}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CallsPage;
