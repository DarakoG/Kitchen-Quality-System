"use client";

import { ViewType, UserRole } from "@/components/layout/AppShell";
import { hasPermission } from "@/store/auth-store";
import { Permissions } from "@/store/permissions-store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardCheck,
  AlertTriangle,
  Users,
  Building2,
  Store,
  Bell,
  FileText,
  ChevronLeft,
  ChefHat,
  FolderOpen,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOpen: boolean;
  onToggle: () => void;
  userRole: UserRole;
  permissions: Permissions | null;
}

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  minRole: UserRole;
  permissionKey?: string; // Key to check in permissions
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    minRole: "AUDITOR",
    permissionKey: "canViewDashboard",
  },
  {
    id: "categories",
    label: "Categories",
    icon: <FolderOpen className="h-5 w-5" />,
    minRole: "SUPERVISOR",
    permissionKey: "canViewCategories",
  },
  {
    id: "dishes",
    label: "Dishes",
    icon: <UtensilsCrossed className="h-5 w-5" />,
    minRole: "AUDITOR",
    permissionKey: "canViewDishes",
  },
  {
    id: "reports",
    label: "Quality Reports",
    icon: <ClipboardCheck className="h-5 w-5" />,
    minRole: "AUDITOR",
    permissionKey: "canViewReports",
  },
  {
    id: "incidents",
    label: "Incidents",
    icon: <AlertTriangle className="h-5 w-5" />,
    minRole: "AUDITOR",
    permissionKey: "canViewIncidents",
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: <Bell className="h-5 w-5" />,
    minRole: "SUPERVISOR",
    permissionKey: "canViewAlerts",
  },
  {
    id: "users",
    label: "Users",
    icon: <Users className="h-5 w-5" />,
    minRole: "COMPANY_ADMIN",
    permissionKey: "canViewUsers",
  },
  {
    id: "branches",
    label: "Branches",
    icon: <Store className="h-5 w-5" />,
    minRole: "COMPANY_ADMIN",
    permissionKey: "canViewBranches",
  },
  {
    id: "companies",
    label: "Companies",
    icon: <Building2 className="h-5 w-5" />,
    minRole: "SUPER_ADMIN",
    permissionKey: "canViewCompanies",
  },
  {
    id: "permissions",
    label: "Permissions",
    icon: <Shield className="h-5 w-5" />,
    minRole: "COMPANY_ADMIN",
    permissionKey: "canViewPermissions",
  },
  {
    id: "audit",
    label: "Audit Log",
    icon: <FileText className="h-5 w-5" />,
    minRole: "BRANCH_MANAGER",
    permissionKey: "canViewAudit",
  },
];

export function Sidebar({
  currentView,
  onViewChange,
  isOpen,
  onToggle,
  userRole,
  permissions,
}: SidebarProps) {
  const canAccessItem = (item: NavItem): boolean => {
    // First check role hierarchy
    if (!hasPermission(userRole, item.minRole)) {
      return false;
    }

    // Then check specific permission if defined
    if (item.permissionKey && permissions) {
      return (
        permissions[item.permissionKey as keyof typeof permissions] === true
      );
    }

    return true;
  };

  const visibleItems = navItems.filter(canAccessItem);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "border-r bg-card transition-all duration-300 flex flex-col",
          isOpen ? "w-64" : "w-16",
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ChefHat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            {isOpen && (
              <div>
                <h1 className="font-bold text-lg">KQS</h1>
                <p className="text-xs text-muted-foreground">Quality System</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                !isOpen && "rotate-180",
              )}
            />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {visibleItems.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentView === item.id ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      !isOpen && "justify-center px-2",
                    )}
                    onClick={() => onViewChange(item.id)}
                  >
                    {item.icon}
                    {isOpen && <span>{item.label}</span>}
                  </Button>
                </TooltipTrigger>
                {!isOpen && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t">
          {isOpen && (
            <p className="text-xs text-muted-foreground text-center">
              Kitchen Quality System v1.0
            </p>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
