
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChartIcon, LineChartIcon, PieChartIcon, LayoutIcon } from "lucide-react";

export function DisplaySettings() {
  const { preferences, updatePreference, updatePreferences } = useUserPreferences();
  
  const handleTimeUnitChange = (value: string) => {
    updatePreference("display_units_time", value as "minutes" | "hours");
  };
  
  const handleCurrencyChange = (value: string) => {
    updatePreference("display_units_currency", value as "USD" | "EUR" | "GBP");
  };
  
  const handleGraphTypeChange = (value: string) => {
    updatePreference("preferred_graph_type", value as "bar" | "line" | "pie");
  };
  
  const handleLayoutChange = (value: string) => {
    updatePreference("dashboard_layout", value as "1-column" | "2-column");
  };
  
  const handleCardVisibilityChange = (card: keyof typeof preferences.visible_dashboard_cards, checked: boolean) => {
    if (!preferences) return;
    
    const updatedCards = { 
      ...preferences.visible_dashboard_cards, 
      [card]: checked 
    };
    
    updatePreference("visible_dashboard_cards", updatedCards);
  };
  
  if (!preferences) {
    return <div>Loading preferences...</div>;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Display Settings</CardTitle>
        <CardDescription>Customize how data is displayed throughout the application</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="time-unit">Time Units</Label>
              <Select 
                value={preferences.display_units_time} 
                onValueChange={handleTimeUnitChange}
              >
                <SelectTrigger id="time-unit">
                  <SelectValue placeholder="Select time units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency-unit">Currency</Label>
              <Select 
                value={preferences.display_units_currency} 
                onValueChange={handleCurrencyChange}
              >
                <SelectTrigger id="currency-unit">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Preferred Graph Type</Label>
            <RadioGroup 
              value={preferences.preferred_graph_type} 
              onValueChange={handleGraphTypeChange}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bar" id="graph-bar" />
                <Label htmlFor="graph-bar" className="flex items-center gap-1">
                  <BarChartIcon className="h-4 w-4" /> Bar
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="line" id="graph-line" />
                <Label htmlFor="graph-line" className="flex items-center gap-1">
                  <LineChartIcon className="h-4 w-4" /> Line
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pie" id="graph-pie" />
                <Label htmlFor="graph-pie" className="flex items-center gap-1">
                  <PieChartIcon className="h-4 w-4" /> Pie
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label>Dashboard Layout</Label>
            <RadioGroup 
              value={preferences.dashboard_layout} 
              onValueChange={handleLayoutChange}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1-column" id="layout-1" />
                <Label htmlFor="layout-1" className="flex items-center gap-1">
                  <LayoutIcon className="h-4 w-4" /> Single Column
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2-column" id="layout-2" />
                <Label htmlFor="layout-2" className="flex items-center gap-1">
                  <LayoutIcon className="h-4 w-4" /> Two Columns
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label>Dashboard Cards</Label>
            <p className="text-sm text-muted-foreground mb-2">Choose which cards to display on your dashboard.</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="card-total-cost">Total Cost Card</Label>
                <Switch 
                  id="card-total-cost" 
                  checked={preferences.visible_dashboard_cards.total_cost} 
                  onCheckedChange={(checked) => handleCardVisibilityChange('total_cost', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="card-call-outcomes">Call Outcomes Card</Label>
                <Switch 
                  id="card-call-outcomes" 
                  checked={preferences.visible_dashboard_cards.call_outcomes} 
                  onCheckedChange={(checked) => handleCardVisibilityChange('call_outcomes', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="card-recent-calls">Recent Calls Card</Label>
                <Switch 
                  id="card-recent-calls" 
                  checked={preferences.visible_dashboard_cards.recent_calls} 
                  onCheckedChange={(checked) => handleCardVisibilityChange('recent_calls', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="card-agent-performance">Agent Performance Card</Label>
                <Switch 
                  id="card-agent-performance" 
                  checked={preferences.visible_dashboard_cards.agent_performance} 
                  onCheckedChange={(checked) => handleCardVisibilityChange('agent_performance', checked)}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
