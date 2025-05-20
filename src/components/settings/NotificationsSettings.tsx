
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BellIcon } from "lucide-react";

export function NotificationsSettings() {
  const { preferences, updatePreference } = useUserPreferences();
  
  const handleToggleCallNotifications = (checked: boolean) => {
    updatePreference("email_notifications_calls", checked);
  };
  
  const handleToggleAgentNotifications = (checked: boolean) => {
    updatePreference("email_notifications_agents", checked);
  };
  
  const testNotification = () => {
    toast.success("Test notification sent! Check your email.", {
      description: "This is a test notification. In a real scenario, an email would be sent.",
      action: {
        label: "Dismiss",
        onClick: () => toast.dismiss(),
      },
      icon: <BellIcon />,
    });
  };
  
  if (!preferences) {
    return <div>Loading preferences...</div>;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Configure how and when you receive notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="call-notifications">Call Notifications</Label>
                <p className="text-muted-foreground text-sm">Receive email notifications when new calls are received.</p>
              </div>
              <Switch 
                id="call-notifications" 
                checked={preferences.email_notifications_calls} 
                onCheckedChange={handleToggleCallNotifications}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="agent-notifications">Agent Activity</Label>
                <p className="text-muted-foreground text-sm">Receive email notifications about agent activity.</p>
              </div>
              <Switch 
                id="agent-notifications" 
                checked={preferences.email_notifications_agents} 
                onCheckedChange={handleToggleAgentNotifications}
              />
            </div>
            
            <div className="pt-2">
              <Button variant="outline" onClick={testNotification} className="mt-2">
                <BellIcon className="mr-2 h-4 w-4" />
                Test Notification
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
