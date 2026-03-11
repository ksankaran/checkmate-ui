"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Play,
  BarChart3,
  Database,
  Settings,
  MessageSquare,
  FlaskConical,
  Calendar,
  KeyRound,
  Video,
  Wrench,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebarContext } from "@/context/SidebarContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  matchPaths?: string[];
}

export function SidebarNav() {
  const pathname = usePathname();
  const { activeProjectId, isCollapsed } = useSidebarContext();

  const globalItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
  ];

  const projectItems: NavItem[] = activeProjectId
    ? [
        {
          label: "Dashboard",
          href: `/projects/${activeProjectId}/dashboard`,
          icon: <BarChart3 className="h-4 w-4" />,
          matchPaths: [`/projects/${activeProjectId}/dashboard`],
        },
        {
          label: "Features",
          href: `/projects/${activeProjectId}/test-cases`,
          icon: <FileText className="h-4 w-4" />,
          matchPaths: [`/projects/${activeProjectId}/test-cases`],
        },
        {
          label: "Executions",
          href: `/projects/${activeProjectId}/runs`,
          icon: <Play className="h-4 w-4" />,
        },
        {
          label: "Chat",
          href: `/projects/${activeProjectId}/chat`,
          icon: <MessageSquare className="h-4 w-4" />,
        },
        {
          label: "Builder",
          href: `/projects/${activeProjectId}/build`,
          icon: <FlaskConical className="h-4 w-4" />,
        },
        {
          label: "Record",
          href: `/projects/${activeProjectId}/record`,
          icon: <Video className="h-4 w-4" />,
        },
        {
          label: "Fixtures",
          href: `/projects/${activeProjectId}/fixtures`,
          icon: <Wrench className="h-4 w-4" />,
        },
        {
          label: "Vault",
          href: `/projects/${activeProjectId}/vault`,
          icon: <KeyRound className="h-4 w-4" />,
        },
        {
          label: "Test Data",
          href: `/projects/${activeProjectId}/test-data`,
          icon: <Database className="h-4 w-4" />,
        },
        {
          label: "Schedules",
          href: `/projects/${activeProjectId}/scheduled-runs`,
          icon: <Calendar className="h-4 w-4" />,
        },
        {
          label: "Settings",
          href: `/projects/${activeProjectId}/settings`,
          icon: <Settings className="h-4 w-4" />,
        },
      ]
    : [];

  function isActive(item: NavItem) {
    if (item.matchPaths) {
      return item.matchPaths.some((p) => pathname === p);
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex flex-col gap-1 px-2">
        {globalItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} collapsed={isCollapsed} />
        ))}

        {activeProjectId && (
          <>
            <div className="my-2 border-t border-sidebar-border" />
            {projectItems.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item)} collapsed={isCollapsed} />
            ))}
          </>
        )}
      </nav>
    </TooltipProvider>
  );
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const content = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      {item.icon}
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
