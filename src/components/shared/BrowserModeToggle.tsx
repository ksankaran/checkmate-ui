"use client";

import { useState, useEffect } from "react";
import { Monitor, MonitorOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BrowserOption } from "@/types";

interface BrowserModeToggleProps {
  browsers: BrowserOption[];
  selectedBrowser: string;
  onBrowserChange: (browser: string) => void;
  className?: string;
}

export function BrowserModeToggle({
  browsers,
  selectedBrowser,
  onBrowserChange,
  className,
}: BrowserModeToggleProps) {
  const isHeadless = selectedBrowser.includes("headless");

  const toggleMode = () => {
    if (isHeadless) {
      // Switch to headed: remove -headless suffix
      const headed = selectedBrowser.replace("-headless", "");
      const match = browsers.find((b) => b.id === headed);
      if (match) {
        onBrowserChange(match.id);
        return;
      }
    } else {
      // Switch to headless: add -headless suffix
      const headless = selectedBrowser + "-headless";
      const match = browsers.find((b) => b.id === headless);
      if (match) {
        onBrowserChange(match.id);
        return;
      }
    }
  };

  const hasToggleOption = isHeadless
    ? browsers.some((b) => b.id === selectedBrowser.replace("-headless", ""))
    : browsers.some((b) => b.id === selectedBrowser + "-headless");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMode}
            disabled={!hasToggleOption}
            className={cn("gap-2", className)}
          >
            {isHeadless ? (
              <MonitorOff className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
            {isHeadless ? "Headless" : "Headed"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isHeadless
            ? "Running without browser UI — switch to headed to watch tests"
            : "Browser UI visible — switch to headless for faster execution"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
