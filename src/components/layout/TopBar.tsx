"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { useSidebarContext } from "@/context/SidebarContext";
import { cn } from "@/lib/utils";

function generateBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;

    // Skip numeric IDs in breadcrumb labels (show parent context instead)
    if (/^\d+$/.test(segment)) continue;

    const labelMap: Record<string, string> = {
      projects: "Projects",
      "test-cases": "Features",
      runs: "Executions",
      settings: "Settings",
      chat: "Chat",
      build: "Builder",
      new: "New",
      edit: "Edit",
      "scheduled-runs": "Schedules",
      record: "Recorder",
    };

    crumbs.push({
      label: labelMap[segment] || segment,
      href: currentPath,
    });
  }

  return crumbs;
}

export function TopBar() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebarContext();
  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14 px-6 transition-all duration-300",
        isCollapsed ? "ml-[60px]" : "ml-[240px]",
      )}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/40">/</span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-foreground font-medium">{crumb.label}</span>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
          {breadcrumbs.length === 0 && (
            <span className="text-foreground font-medium">Dashboard</span>
          )}
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
