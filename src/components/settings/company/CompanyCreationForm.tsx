
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { createCompany } from '@/services/companyService';
import { toast } from 'sonner';

export function CompanyCreationForm() {
  const { user, refreshCompany } = useAuth();
  const [companyName, setCompanyName] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCompanyCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    if (!companyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsCreating(true);
    try {
      const newCompany = await createCompany(companyName, user.id);
      if (newCompany) {
        await refreshCompany();
        toast.success("Company created successfully");
      }
    } catch (error) {
      console.error("Error creating company:", error);
      toast.error("Failed to create company. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Setup</CardTitle>
        <CardDescription>Create your company profile to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCompanyCreate}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input 
                id="company-name"
                placeholder="Enter your company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleCompanyCreate} 
          disabled={isCreating || !companyName.trim()}
        >
          {isCreating ? <LoadingSpinner size="sm" className="mr-2" /> : null}
          Create Company
        </Button>
      </CardFooter>
    </Card>
  );
}
