
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { DisplaySettings } from '@/components/settings/DisplaySettings';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { BillingSettings } from '@/components/settings/BillingSettings';

const SettingsPage = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-4">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
          </TabsList>
          
          <TabsContent value="company">
            <div className="space-y-6">
              <CompanySettings />
            </div>
          </TabsContent>
          
          <TabsContent value="billing">
            <div className="space-y-6">
              <BillingSettings />
            </div>
          </TabsContent>
          
          <TabsContent value="appearance">
            <div className="space-y-6">
              <AppearanceSettings />
            </div>
          </TabsContent>
          
          <TabsContent value="notifications">
            <div className="space-y-6">
              <NotificationsSettings />
            </div>
          </TabsContent>
          
          <TabsContent value="display">
            <div className="space-y-6">
              <DisplaySettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
