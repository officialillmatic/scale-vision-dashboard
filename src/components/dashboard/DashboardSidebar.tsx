
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, CreditCard } from "lucide-react";
import { useRole } from "@/hooks/useRole";

const navigationItems = [
  {
    href: "/dashboard",
    icon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
    label: "Dashboard",
  },
  {
    href: "/calls-simple",
    icon: () => <Phone className="h-6 w-6" />,
    label: "My Calls",
  },
  {
    href: "/analytics",
    icon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    label: "Analytics",
  },
  {
    href: "/team",
    icon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: "Team",
  },
  {
    href: "/settings",
    icon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    label: "Settings",
  },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { can } = useRole();
  
  const collapsed = state === "collapsed";

  // Add Admin Credits to navigation for super admins
  const allNavigationItems = [
    ...navigationItems,
    ...(can.superAdminAccess ? [{
      href: "/admin/credits",
      icon: () => <CreditCard className="h-6 w-6" />,
      label: "Admin Credits",
    }] : [])
  ];

  // Handle navigation item click on mobile
  const handleMobileNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className={cn(
        "border-r border-gray-200/60",
        // Desktop styling
        "bg-white/95 backdrop-blur-sm",
        // Mobile-specific improvements
        "data-[mobile=true]:bg-white data-[mobile=true]:shadow-xl data-[mobile=true]:backdrop-blur-none",
        // Width adjustments
        "w-64 sm:w-56"
      )}
    >
      <div className={cn(
        "flex items-center justify-between border-b border-gray-200/60",
        "p-4 sm:p-6"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-2">
            <div className="relative">
              <img 
                src="/lovable-uploads/3cab64ed-2b97-4974-9c76-8ae4f310234d.png" 
                alt="Dr. Scale Logo" 
                className="h-10 w-auto sm:h-8"
              />
              <div className="absolute -top-1 -right-1">
                <Badge variant="secondary" className="bg-brand-green/10 text-brand-green border-brand-green/20 text-xs px-2 py-1 sm:px-1.5 sm:py-0.5">
                  AI
                </Badge>
              </div>
            </div>
            <div>
              <span className="font-bold text-gray-900 text-lg sm:text-base">
                Dr. Scale
              </span>
              <p className="text-gray-500 font-medium text-sm sm:text-xs">
                AI Call Analytics
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto relative">
            <img 
              src="/lovable-uploads/3cab64ed-2b97-4974-9c76-8ae4f310234d.png" 
              alt="Dr. Scale Logo" 
              className="h-10 w-auto sm:h-8"
            />
            <div className="absolute -top-1 -right-1">
              <Badge variant="secondary" className="bg-brand-green/10 text-brand-green border-brand-green/20 text-xs px-2 py-1 sm:px-1 sm:py-0.5">
                AI
              </Badge>
            </div>
          </div>
        )}
        <SidebarTrigger className={cn(
          "transition-opacity duration-200 hover:bg-gray-100 rounded-md",
          collapsed ? "hidden" : "ml-auto",
          "p-2 sm:p-1.5"
        )} />
      </div>

      <SidebarContent className="overflow-auto px-3 py-4 sm:px-4 sm:py-6">
        <SidebarGroup>
          <SidebarMenu className="space-y-3 sm:space-y-2">
            {allNavigationItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild>
                  <Link
                    to={item.href}
                    onClick={handleMobileNavClick}
                    className={cn(
                      "flex items-center rounded-xl w-full transition-all duration-200 group relative overflow-hidden font-medium",
                      // Mobile-friendly sizing and spacing
                      "py-3 px-4",
                      location.pathname === item.href || (item.href !== "/dashboard" && location.pathname.startsWith(item.href))
                        ? "bg-gradient-to-r from-brand-green/15 to-brand-green/5 text-brand-green font-semibold shadow-sm border border-brand-green/20" 
                        : "hover:bg-gray-100/80 text-gray-700 hover:text-gray-900"
                    )}
                  >
                    <div className={cn(
                      "transition-transform duration-200 flex-shrink-0",
                      location.pathname === item.href || (item.href !== "/dashboard" && location.pathname.startsWith(item.href))
                        ? "scale-110" 
                        : "group-hover:scale-105"
                    )}>
                      <item.icon />
                    </div>
                    {!collapsed && (
                      <span className="transition-all duration-200 ml-3 text-base sm:text-sm">
                        {item.label}
                      </span>
                    )}
                    {!collapsed && (location.pathname === item.href || (item.href !== "/dashboard" && location.pathname.startsWith(item.href))) && (
                      <div className="absolute right-3 w-3 h-3 sm:w-2 sm:h-2 bg-brand-green rounded-full shadow-sm"></div>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <div className="mt-auto border-t border-gray-200/60 pt-4 sm:pt-6">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full border-dashed justify-start hover:bg-gray-50 hover:border-gray-300 transition-all duration-200",
              "py-3 px-4 text-base sm:py-2 sm:px-3 sm:text-sm",
              collapsed && "px-2"
            )}
            asChild
          >
            <Link to="/support" onClick={handleMobileNavClick} className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-4 sm:w-4">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6" />
                <path d="m15.4 2.9 4.2 4.2m-7.4 0L7.5 7.1" />
                <path d="m21 12-6 0m-6 0-6 0" />
                <path d="m16.9 16.9-4.2-4.2m0-7.4-4.2-4.2" />
              </svg>
              {!collapsed && (
                <span className="font-medium ml-3 sm:ml-2">
                  Help & Support
                </span>
              )}
            </Link>
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
