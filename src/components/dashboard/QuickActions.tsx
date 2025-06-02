
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Phone, FileText, Settings, Bot } from 'lucide-react';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "View Calls",
      description: "Recent communications",
      icon: Phone,
      color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
      onClick: () => navigate('/calls')
    },
    {
      title: "Team Management",
      description: "Manage agents & users",
      icon: Users,
      color: "bg-green-50 text-green-600 hover:bg-green-100",
      onClick: () => navigate('/team')
    },
    {
      title: "Analytics",
      description: "View detailed reports",
      icon: FileText,
      color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
      onClick: () => navigate('/analytics')
    },
    {
      title: "Settings",
      description: "Configure platform",
      icon: Settings,
      color: "bg-gray-50 text-gray-600 hover:bg-gray-100",
      onClick: () => navigate('/settings')
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className={`h-auto p-4 flex flex-col items-start gap-2 ${action.color} border-transparent`}
              onClick={action.onClick}
            >
              <div className="flex items-center gap-2 w-full">
                <action.icon className="h-4 w-4" />
                <span className="font-medium">{action.title}</span>
              </div>
              <span className="text-xs opacity-70">{action.description}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
