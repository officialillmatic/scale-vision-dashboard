
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { CompanyPricingSettings } from '@/components/settings/CompanyPricingSettings';
import { WhiteLabelSettings } from '@/components/settings/WhiteLabelSettings';
import { DisplaySettings } from '@/components/settings/DisplaySettings';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { BillingSettings } from '@/components/settings/BillingSettings';
import { useRole } from '@/hooks/useRole';
import { RoleCheck } from '@/components/auth/RoleCheck';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('company');
  const { can, isCompanyOwner, checkRole } = useRole();
  const isAdmin = isCompanyOwner || checkRole('admin');
  const navigate = useNavigate();
  
  // Prevent accessing admin tabs if not an admin
  useEffect(() => {
    if ((activeTab === 'billing' || activeTab === 'pricing' || activeTab === 'white-label') && !can.accessBillingSettings) {
      toast.error('You need administrator permissions to access this section');
      setActiveTab('company');
    }
  }, [activeTab, can.accessBillingSettings]);
  
  const handleTabChange = (value: string) => {
    if ((value === 'billing' || value === 'pricing' || value === 'white-label') && !isAdmin) {
      toast.error('You need administrator privileges to access this section');
      return;
    }
    setActiveTab(value);
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-4">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="company">Company</TabsTrigger>
            {isAdmin && <TabsTrigger value="pricing">Pricing</TabsTrigger>}
            {isAdmin && <TabsTrigger value="white-label">White Label</TabsTrigger>}
            {isAdmin && <TabsTrigger value="billing">Billing</TabsTrigger>}
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
          </TabsList>
          
          <TabsContent value="company">
            <div className="space-y-6">
              <CompanySettings />
            </div>
          </TabsContent>
          
          <TabsContent value="pricing">
            <div className="space-y-6">
              <RoleCheck 
                adminOnly
                fallback={<div className="text-muted-foreground">You don't have permission to access pricing settings.</div>}
              >
                <CompanyPricingSettings />
              </RoleCheck>
            </div>
          </TabsContent>
          
          <TabsContent value="white-label">
            <div className="space-y-6">
              <RoleCheck 
                adminOnly
                fallback={<div className="text-muted-foreground">You don't have permission to access white label settings.</div>}
              >
                <WhiteLabelSettings />
              </RoleCheck>
            </div>
          </TabsContent>
          
          <TabsContent value="billing">
            <div className="space-y-6">
              <RoleCheck 
                adminOnly
                fallback={<div className="text-muted-foreground">You don't have permission to access billing settings.</div>}
              >
                <BillingSettings />
              </RoleCheck>
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
