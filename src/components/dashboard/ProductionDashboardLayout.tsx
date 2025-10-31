import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Phone,
  BarChart3,
  Users,
  Settings,
  Activity
} from "lucide-react";

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  active?: boolean;
}

interface ProductionDashboardLayoutProps {
  children: React.ReactNode;
}

export function ProductionDashboardLayout({ children }: ProductionDashboardLayoutProps) {
  const location = useLocation();

  const sidebarItems: SidebarItem[] = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/dashboard",
      active: location.pathname === "/dashboard"
    },
    {
      label: "My Calls",
      icon: <Phone className="h-5 w-5" />,
      path: "/calls-simple",
      active: location.pathname === "/calls-simple"
    },
    {
      label: "Analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      path: "/analytics",
      active: location.pathname === "/analytics"
    },
    {
      label: "Team",
      icon: <Users className="h-5 w-5" />,
      path: "/team",
      active: location.pathname === "/team"
    },
    {
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
      path: "/settings",
      active: location.pathname === "/settings"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        {/* Logo/Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
            <Activity className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Dr. Scale</h1>
            <p className="text-xs text-gray-500">AI Call Analytics</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                item.active
                  ? "bg-green-100 text-green-700 border-l-4 border-green-500"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <span className={cn(
                "transition-colors",
                item.active ? "text-green-600" : "text-gray-400"
              )}>
                {item.icon}
              </span>
              {item.label}
              {item.active && (
                <div className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>System Active</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}