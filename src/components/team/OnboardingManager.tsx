
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { OnboardingStep } from '@/types/userManagement';
import { GraduationCap, CheckCircle, Clock, Mail, FileText, Video, Users } from 'lucide-react';

export function OnboardingManager() {
  const [onboardingTemplates] = useState([
    {
      id: 'template-1',
      name: 'Standard Employee Onboarding',
      description: 'Default onboarding process for new employees',
      steps: 8,
      avgCompletionTime: '3.2 days',
      completionRate: 87
    },
    {
      id: 'template-2',
      name: 'Manager Onboarding',
      description: 'Extended onboarding for management roles',
      steps: 12,
      avgCompletionTime: '5.1 days',
      completionRate: 92
    },
    {
      id: 'template-3',
      name: 'Agent User Onboarding',
      description: 'Quick setup for AI agent users',
      steps: 5,
      avgCompletionTime: '1.8 days',
      completionRate: 94
    }
  ]);

  const defaultSteps: OnboardingStep[] = [
    {
      id: 'step-1',
      title: 'Welcome Email',
      description: 'Send personalized welcome email with login credentials',
      completed: true,
      order: 1
    },
    {
      id: 'step-2',
      title: 'Profile Setup',
      description: 'Complete user profile and upload avatar',
      completed: true,
      order: 2
    },
    {
      id: 'step-3',
      title: 'System Training',
      description: 'Watch introduction videos and tutorials',
      completed: false,
      order: 3
    },
    {
      id: 'step-4',
      title: 'Agent Assignment',
      description: 'Assign primary AI agent and configure settings',
      completed: false,
      order: 4
    },
    {
      id: 'step-5',
      title: 'Team Introduction',
      description: 'Meet team members and department head',
      completed: false,
      order: 5
    }
  ];

  const activeOnboardings = [
    {
      user: 'Mike Chen',
      template: 'Standard Employee Onboarding',
      progress: 60,
      currentStep: 'Agent Assignment',
      startDate: '2024-01-14',
      daysActive: 2
    },
    {
      user: 'Lisa Wang',
      template: 'Manager Onboarding',
      progress: 25,
      currentStep: 'System Training',
      startDate: '2024-01-15',
      daysActive: 1
    },
    {
      user: 'David Kim',
      template: 'Agent User Onboarding',
      progress: 80,
      currentStep: 'Team Introduction',
      startDate: '2024-01-13',
      daysActive: 3
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Onboarding Management</h2>
          <p className="text-gray-600">Manage user onboarding processes and training materials</p>
        </div>
        <Button>
          <GraduationCap className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Onboarding Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Onboardings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOnboardings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg. Completion Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2</div>
            <p className="text-xs text-gray-500">days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">91%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onboardingTemplates.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Onboarding Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {onboardingTemplates.map((template) => (
                <div key={template.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {template.completionRate}% success
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{template.steps} steps</span>
                    <span>{template.avgCompletionTime} avg.</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Onboardings */}
        <Card>
          <CardHeader>
            <CardTitle>Active Onboardings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeOnboardings.map((onboarding, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{onboarding.user}</h4>
                      <p className="text-sm text-gray-600">{onboarding.template}</p>
                    </div>
                    <Badge variant="outline">
                      Day {onboarding.daysActive}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{onboarding.progress}%</span>
                    </div>
                    <Progress value={onboarding.progress} className="h-2" />
                    <p className="text-xs text-gray-500">
                      Current: {onboarding.currentStep}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Default Onboarding Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Standard Onboarding Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {defaultSteps.map((step) => {
              const StepIcon = step.completed ? CheckCircle : Clock;
              const iconClass = step.completed ? 'text-green-600' : 'text-gray-400';
              
              return (
                <div key={step.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    <StepIcon className={`h-5 w-5 ${iconClass}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{step.title}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Edit</Button>
                    {step.completed && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Complete
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
