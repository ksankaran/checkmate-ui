"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { SidebarProvider, useSidebarContext } from "@/context/SidebarContext";
import { EnvironmentProvider, useEnvironment } from "@/context/EnvironmentContext";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const { setActiveProjectId, isCollapsed } = useSidebarContext();
  const { loadEnvironments } = useEnvironment();

  // Sync active project from URL and load its environments
  useEffect(() => {
    const id = params?.id;
    if (id && typeof id === "string") {
      const projectId = parseInt(id, 10);
      setActiveProjectId(projectId);
      loadEnvironments(projectId);
    }
  }, [params?.id, setActiveProjectId, loadEnvironments]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopBar />
      <main
        className={cn(
          "transition-all duration-300 min-h-[calc(100vh-3.5rem)]",
          isCollapsed ? "ml-[60px]" : "ml-[240px]",
        )}
      >
        {children}
      </main>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <EnvironmentProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </EnvironmentProvider>
    </SidebarProvider>
  );
}
