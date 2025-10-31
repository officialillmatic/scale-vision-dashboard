
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
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('company');
  const { can, isCompanyOwner, checkRole } = useRole();
  const { isSuperAdmin } = useSuperAdmin();
  const isAdmin = isCompanyOwner || checkRole('admin');
  
  // Prevent accessing super admin tabs if not a super admin
  useEffect(() => {
    if ((activeTab === 'billing' || activeTab === 'pricing' || activeTab === 'white-label' || activeTab === 'notifications' || activeTab === 'display') && !isSuperAdmin) {
      toast.error('You need super administrator permissions to access this section');
      setActiveTab('company');
    }
  }, [activeTab, isSuperAdmin]);
  
  const handleTabChange = (value: string) => {
    if ((value === 'billing' || value === 'pricing' || value === 'white-label' || value === 'notifications' || value === 'display') && !isSuperAdmin) {
      toast.error('You need super administrator privileges to access this section');
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
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="pricing">Pricing</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="white-label">White Label</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="billing">Billing</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="notifications">Notifications</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="display">Display</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="company">
            <div className="space-y-6">
              <CompanySettings />
            </div>
          </TabsContent>
          
          <TabsContent value="appearance">
            <div className="space-y-6">
              <AppearanceSettings />
            </div>
          </TabsContent>
          
          {isSuperAdmin && (
            <TabsContent value="pricing">
              <div className="space-y-6">
                <RoleCheck 
                  superAdminOnly
                  fallback={<div className="text-muted-foreground">You don't have permission to access pricing settings.</div>}
                >
                  <CompanyPricingSettings />
                </RoleCheck>
              </div>
            </TabsContent>
          )}
          
          {isSuperAdmin && (
            <TabsContent value="white-label">
              <div className="space-y-6">
                <RoleCheck 
                  superAdminOnly
                  fallback={<div className="text-muted-foreground">You don't have permission to access white label settings.</div>}
                >
                  <WhiteLabelSettings />
                </RoleCheck>
              </div>
            </TabsContent>
          )}
          
          {isSuperAdmin && (
            <TabsContent value="billing">
              <div className="space-y-6">
                <RoleCheck 
                  superAdminOnly
                  fallback={<div className="text-muted-foreground">You don't have permission to access billing settings.</div>}
                >
                  <BillingSettings />
                </RoleCheck>
              </div>
            </TabsContent>
          )}
          
          {isSuperAdmin && (
            <TabsContent value="notifications">
              <div className="space-y-6">
                <RoleCheck 
                  superAdminOnly
                  fallback={<div className="text-muted-foreground">You don't have permission to access notifications settings.</div>}
                >
                  <NotificationsSettings />
                </RoleCheck>
              </div>
            </TabsContent>
          )}
          
          {isSuperAdmin && (
            <TabsContent value="display">
              <div className="space-y-6">
                <RoleCheck 
                  superAdminOnly
                  fallback={<div className="text-muted-foreground">You don't have permission to access display settings.</div>}
                >
                  <DisplaySettings />
                </RoleCheck>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
