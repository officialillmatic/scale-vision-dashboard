
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { UserRole } from '@/types/userManagement';
import { Shield, Lock, Eye, Edit, Trash2, Users, Settings } from 'lucide-react';

export function RolePermissionsManager() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');

  const roles: { role: UserRole; name: string; description: string; userCount: number }[] = [
    {
      role: 'admin',
      name: 'Administrator',
      description: 'Full system access and user management',
      userCount: 5
    },
    {
      role: 'manager',
      name: 'Manager',
      description: 'Team management and reporting access',
      userCount: 23
    },
    {
      role: 'user',
      name: 'User',
      description: 'Standard user with call and agent access',
      userCount: 201
    },
    {
      role: 'viewer',
      name: 'Viewer',
      description: 'Read-only access to calls and reports',
      userCount: 19
    }
  ];

  const permissions = [
    {
      category: 'User Management',
      permissions: [
        { id: 'manage_users', name: 'Manage Users', description: 'Create, edit, and delete users' },
        { id: 'view_users', name: 'View Users', description: 'View user profiles and information' },
        { id: 'invite_users', name: 'Invite Users', description: 'Send user invitations' },
        { id: 'manage_roles', name: 'Manage Roles', description: 'Assign and modify user roles' }
      ]
    },
    {
      category: 'Agent Management',
      permissions: [
        { id: 'manage_agents', name: 'Manage Agents', description: 'Create, edit, and delete agents' },
        { id: 'assign_agents', name: 'Assign Agents', description: 'Assign agents to users' },
        { id: 'view_agents', name: 'View Agents', description: 'View agent information' }
      ]
    },
    {
      category: 'Call Management',
      permissions: [
        { id: 'make_calls', name: 'Make Calls', description: 'Initiate calls using agents' },
        { id: 'view_calls', name: 'View Calls', description: 'Access call history and recordings' },
        { id: 'export_calls', name: 'Export Calls', description: 'Export call data and reports' }
      ]
    },
    {
      category: 'Analytics & Reporting',
      permissions: [
        { id: 'view_analytics', name: 'View Analytics', description: 'Access analytics and reports' },
        { id: 'export_reports', name: 'Export Reports', description: 'Export analytical reports' },
        { id: 'view_performance', name: 'View Performance', description: 'View performance metrics' }
      ]
    },
    {
      category: 'System Administration',
      permissions: [
        { id: 'system_settings', name: 'System Settings', description: 'Modify system configuration' },
        { id: 'billing_access', name: 'Billing Access', description: 'Access billing and payments' },
        { id: 'audit_logs', name: 'Audit Logs', description: 'View system audit logs' }
      ]
    }
  ];

  // Mock permission assignments for each role
  const rolePermissions: Record<UserRole, string[]> = {
    admin: [
      'manage_users', 'view_users', 'invite_users', 'manage_roles',
      'manage_agents', 'assign_agents', 'view_agents',
      'make_calls', 'view_calls', 'export_calls',
      'view_analytics', 'export_reports', 'view_performance',
      'system_settings', 'billing_access', 'audit_logs'
    ],
    manager: [
      'view_users', 'invite_users',
      'assign_agents', 'view_agents',
      'make_calls', 'view_calls', 'export_calls',
      'view_analytics', 'export_reports', 'view_performance'
    ],
    user: [
      'view_agents',
      'make_calls', 'view_calls',
      'view_analytics'
    ],
    viewer: [
      'view_agents',
      'view_calls',
      'view_analytics'
    ]
  };

  const hasPermission = (permissionId: string) => {
    return rolePermissions[selectedRole].includes(permissionId);
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      admin: 'bg-red-50 text-red-700 border-red-200',
      manager: 'bg-blue-50 text-blue-700 border-blue-200',
      user: 'bg-green-50 text-green-700 border-green-200',
      viewer: 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colors[role];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Role & Permissions Management</h2>
          <p className="text-gray-600">Define what each role can access and perform</p>
        </div>
        <Button>
          <Shield className="h-4 w-4 mr-2" />
          Create Custom Role
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Roles List */}
        <Card>
          <CardHeader>
            <CardTitle>System Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roles.map((role) => (
                <div
                  key={role.role}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedRole === role.role 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedRole(role.role)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{role.name}</h4>
                    <Badge variant="outline" className={getRoleColor(role.role)}>
                      {role.userCount}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Matrix */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Permissions for {roles.find(r => r.role === selectedRole)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {permissions.map((category) => (
                  <div key={category.category}>
                    <h4 className="font-medium text-gray-900 mb-3">{category.category}</h4>
                    <div className="space-y-3">
                      {category.permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-sm">{permission.name}</h5>
                              {hasPermission(permission.id) && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                  Enabled
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">{permission.description}</p>
                          </div>
                          <Switch
                            checked={hasPermission(permission.id)}
                            className="ml-4"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Permission Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {roles.map((role) => {
              const permissionCount = rolePermissions[role.role].length;
              const totalPermissions = permissions.reduce((sum, cat) => sum + cat.permissions.length, 0);
              const percentage = Math.round((permissionCount / totalPermissions) * 100);
              
              return (
                <div key={role.role} className="text-center p-4 border rounded-lg">
                  <Badge variant="outline" className={`${getRoleColor(role.role)} mb-2`}>
                    {role.name}
                  </Badge>
                  <div className="text-2xl font-bold">{permissionCount}</div>
                  <div className="text-sm text-gray-600">{percentage}% of permissions</div>
                  <div className="text-xs text-gray-500">{role.userCount} users</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
