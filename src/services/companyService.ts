
import { supabase } from "@/integrations/supabase/client";
import { Company, CompanyPricing, WhiteLabelConfig } from "@/lib/types/company";

export const companyService = {
  async getCompanyPricing(companyId: string): Promise<CompanyPricing | null> {
    const { data, error } = await supabase
      .from('company_pricing')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching company pricing:', error);
      throw error;
    }

    return data;
  },

  async updateCompanyPricing(companyId: string, pricing: Partial<CompanyPricing>): Promise<CompanyPricing> {
    const { data, error } = await supabase
      .from('company_pricing')
      .upsert({
        company_id: companyId,
        ...pricing,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating company pricing:', error);
      throw error;
    }

    return data;
  },

  async getWhiteLabelConfig(companyId: string): Promise<WhiteLabelConfig | null> {
    const { data, error } = await supabase
      .from('white_label_configs')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching white label config:', error);
      throw error;
    }

    return data;
  },

  async updateWhiteLabelConfig(companyId: string, config: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig> {
    const { data, error } = await supabase
      .from('white_label_configs')
      .upsert({
        company_id: companyId,
        ...config,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating white label config:', error);
      throw error;
    }

    return data;
  },

  async calculateCallCost(companyId: string, durationSeconds: number): Promise<number> {
    const pricing = await this.getCompanyPricing(companyId);
    
    if (!pricing) {
      // Default pricing if no custom pricing is set
      return (durationSeconds / 60) * 0.02; // $0.02 per minute default
    }

    const minutes = durationSeconds / 60;
    
    switch (pricing.pricing_type) {
      case 'custom':
        return minutes * (pricing.custom_rate_per_minute || pricing.base_rate_per_minute);
      
      case 'enterprise':
        // Apply volume discounts for enterprise
        if (pricing.volume_discount_threshold && minutes >= pricing.volume_discount_threshold) {
          const discountRate = pricing.volume_discount_rate || 0;
          const discountedRate = pricing.base_rate_per_minute * (1 - discountRate);
          return minutes * discountedRate;
        }
        return minutes * pricing.base_rate_per_minute;
      
      default:
        return minutes * pricing.base_rate_per_minute;
    }
  }
};

// Export individual functions for easier importing
export async function fetchCompany(userId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching company:', error);
    throw error;
  }

  return data;
}

export async function createCompany(name: string, ownerId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name,
      owner_id: ownerId
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating company:', error);
    throw error;
  }

  return data;
}

export async function updateCompanyLogo(companyId: string, logoUrl: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .update({ logo_url: logoUrl })
    .eq('id', companyId)
    .select()
    .single();

  if (error) {
    console.error('Error updating company logo:', error);
    throw error;
  }

  return data;
}
