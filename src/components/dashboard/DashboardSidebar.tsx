import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  CreditCard,
  MessageSquare,
  Phone,
  FileText,
  HelpCircle,
  Calendar,
  Target,
  TrendingUp,
  Database,
  Shield,
  Globe,
  Zap,
  Brain,
  Headphones
} from 'lucide-react';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  children?: SidebarItem[];
}

const sidebarItems: SidebarItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />
  },
  {
    title: 'AI Voice Agents',
    href: '/agents',
    icon: <Brain className="h-5 w-5" />,
    children: [
      {
        title: 'Inbound Agents',
        href: '/agents/inbound',
        icon: <Phone className="h-4 w-4" />
      },
      {
        title: 'Outbound Agents',
        href: '/agents/outbound',
        icon: <Headphones className="h-4 w-4" />
      }
    ]
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    children: [
      {
        title: 'Performance',
        href: '/analytics/performance',
        icon: <TrendingUp className="h-4 w-4" />
      },
      {
        title: 'Call Reports',
        href: '/analytics/reports',
        icon: <FileText className="h-4 w-4" />
      }
    ]
  },
  {
    title: 'Campaigns',
    href: '/campaigns',
    icon: <Target className="h-5 w-5" />
  },
  {
    title: 'Contacts',
    href: '/contacts',
    icon: <Users className="h-5 w-5" />
  },
  {
    title: 'Conversations',
    href: '/conversations',
    icon: <MessageSquare className="h-5 w-5" />
  },
  {
    title: 'Calendars',
    href: '/calendars',
    icon: <Calendar className="h-5 w-5" />
  },
  {
    title: 'Data & CRM',
    href: '/data',
    icon: <Database className="h-5 w-5" />
  },
  {
    title: 'Pricing Plans',
    href: '/pricing',
    icon: <Zap className="h-5 w-5" />
  },
  {
    title: 'Support',
    href: '/support',
    icon: <HelpCircle className="h-5 w-5" />
  }
];

const adminItems: SidebarItem[] = [
  {
    title: 'Payment Config',
    href: '/admin/payment-config',
    icon: <CreditCard className="h-5 w-5" />
  },
  {
    title: 'Security',
    href: '/admin/security',
    icon: <Shield className="h-5 w-5" />
  },
  {
    title: 'API Settings',
    href: '/admin/api',
    icon: <Globe className="h-5 w-5" />
  },
  {
    title: 'System Settings',
    href: '/admin/system',
    icon: <Settings className="h-5 w-5" />
  }
];

const DashboardSidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <div key={item.href} className="space-y-1">
        <Link
          to={item.href}
          className={cn(
            'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
            level > 0 && 'ml-4',
            active
              ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <span className={cn(
            'flex-shrink-0',
            active ? 'text-blue-600' : 'text-gray-400'
          )}>
            {item.icon}
          </span>
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
        </Link>
        
        {hasChildren && (
          <div className="space-y-1">
            {item.children!.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-gray-900">Dr. Scale</span>
          <span className="text-xs text-gray-500">AI Voice Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-6">
          
          {/* Main Navigation */}
          <div className="space-y-2">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Main Menu
            </h3>
            <nav className="space-y-1">
              {sidebarItems.map(item => renderSidebarItem(item))}
            </nav>
          </div>

          {/* Admin Section */}
          <div className="space-y-2">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Administration
            </h3>
            <nav className="space-y-1">
              {adminItems.map(item => renderSidebarItem(item))}
            </nav>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <Settings className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">Admin Panel</div>
            <div className="text-xs text-gray-500">v2.1.0</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { DashboardSidebar };
