"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Plus, FolderOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebarContext } from "@/context/SidebarContext";
import type { Project } from "@/types";
import { API_URL } from "@/lib/api";

export function SidebarProjectSwitcher() {
  const router = useRouter();
  const { activeProjectId, setActiveProjectId, isCollapsed } = useSidebarContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch(`${API_URL}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const activeProject = projects.find((p) => p.id === activeProjectId);

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
            <FolderOpen className="h-5 w-5 text-sidebar-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-56">
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => {
                setActiveProjectId(project.id);
                router.push(`/projects/${project.id}`);
              }}
              className={activeProjectId === project.id ? "bg-accent" : ""}
            >
              {project.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/projects/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left">
          <FolderOpen className="h-4 w-4 shrink-0 text-sidebar-primary" />
          <span className="flex-1 truncate text-sm font-medium text-sidebar-foreground">
            {loading ? "Loading..." : activeProject?.name || "Select Project"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-56">
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => {
              setActiveProjectId(project.id);
              router.push(`/projects/${project.id}`);
            }}
            className={activeProjectId === project.id ? "bg-accent" : ""}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            <span className="truncate">{project.name}</span>
          </DropdownMenuItem>
        ))}
        {projects.length === 0 && !loading && (
          <DropdownMenuItem disabled>No projects yet</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/projects/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
