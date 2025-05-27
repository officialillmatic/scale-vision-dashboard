
import React from "react";
import { ProductionDashboardLayout } from "@/components/dashboard/ProductionDashboardLayout";
import { TestDataGenerator } from "@/components/dashboard/TestDataGenerator";

const TestDataPage: React.FC = () => {
  return (
    <ProductionDashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Test Data Setup</h1>
          <p className="text-gray-600">
            Generate sample call data to test your dashboard and analytics features.
          </p>
        </div>
        
        <TestDataGenerator />
      </div>
    </ProductionDashboardLayout>
  );
};

export default TestDataPage;
