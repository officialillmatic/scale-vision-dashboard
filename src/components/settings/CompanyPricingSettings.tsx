
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CompanyPricing } from "@/lib/types/company";
import { companyService } from "@/services/companyService";
import { useAuth } from "@/contexts/AuthContext";

export function CompanyPricingSettings() {
  const [pricing, setPricing] = useState<CompanyPricing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    if (!user?.company_id) return;
    
    try {
      const data = await companyService.getCompanyPricing(user.company_id);
      setPricing(data || {
        company_id: user.company_id,
        pricing_type: 'standard',
        base_rate_per_minute: 0.02,
      } as CompanyPricing);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      toast.error('Failed to load pricing settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pricing || !user?.company_id) return;
    
    setIsSaving(true);
    try {
      await companyService.updateCompanyPricing(user.company_id, pricing);
      toast.success('Pricing settings updated successfully');
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast.error('Failed to save pricing settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading pricing settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="pricing-type">Pricing Type</Label>
          <Select
            value={pricing?.pricing_type || 'standard'}
            onValueChange={(value) => setPricing(prev => prev ? {...prev, pricing_type: value as any} : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select pricing type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="base-rate">Base Rate per Minute ($)</Label>
          <Input
            id="base-rate"
            type="number"
            step="0.001"
            value={pricing?.base_rate_per_minute || 0}
            onChange={(e) => setPricing(prev => prev ? {...prev, base_rate_per_minute: parseFloat(e.target.value)} : null)}
          />
        </div>

        {pricing?.pricing_type === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="custom-rate">Custom Rate per Minute ($)</Label>
            <Input
              id="custom-rate"
              type="number"
              step="0.001"
              value={pricing?.custom_rate_per_minute || 0}
              onChange={(e) => setPricing(prev => prev ? {...prev, custom_rate_per_minute: parseFloat(e.target.value)} : null)}
            />
          </div>
        )}

        {pricing?.pricing_type === 'enterprise' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="volume-threshold">Volume Discount Threshold (minutes)</Label>
              <Input
                id="volume-threshold"
                type="number"
                value={pricing?.volume_discount_threshold || 0}
                onChange={(e) => setPricing(prev => prev ? {...prev, volume_discount_threshold: parseInt(e.target.value)} : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume-rate">Volume Discount Rate (0-1)</Label>
              <Input
                id="volume-rate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={pricing?.volume_discount_rate || 0}
                onChange={(e) => setPricing(prev => prev ? {...prev, volume_discount_rate: parseFloat(e.target.value)} : null)}
              />
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Pricing Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
