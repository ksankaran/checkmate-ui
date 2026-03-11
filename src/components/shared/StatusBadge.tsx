"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, RUN_STATUS_COLORS } from "@/lib/constants";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Ban,
  SkipForward,
} from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

const runStatusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  running: <Loader2 className="h-3 w-3 animate-spin" />,
  passed: <CheckCircle className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
  cancelled: <Ban className="h-3 w-3" />,
  skipped: <SkipForward className="h-3 w-3" />,
};

export function RunStatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const colorClass = RUN_STATUS_COLORS[status] || "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-medium", colorClass, className)}>
      {showIcon && runStatusIcons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function TestCaseStatusBadge({ status, className }: Omit<StatusBadgeProps, "showIcon">) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <Badge
      variant="secondary"
      className={cn("text-xs font-medium", colorClass, className)}
    >
      {status === "in_review" ? "In Review" : status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/15 text-red-600 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  medium: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  low: "bg-green-500/15 text-green-600 dark:text-green-400",
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const colorClass = priorityColors[priority] || priorityColors.medium;
  return (
    <Badge
      variant="secondary"
      className={cn("text-xs font-medium", colorClass, className)}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}
