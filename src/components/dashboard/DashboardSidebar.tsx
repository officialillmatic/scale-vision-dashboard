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
import { Phone, CreditCard, BookOpen, Crown, Sparkles, Zap } from "lucide-react";
import { useRole } from "@/hooks/useRole.ts";

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
    hiddenForSuperAdmin: true,
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

// Super admin only navigation items
const superAdminNavigationItems = [
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
    href: "/admin/credits",
    icon: () => <CreditCard className="h-6 w-6" />,
    label: "Admin Credits",
  }
];

export function DashboardSidebar() {
  const location = useLocation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { can } = useRole();
  
  const collapsed = state === "collapsed";

  // Filtrar items basado en permisos de super admin
  const filteredNavigationItems = navigationItems.filter(item => {
    // Si el item debe estar oculto para super admin Y el usuario tiene acceso de super admin, ocultarlo
    if (item.hiddenForSuperAdmin && can.superAdminAccess) {
      return false;
    }
    return true;
  });

  // Build navigation items based on user permissions
  const allNavigationItems = [
    ...filteredNavigationItems,
    // Add super admin items only if user has super admin access
    ...(can.superAdminAccess ? superAdminNavigationItems : [])
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
        // Fondo completamente sólido sin transparencia
        "bg-white border-r border-gray-200",
        // Desktop styling - sombra pronunciada para separación visual
        "shadow-xl",
        // Mobile-specific improvements - fondo completamente sólido con sombra más pronunciada
        "data-[mobile=true]:bg-white data-[mobile=true]:shadow-2xl data-[mobile=true]:border-r data-[mobile=true]:border-gray-200",
        // Width adjustments
        "w-64 sm:w-56"
      )}
    >
      <div className={cn(
        "flex items-center justify-between border-b border-gray-200",
        "p-4 sm:p-6",
        // Fondo sólido para el header también
        "bg-white"
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

      <SidebarContent className="overflow-auto px-3 py-4 sm:px-4 sm:py-6 bg-white">
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
                      // Estilo normal para todos los items
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

        {/* 🎨 NUEVO BOTÓN PLANS & PRICING CON DISEÑO ATRACTIVO */}
        <div className="mt-6 px-3 sm:px-4 bg-white">
          <div className="relative group">
            {/* Badge "Most Popular" flotante */}
            {!collapsed && (
              <div className="absolute -top-2 -right-2 z-10">
                <Badge 
                  className={cn(
                    "bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold",
                    "px-3 py-1 rounded-full shadow-lg animate-pulse",
                    "border-2 border-white"
                  )}
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            
            {/* Botón principal con animaciones */}
            <Button
              variant="outline"
              className={cn(
                "w-full relative overflow-hidden transition-all duration-300 group",
                // Gradiente de fondo atractivo
                "bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600",
                "hover:from-purple-700 hover:via-purple-800 hover:to-pink-700",
                // Borde y sombra
                "border-0 shadow-lg hover:shadow-xl",
                // Transform y scale effects
                "hover:scale-[1.02] active:scale-[0.98]",
                // Altura y padding
                "py-4 px-4 min-h-[56px] h-auto",
                collapsed && "px-3 min-h-[48px] justify-center"
              )}
              asChild
            >
              <Link 
                to="/pricing" 
                onClick={handleMobileNavClick} 
                className={cn(
                  "flex items-center justify-start text-white font-bold relative z-10",
                  collapsed && "justify-center"
                )}
              >
                {/* Efecto de brillo animado */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 group-hover:animate-pulse" />
                
                {/* Icono principal */}
                <div className={cn(
                  "relative z-20 flex-shrink-0 transition-all duration-300",
                  "group-hover:rotate-12 group-hover:scale-110"
                )}>
                  <div className="relative">
                    <Crown className="h-5 w-5 text-yellow-300 drop-shadow-sm" />
                    {/* Sparkles alrededor del icono */}
                    <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-200 animate-pulse" />
                  </div>
                </div>
                
                {/* Texto */}
                {!collapsed && (
                  <div className="ml-3 relative z-20">
                    <span className="text-sm font-bold leading-tight text-white drop-shadow-sm">
                      Plans & Pricing
                    </span>
                    <div className="text-xs text-purple-100 opacity-90 mt-0.5">
                      Upgrade now!
                    </div>
                  </div>
                )}
                
                {/* Icono de flecha animada */}
                {!collapsed && (
                  <div className="ml-auto relative z-20 transition-transform duration-300 group-hover:translate-x-1">
                    <Zap className="h-4 w-4 text-yellow-300 animate-pulse" />
                  </div>
                )}
                
                {/* Efecto de pulso en el fondo */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-lg animate-pulse opacity-50" />
              </Link>
            </Button>
            
            {/* Efecto de glow alrededor del botón */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-300 -z-10" />
          </div>
        </div>

        <div className="mt-auto border-t border-gray-200 pt-4 sm:pt-6 bg-white">
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
