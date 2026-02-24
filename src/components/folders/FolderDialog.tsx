"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { TestFolder } from "@/types";
import { parseSmartCriteria } from "@/types";

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: TestFolder | null; // If provided, edit mode
  parentId?: number | null;
  onSubmit: (data: {
    name: string;
    description: string;
    folder_type: "regular" | "smart";
    smart_criteria?: string;
    parent_id?: number | null;
  }) => void;
}

export function FolderDialog({
  open,
  onOpenChange,
  folder,
  parentId,
  onSubmit,
}: FolderDialogProps) {
  const isEdit = !!folder;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSmart, setIsSmart] = useState(false);
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setDescription(folder.description || "");
      setIsSmart(folder.folder_type === "smart");
      const criteria = parseSmartCriteria(folder.smart_criteria);
      setTags((criteria.tags || []).join(", "));
    } else {
      setName("");
      setDescription("");
      setIsSmart(false);
      setTags("");
    }
  }, [folder, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const data: {
      name: string;
      description: string;
      folder_type: "regular" | "smart";
      smart_criteria?: string;
      parent_id?: number | null;
    } = {
      name: name.trim(),
      description: description.trim(),
      folder_type: isSmart ? "smart" : "regular",
    };

    if (isSmart && tags.trim()) {
      data.smart_criteria = JSON.stringify({
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        statuses: ["ready", "approved", "active"],
      });
    }

    if (!isEdit && parentId !== undefined) {
      data.parent_id = parentId;
    }

    onSubmit(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Feature" : "New Feature"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="folder-name">Name</Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Authentication Tests"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="folder-desc">Description (optional)</Label>
              <Textarea
                id="folder-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What tests belong in this folder?"
                rows={2}
              />
            </div>

            {/* Smart folder toggle (only on create) */}
            {!isEdit && (
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smart-toggle" className="text-sm font-medium">
                    Smart Folder
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Auto-populates based on tags
                  </p>
                </div>
                <Switch
                  id="smart-toggle"
                  checked={isSmart}
                  onCheckedChange={setIsSmart}
                />
              </div>
            )}

            {/* Tag input (for smart folders) */}
            {isSmart && (
              <div className="grid gap-2">
                <Label htmlFor="folder-tags">Tags (comma-separated)</Label>
                <Input
                  id="folder-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. regression, smoke, login"
                />
                <p className="text-xs text-muted-foreground">
                  Test cases with any of these tags will appear in this folder
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
