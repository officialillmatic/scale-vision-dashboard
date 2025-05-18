
import { useState } from "react";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const SettingsPage = () => {
  const [companyName, setCompanyName] = useState("Acme Inc.");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#9b87f5");
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Branding settings saved successfully");
    }, 1000);
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
        
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="api">API Access</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  View and update your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Account Name</Label>
                    <Input id="account-name" defaultValue="Acme Inc." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-email">Account Email</Label>
                    <Input id="account-email" defaultValue="admin@acmeinc.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-phone">Phone Number</Label>
                    <Input id="account-phone" defaultValue="+1 (555) 123-4567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-timezone">Timezone</Label>
                    <select
                      id="account-timezone"
                      className="w-full p-2 border rounded-md bg-background"
                      defaultValue="America/New_York"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 border-t p-4">
                <Button variant="outline">Cancel</Button>
                <Button onClick={() => toast.success("Account information updated!")}>
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Manage your account security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input type="password" id="current-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input type="password" id="new-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input type="password" id="confirm-password" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 border-t p-4">
                <Button variant="outline">Cancel</Button>
                <Button onClick={() => toast.success("Password updated successfully!")}>
                  Update Password
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="branding" className="space-y-4">
            <Card>
              <form onSubmit={handleSaveBranding}>
                <CardHeader>
                  <CardTitle>Branding Settings</CardTitle>
                  <CardDescription>
                    Customize how your dashboard looks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input 
                      id="company-name" 
                      value={companyName} 
                      onChange={(e) => setCompanyName(e.target.value)} 
                    />
                    <p className="text-sm text-muted-foreground">This name will appear throughout the dashboard.</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="logo-upload">Company Logo</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="h-20 w-20 border rounded-md flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                          <img 
                            src={logoUrl} 
                            alt="Company logo" 
                            className="max-w-full max-h-full object-contain" 
                          />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-muted-foreground">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <Input 
                          id="logo-upload" 
                          type="file" 
                          className="mb-2" 
                          accept="image/*"
                          onChange={() => setLogoUrl("https://via.placeholder.com/200x100")}
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommended size: 200x100px. Max file size: 2MB.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex gap-3">
                      <Input 
                        id="primary-color" 
                        type="color" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-12 h-10 p-1" 
                      />
                      <Input 
                        type="text" 
                        value={primaryColor} 
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1" 
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This color will be used for buttons, links, and other accent elements.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="footer-text">Custom Footer Text</Label>
                    <Textarea 
                      id="footer-text"
                      placeholder="© 2023 Your Company, Inc. All rights reserved."
                      className="resize-none"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2 border-t p-4">
                  <Button variant="outline" type="button">Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose when and how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Call Summaries</div>
                      <div className="text-sm text-muted-foreground">
                        Receive daily summaries of call activity
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="call-summaries-email" className="mr-1" />
                      <label htmlFor="call-summaries-email" className="text-sm">Email</label>
                      
                      <input type="checkbox" id="call-summaries-app" className="ml-3 mr-1" />
                      <label htmlFor="call-summaries-app" className="text-sm">In-app</label>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Failed Calls</div>
                      <div className="text-sm text-muted-foreground">
                        Alert when calls fail to connect or have errors
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="failed-calls-email" className="mr-1" checked />
                      <label htmlFor="failed-calls-email" className="text-sm">Email</label>
                      
                      <input type="checkbox" id="failed-calls-app" className="ml-3 mr-1" checked />
                      <label htmlFor="failed-calls-app" className="text-sm">In-app</label>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Team Activity</div>
                      <div className="text-sm text-muted-foreground">
                        Notifications about team member actions
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="team-activity-email" className="mr-1" />
                      <label htmlFor="team-activity-email" className="text-sm">Email</label>
                      
                      <input type="checkbox" id="team-activity-app" className="ml-3 mr-1" checked />
                      <label htmlFor="team-activity-app" className="text-sm">In-app</label>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Billing Updates</div>
                      <div className="text-sm text-muted-foreground">
                        Receive invoices and billing notifications
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="billing-email" className="mr-1" checked />
                      <label htmlFor="billing-email" className="text-sm">Email</label>
                      
                      <input type="checkbox" id="billing-app" className="ml-3 mr-1" />
                      <label htmlFor="billing-app" className="text-sm">In-app</label>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t p-4">
                <Button onClick={() => toast.success("Notification preferences saved!")}>
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage your API keys for programmatic access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Production API Key</h4>
                      <p className="text-sm text-muted-foreground">
                        Use this key for your production environment
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast.info("API key copied to clipboard")}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      Copy
                    </Button>
                  </div>
                  <div className="mt-2 font-mono text-sm bg-background p-2 rounded-md border">
                    ••••••••••••••••••••••••••••••7890
                  </div>
                </div>
                
                <div className="rounded-md bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Development API Key</h4>
                      <p className="text-sm text-muted-foreground">
                        Use this key for testing and development
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast.info("API key copied to clipboard")}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      Copy
                    </Button>
                  </div>
                  <div className="mt-2 font-mono text-sm bg-background p-2 rounded-md border">
                    ••••••••••••••••••••••••••••••1234
                  </div>
                </div>
                
                <Button className="mt-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  Generate New API Key
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>
                  Configure webhook endpoints for real-time updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input id="webhook-url" placeholder="https://your-app.com/webhooks/mr-scale" />
                </div>
                
                <div className="space-y-2">
                  <Label>Events to Send</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="event-call-completed" checked />
                      <label htmlFor="event-call-completed">Call Completed</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="event-call-failed" checked />
                      <label htmlFor="event-call-failed">Call Failed</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="event-transcription-ready" />
                      <label htmlFor="event-transcription-ready">Transcription Ready</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="event-team-updated" />
                      <label htmlFor="event-team-updated">Team Updated</label>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t p-4">
                <Button variant="outline" className="mr-2">Test Webhook</Button>
                <Button onClick={() => toast.success("Webhook configuration saved!")}>
                  Save Configuration
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
