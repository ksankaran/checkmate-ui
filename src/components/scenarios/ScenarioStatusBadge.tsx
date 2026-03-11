"use client";

import {
  FileEdit,
  CheckCircle2,
  Eye,
  ShieldCheck,
  Archive,
  FileText,
  SkipForward,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TestCaseStatus } from "@/types";

interface ScenarioStatusBadgeProps {
  status: TestCaseStatus;
  className?: string;
}

const statusConfig: Record<
  string,
  { icon: React.ReactNode; label: string; className: string }
> = {
  draft: {
    icon: <FileEdit className="h-3 w-3" />,
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  active: {
    icon: <FileText className="h-3 w-3" />,
    label: "Active",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  ready: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: "Ready",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  in_review: {
    icon: <Eye className="h-3 w-3" />,
    label: "In Review",
    className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  },
  approved: {
    icon: <ShieldCheck className="h-3 w-3" />,
    label: "Approved",
    className: "bg-green-500/15 text-green-600 dark:text-green-400",
  },
  skipped: {
    icon: <SkipForward className="h-3 w-3" />,
    label: "Skipped",
    className: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  archived: {
    icon: <Archive className="h-3 w-3" />,
    label: "Archived",
    className: "bg-muted text-muted-foreground",
  },
};

export function ScenarioStatusBadge({ status, className }: ScenarioStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 text-xs font-medium", config.className, className)}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
