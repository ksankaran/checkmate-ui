"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder, InboxIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TestFolder } from "@/types";

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: TestFolder[];
  currentFolderId: number | null;
  onMove: (folderId: number | null) => void;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  folders,
  currentFolderId,
  onMove,
}: MoveToFolderDialogProps) {
  const [selected, setSelected] = useState<number | null>(currentFolderId);

  // Only show regular folders (can't move into smart folders)
  const regularFolders = folders.filter((f) => f.folder_type === "regular");
  const rootFolders = regularFolders.filter((f) => f.parent_id === null);

  const childrenMap = new Map<number, TestFolder[]>();
  for (const f of regularFolders) {
    if (f.parent_id !== null) {
      const existing = childrenMap.get(f.parent_id) || [];
      existing.push(f);
      childrenMap.set(f.parent_id, existing);
    }
  }

  function handleSubmit() {
    onMove(selected);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 py-2 max-h-[300px] overflow-y-auto">
          {/* Unassigned Scenarios (root) */}
          <button
            onClick={() => setSelected(null)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              "hover:bg-accent/50",
              selected === null && "bg-accent text-accent-foreground font-medium",
            )}
          >
            <InboxIcon className="h-4 w-4" />
            Unassigned Scenarios
          </button>

          {/* Regular folders */}
          {rootFolders.map((folder) => {
            const children = childrenMap.get(folder.id) || [];
            return (
              <div key={folder.id}>
                <button
                  onClick={() => setSelected(folder.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-accent/50",
                    selected === folder.id && "bg-accent text-accent-foreground font-medium",
                  )}
                >
                  <Folder className="h-4 w-4" />
                  {folder.name}
                </button>
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelected(child.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 pl-8 rounded-md text-sm transition-colors",
                      "hover:bg-accent/50",
                      selected === child.id && "bg-accent text-accent-foreground font-medium",
                    )}
                  >
                    <Folder className="h-4 w-4" />
                    {child.name}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={selected === currentFolderId}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
