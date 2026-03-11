"use client";

import { PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarContext } from "@/context/SidebarContext";
import { SidebarProjectSwitcher } from "./SidebarProjectSwitcher";
import { SidebarNav } from "./SidebarNav";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebarContext();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        isCollapsed ? "w-[60px]" : "w-[240px]",
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2 border-b border-sidebar-border px-3 h-14 shrink-0",
        isCollapsed && "justify-center px-2",
      )}>
        <img src="/checkmate-icon.png" alt="Checkmate" className="h-7 w-7 shrink-0" />
        {!isCollapsed && (
          <span className="text-lg font-bold text-sidebar-foreground">Checkmate</span>
        )}
      </div>

      {/* Project Switcher */}
      <div className="px-2 py-3 border-b border-sidebar-border shrink-0">
        <SidebarProjectSwitcher />
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav />
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className={cn(
            "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            isCollapsed && "px-2",
          )}
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
