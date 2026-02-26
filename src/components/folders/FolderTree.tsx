"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Sparkles,
  FileText,
  InboxIcon,
  Plus,
  Play,
  Pencil,
  Trash2,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TestFolder, TestCase } from "@/types";

// Selection types for the tree
export type FolderSelection =
  | { type: "all" }
  | { type: "unfiled" }
  | { type: "folder"; folderId: number };

interface FolderTreeProps {
  folders: TestFolder[];
  testCases: TestCase[];
  selection: FolderSelection;
  onSelect: (selection: FolderSelection) => void;
  onNewFolder: (parentId?: number) => void;
  onEditFolder: (folder: TestFolder) => void;
  onDeleteFolder: (folder: TestFolder) => void;
  onRunFolder: (folder: TestFolder) => void;
  onDropTestCase?: (testCaseId: number, folderId: number | null) => void;
}

export function FolderTree({
  folders,
  testCases,
  selection,
  onSelect,
  onNewFolder,
  onEditFolder,
  onDeleteFolder,
  onRunFolder,
  onDropTestCase,
}: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Build tree structure
  const rootFolders = folders.filter((f) => f.parent_id === null);
  const childrenMap = new Map<number, TestFolder[]>();
  for (const f of folders) {
    if (f.parent_id !== null) {
      const existing = childrenMap.get(f.parent_id) || [];
      existing.push(f);
      childrenMap.set(f.parent_id, existing);
    }
  }

  // Count test cases per folder
  const folderCounts = new Map<number, number>();
  for (const tc of testCases) {
    if (tc.folder_id !== null) {
      folderCounts.set(tc.folder_id, (folderCounts.get(tc.folder_id) || 0) + 1);
    }
  }

  // Count including descendants
  function getTotalCount(folderId: number, folder: TestFolder): number {
    if (folder.folder_type === "smart") {
      return getSmartFolderCount(folder);
    }
    let count = folderCounts.get(folderId) || 0;
    const children = childrenMap.get(folderId) || [];
    for (const child of children) {
      count += folderCounts.get(child.id) || 0;
    }
    return count;
  }

  function getSmartFolderCount(folder: TestFolder): number {
    if (!folder.smart_criteria) return 0;
    try {
      const criteria = JSON.parse(folder.smart_criteria);
      const filterTags: string[] = (criteria.tags || []).map((t: string) => t.toLowerCase());
      const filterStatuses: string[] = criteria.statuses || [];
      return testCases.filter((tc) => {
        if (filterStatuses.length > 0 && !filterStatuses.includes(tc.status)) {
          return false;
        }
        if (filterTags.length > 0) {
          const tcTags: string[] = tc.tags ? JSON.parse(tc.tags) : [];
          const tcTagsLower = tcTags.map((t: string) => t.toLowerCase());
          return filterTags.some((t: string) => tcTagsLower.includes(t));
        }
        return true;
      }).length;
    } catch {
      return 0;
    }
  }

  const unfiledCount = testCases.filter((tc) => tc.folder_id === null).length;

  function toggleExpand(folderId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }

  const isSelected = (sel: FolderSelection) => {
    if (sel.type === "all" && selection.type === "all") return true;
    if (sel.type === "unfiled" && selection.type === "unfiled") return true;
    if (
      sel.type === "folder" &&
      selection.type === "folder" &&
      sel.folderId === selection.folderId
    )
      return true;
    return false;
  };

  // --- Drag-and-drop handlers ---
  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget(targetId);
  }

  function handleDragLeave() {
    setDragOverTarget(null);
  }

  function handleDrop(e: React.DragEvent, folderId: number | null) {
    e.preventDefault();
    setDragOverTarget(null);
    const testCaseId = parseInt(e.dataTransfer.getData("text/x-test-case-id"), 10);
    if (!isNaN(testCaseId) && onDropTestCase) {
      onDropTestCase(testCaseId, folderId);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => onNewFolder()}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Feature
        </Button>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {/* All Scenarios */}
          <TreeItem
            icon={<FileText className="h-4 w-4" />}
            label="All Scenarios"
            count={testCases.length}
            selected={isSelected({ type: "all" })}
            onClick={() => onSelect({ type: "all" })}
          />

          {/* Unassigned Scenarios — also a drop target */}
          <TreeItem
            icon={<InboxIcon className="h-4 w-4" />}
            label="Unassigned Scenarios"
            count={unfiledCount}
            selected={isSelected({ type: "unfiled" })}
            onClick={() => onSelect({ type: "unfiled" })}
            isDragOver={dragOverTarget === "unfiled"}
            onDragOver={(e) => handleDragOver(e, "unfiled")}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
          />

          {/* Divider */}
          <div className="h-px bg-border my-2" />

          {/* Folders */}
          {rootFolders.map((folder) => {
            const children = childrenMap.get(folder.id) || [];
            const hasChildren = children.length > 0;
            const isExpanded = expanded.has(folder.id);

            return (
              <div key={folder.id}>
                <FolderItem
                  folder={folder}
                  count={getTotalCount(folder.id, folder)}
                  selected={isSelected({ type: "folder", folderId: folder.id })}
                  hasChildren={hasChildren}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpand(folder.id)}
                  onClick={() => onSelect({ type: "folder", folderId: folder.id })}
                  onNewSubfolder={
                    folder.folder_type === "regular"
                      ? () => onNewFolder(folder.id)
                      : undefined
                  }
                  onEdit={() => onEditFolder(folder)}
                  onDelete={() => onDeleteFolder(folder)}
                  onRun={() => onRunFolder(folder)}
                  depth={0}
                  isDragOver={dragOverTarget === `folder-${folder.id}`}
                  onDragOver={(e) => handleDragOver(e, `folder-${folder.id}`)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                />
                {hasChildren && isExpanded && (
                  <div>
                    {children.map((child) => (
                      <FolderItem
                        key={child.id}
                        folder={child}
                        count={folderCounts.get(child.id) || 0}
                        selected={isSelected({
                          type: "folder",
                          folderId: child.id,
                        })}
                        hasChildren={false}
                        isExpanded={false}
                        onToggle={() => {}}
                        onClick={() =>
                          onSelect({ type: "folder", folderId: child.id })
                        }
                        onEdit={() => onEditFolder(child)}
                        onDelete={() => onDeleteFolder(child)}
                        onRun={() => onRunFolder(child)}
                        depth={1}
                        isDragOver={dragOverTarget === `folder-${child.id}`}
                        onDragOver={(e) => handleDragOver(e, `folder-${child.id}`)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, child.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// --- Tree Item (for All / Unfiled) ---

function TreeItem({
  icon,
  label,
  count,
  selected,
  onClick,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
        "hover:bg-accent/50",
        selected && "bg-accent text-accent-foreground font-medium",
        isDragOver && "ring-2 ring-primary bg-primary/10",
      )}
    >
      {icon}
      <span className="flex-1 text-left truncate">{label}</span>
      <Badge variant="secondary" className="text-xs h-5 min-w-[20px] justify-center">
        {count}
      </Badge>
    </button>
  );
}

// --- Folder Item ---

function FolderItem({
  folder,
  count,
  selected,
  hasChildren,
  isExpanded,
  onToggle,
  onClick,
  onNewSubfolder,
  onEdit,
  onDelete,
  onRun,
  depth,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  folder: TestFolder;
  count: number;
  selected: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: () => void;
  onNewSubfolder?: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onRun: () => void;
  depth: number;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const isSmart = folder.folder_type === "smart";

  const FolderIcon = isSmart
    ? Sparkles
    : isExpanded
      ? FolderOpen
      : Folder;

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-md text-sm transition-colors",
        isSmart ? "hover:bg-amber-50 dark:hover:bg-amber-950/30" : "hover:bg-accent/50",
        selected && !isSmart && "bg-accent text-accent-foreground font-medium",
        selected && isSmart && "bg-amber-100/70 dark:bg-amber-900/30 font-medium",
        isDragOver && !isSmart && "ring-2 ring-primary bg-primary/10",
      )}
      style={{ paddingLeft: `${depth * 16 + 4}px` }}
      onDragOver={!isSmart ? onDragOver : undefined}
      onDragLeave={!isSmart ? onDragLeave : undefined}
      onDrop={!isSmart ? onDrop : undefined}
    >
      {/* Expand/collapse toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "p-0.5 rounded hover:bg-accent",
          !hasChildren && "invisible",
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Main clickable area */}
      <button
        onClick={onClick}
        className="flex-1 flex items-center gap-2 py-1.5 pr-1 min-w-0"
      >
        <FolderIcon className={cn("h-4 w-4 shrink-0", isSmart && "text-amber-500")} />
        <span className={cn("truncate", isSmart && "text-amber-600 dark:text-amber-400")}>
          {folder.name}
        </span>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs h-5 min-w-[20px] justify-center ml-auto",
            isSmart && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
          )}
        >
          {count}
        </Badge>
      </button>

      {/* Context menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity">
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onRun}>
            <Play className="h-4 w-4 mr-2" />
            Run All Tests
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {onNewSubfolder && (
            <DropdownMenuItem onClick={onNewSubfolder}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Subfolder
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
