
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { WhiteLabelConfig } from "@/lib/types/company";
import { companyService } from "@/services/companyService";
import { useAuth } from "@/contexts/AuthContext";

export function WhiteLabelSettings() {
  const [config, setConfig] = useState<WhiteLabelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { company } = useAuth();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    if (!company?.id) return;
    
    try {
      const data = await companyService.getWhiteLabelConfig(company.id);
      setConfig(data || {
        company_id: company.id,
        enabled: false,
        company_name: '',
      } as WhiteLabelConfig);
    } catch (error) {
      console.error('Error fetching white label config:', error);
      toast.error('Failed to load white label settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config || !company?.id) return;
    
    setIsSaving(true);
    try {
      await companyService.updateWhiteLabelConfig(company.id, config);
      toast.success('White label settings updated successfully');
    } catch (error) {
      console.error('Error saving white label config:', error);
      toast.error('Failed to save white label settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading white label settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>White Label Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="white-label-enabled"
            checked={config?.enabled || false}
            onCheckedChange={(checked) => setConfig(prev => prev ? {...prev, enabled: checked} : null)}
          />
          <Label htmlFor="white-label-enabled">Enable White Labeling</Label>
        </div>

        {config?.enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={config.company_name || ''}
                onChange={(e) => setConfig(prev => prev ? {...prev, company_name: e.target.value} : null)}
                placeholder="Your company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo-url">Logo URL</Label>
              <Input
                id="logo-url"
                type="url"
                value={config.logo_url || ''}
                onChange={(e) => setConfig(prev => prev ? {...prev, logo_url: e.target.value} : null)}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color</Label>
                <Input
                  id="primary-color"
                  type="color"
                  value={config.primary_color || '#000000'}
                  onChange={(e) => setConfig(prev => prev ? {...prev, primary_color: e.target.value} : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-color">Secondary Color</Label>
                <Input
                  id="secondary-color"
                  type="color"
                  value={config.secondary_color || '#ffffff'}
                  onChange={(e) => setConfig(prev => prev ? {...prev, secondary_color: e.target.value} : null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-domain">Custom Domain</Label>
              <Input
                id="custom-domain"
                value={config.custom_domain || ''}
                onChange={(e) => setConfig(prev => prev ? {...prev, custom_domain: e.target.value} : null)}
                placeholder="your-domain.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-from">Email From Name</Label>
              <Input
                id="email-from"
                value={config.email_from_name || ''}
                onChange={(e) => setConfig(prev => prev ? {...prev, email_from_name: e.target.value} : null)}
                placeholder="Your Company Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-address">Email From Address</Label>
              <Input
                id="email-address"
                type="email"
                value={config.email_from_address || ''}
                onChange={(e) => setConfig(prev => prev ? {...prev, email_from_address: e.target.value} : null)}
                placeholder="noreply@yourcompany.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-email">Support Email</Label>
              <Input
                id="support-email"
                type="email"
                value={config.support_email || ''}
                onChange={(e) => setConfig(prev => prev ? {...prev, support_email: e.target.value} : null)}
                placeholder="support@yourcompany.com"
              />
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save White Label Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
