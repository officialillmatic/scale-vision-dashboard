
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { DisplaySettings } from '@/components/settings/DisplaySettings';
import { UserPreferencesProvider } from '@/hooks/useUserPreferences';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <DashboardLayout>
      <UserPreferencesProvider>
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
                <AppearanceSettings />
              </TabsContent>
              
              <TabsContent value="notifications" className="space-y-4">
                <NotificationsSettings />
              </TabsContent>
              
              <TabsContent value="display" className="space-y-4">
                <DisplaySettings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </UserPreferencesProvider>
    </DashboardLayout>
  );
};

export default SettingsPage;
