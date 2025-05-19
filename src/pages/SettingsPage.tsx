
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { Card } from '@/components/ui/card';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <DashboardLayout>
      <div className="h-full">
        <div className="flex flex-col space-y-8 pb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account and application preferences.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full space-y-6">
            <div className="space-between flex items-center">
              <TabsList>
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="display">Display</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="company" className="space-y-4">
              <CompanySettings />
            </TabsContent>
            
            <TabsContent value="appearance" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Appearance Settings</h2>
                <p className="text-muted-foreground">
                  This feature will be available soon.
                </p>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Notifications Settings</h2>
                <p className="text-muted-foreground">
                  This feature will be available soon.
                </p>
              </Card>
            </TabsContent>
            
            <TabsContent value="display" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Display Settings</h2>
                <p className="text-muted-foreground">
                  This feature will be available soon.
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
