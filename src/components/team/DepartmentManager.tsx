
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Department } from '@/types/userManagement';
import { Building2, Users, Plus, Edit, Trash2 } from 'lucide-react';

export function DepartmentManager() {
  const [departments] = useState<Department[]>([
    {
      id: 'dept-1',
      name: 'Engineering',
      description: 'Software development and technical operations',
      team_lead_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'dept-2',
      name: 'Marketing',
      description: 'Marketing and customer outreach',
      team_lead_id: 'user-2',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'dept-3',
      name: 'Sales',
      description: 'Sales and business development',
      parent_department_id: 'dept-2',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ]);

  // Mock user counts per department
  const departmentStats = {
    'dept-1': { userCount: 45, activeUsers: 42 },
    'dept-2': { userCount: 23, activeUsers: 21 },
    'dept-3': { userCount: 12, activeUsers: 11 }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Department Management</h2>
          <p className="text-gray-600">Organize your team into departments and assign team leads</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Department
        </Button>
      </div>

      {/* Department Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(departmentStats).reduce((sum, dept) => sum + dept.userCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Team Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {departments.filter(dept => dept.team_lead_id).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments List */}
      <div className="grid gap-4">
        {departments.map((department) => {
          const stats = departmentStats[department.id as keyof typeof departmentStats];
          const isSubDepartment = !!department.parent_department_id;
          
          return (
            <Card key={department.id} className={isSubDepartment ? 'ml-8 border-l-4 border-l-blue-200' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {department.name}
                        {isSubDepartment && (
                          <Badge variant="outline" className="text-xs">
                            Sub-department
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{department.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">{stats?.userCount || 0} users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-gray-600">{stats?.activeUsers || 0} active</span>
                    </div>
                    {department.team_lead_id && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Team Lead Assigned
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    View Users
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
