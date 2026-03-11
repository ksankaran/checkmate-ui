"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Check, Settings2 } from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { useSidebarContext } from "@/context/SidebarContext";
import { useEnvironment } from "@/context/EnvironmentContext";
import { envBadgeColor } from "@/types/environment";
import { useFeatures } from "@/hooks/useFeatures";
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
  const params = useParams();
  const { isCollapsed } = useSidebarContext();
  const { environments, activeEnv, setActiveEnv } = useEnvironment();
  const { features } = useFeatures();
  const breadcrumbs = generateBreadcrumbs(pathname);

  const [showEnvDropdown, setShowEnvDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const projectId = params?.id as string | undefined;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowEnvDropdown(false);
      }
    }
    if (showEnvDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEnvDropdown]);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14 px-6 transition-all duration-300",
        isCollapsed ? "ml-[60px]" : "ml-[240px]",
      )}
    >
      {/* Left: Breadcrumbs + Environment Switcher */}
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

        {/* Environment Switcher — only shown when inside a project and multiple_environments is enabled */}
        {projectId && features.multiple_environments && (
          <>
            <span className="text-muted-foreground/30 text-sm select-none">|</span>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowEnvDropdown((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border hover:bg-muted/50 transition-colors text-sm"
              >
                <span className="text-xs text-muted-foreground">Environment</span>
                {activeEnv ? (
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                      envBadgeColor(activeEnv.name),
                    )}
                  >
                    {activeEnv.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">No Environment</span>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {showEnvDropdown && (
                <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-border bg-popover shadow-lg z-50 py-1">
                  {environments.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No environments configured
                    </p>
                  ) : (
                    environments.map((env) => (
                      <button
                        key={env.id}
                        onClick={() => {
                          setActiveEnv(env);
                          setShowEnvDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-sm"
                      >
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                            envBadgeColor(env.name),
                          )}
                        >
                          {env.name}
                        </span>
                        {activeEnv?.id === env.id && (
                          <Check className="h-3 w-3 ml-auto text-primary" />
                        )}
                      </button>
                    ))
                  )}
                  <div className="border-t border-border mt-1 pt-1">
                    <Link
                      href={`/projects/${projectId}/settings?tab=environments`}
                      onClick={() => setShowEnvDropdown(false)}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-xs text-muted-foreground"
                    >
                      <Settings2 className="h-3 w-3" />
                      Manage Environments
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
