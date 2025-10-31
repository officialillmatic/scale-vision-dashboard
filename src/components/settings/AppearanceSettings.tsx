
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/theme/ThemeProvider";
import { SunIcon, MoonIcon, MonitorIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance Settings</CardTitle>
        <CardDescription>Customize how Dr. Scale looks and feels</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="theme-mode">Theme Mode</Label>
            <div>
              <ToggleGroup 
                type="single" 
                value={theme} 
                onValueChange={(value) => {
                  if (value) setTheme(value as 'light' | 'dark' | 'system');
                }}
                className="justify-start"
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="light" aria-label="Light Mode" className="flex items-center gap-2">
                        <SunIcon className="h-4 w-4" />
                        <span>Light</span>
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Light mode</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="dark" aria-label="Dark Mode" className="flex items-center gap-2">
                        <MoonIcon className="h-4 w-4" />
                        <span>Dark</span>
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Dark mode</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="system" aria-label="System Mode" className="flex items-center gap-2">
                        <MonitorIcon className="h-4 w-4" />
                        <span>System</span>
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Follow system settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
