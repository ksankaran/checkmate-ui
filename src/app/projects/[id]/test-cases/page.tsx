"use client";

import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  FileText,
  Play,
  Sparkles,
  Tag,
  Loader2,
  FolderInput,
  FolderPlus,
  GripVertical,
  Folder,
  InboxIcon,
  X,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  RefreshCw,
  Monitor,
  Layers,
  Video,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_URL, getFeatures, Features } from "@/lib/api";
import { foldersApi } from "@/lib/api/folders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScenarioStatusBadge } from "@/components/scenarios/ScenarioStatusBadge";
import { ScenarioStatusTransition } from "@/components/scenarios/ScenarioStatusTransition";
import { GenerateStepsButton } from "@/components/scenarios/GenerateStepsButton";
import { VisibilityToggle } from "@/components/scenarios/VisibilityToggle";
import { BrowserModeToggle } from "@/components/shared/BrowserModeToggle";
import { PriorityBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { FolderTree, type FolderSelection } from "@/components/folders/FolderTree";
import { FolderDialog } from "@/components/folders/FolderDialog";
import { MoveToFolderDialog } from "@/components/folders/MoveToFolderDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { parseTags, parseSteps, parseSmartCriteria } from "@/types";
import { ACTION_LABELS } from "@/lib/constants";
import type {
  TestCase,
  TestStep,
  TestFolder,
  Project,
  BrowserOption,
  TestCaseStatus,
} from "@/types";
import { toast } from "sonner";
import { useEnvironment } from "@/context/EnvironmentContext";

// Browser identity config for cross-browser toggle icons
const BROWSER_COLORS: Record<string, { bg: string; label: string }> = {
  chromium: { bg: "#4285F4", label: "Cr" },
  chrome:   { bg: "#34A853", label: "Ch" },
  firefox:  { bg: "#FF7139", label: "Fx" },
  webkit:   { bg: "#735FAD", label: "Wk" },
};
const getBrowserDisplay = (id: string) =>
  BROWSER_COLORS[id] ?? { bg: "#6B7280", label: id.slice(0, 2).toUpperCase() };

export default function ScenariosPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const projectIdNum = parseInt(projectId, 10);
  const { activeEnv } = useEnvironment();

  // Derive initial folder selection from URL search params
  function getInitialSelection(): FolderSelection {
    const view = searchParams.get("view");
    const folderId = searchParams.get("folder");
    if (view === "unfiled") return { type: "unfiled" };
    if (folderId) return { type: "folder", folderId: parseInt(folderId, 10) };
    return { type: "all" };
  }

  // Data state
  const [project, setProject] = useState<Project | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [folders, setFolders] = useState<TestFolder[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Browser state — selectedBrowser and selectedBrowsers always store BASE ids (e.g. "chromium", never "chromium-headless").
  // The headless suffix is applied at run-time via headlessMode.
  const [browsers, setBrowsers] = useState<BrowserOption[]>([]);
  const [selectedBrowser, setSelectedBrowser] = useState<string>("");
  const [selectedBrowsers, setSelectedBrowsers] = useState<string[]>([]);
  const [headlessMode, setHeadlessMode] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchAbortRef = useRef<AbortController | null>(null);

  // Run settings panel
  const [showRunSettings, setShowRunSettings] = useState(false);
  const [features, setFeatures] = useState<Features>({ intelligent_retry: false });
  const [retryEnabled, setRetryEnabled] = useState(false);
  const [maxRetries, setMaxRetries] = useState(2);
  const [retryMode, setRetryMode] = useState<"simple" | "intelligent">("simple");
  const [resolutionPreset, setResolutionPreset] = useState("1280x720");
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [viewportHeight, setViewportHeight] = useState(720);
  const [parallelWorkers, setParallelWorkers] = useState(1);

  // Folder selection — initialized from URL search params
  const [selection, setSelection] = useState<FolderSelection>(getInitialSelection);

  // Dialog state
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<TestFolder | null>(null);
  const [newFolderParentId, setNewFolderParentId] = useState<number | undefined>();
  const [deletingFolder, setDeletingFolder] = useState<TestFolder | null>(null);

  // Move-to-folder dialog
  const [movingTestCase, setMovingTestCase] = useState<TestCase | null>(null);

  // Drag-and-drop state
  const [draggingId, setDraggingId] = useState<number | null>(null);

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function toggleSelected(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === runnableTestCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(runnableTestCases.map(tc => tc.id)));
    }
  }

  // Folder collapse state — empty set means all folders expanded (default)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  function toggleFolderCollapse(key: string) {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleFolderSelect(groupTestCases: TestCase[]) {
    const runnableIds = groupTestCases
      .filter(tc => ["draft","active","ready","approved"].includes(tc.status) && parseSteps(tc.steps).length > 0)
      .map(tc => tc.id);
    const allSelected = runnableIds.length > 0 && runnableIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        runnableIds.forEach(id => next.delete(id));
      } else {
        runnableIds.forEach(id => next.add(id));
      }
      return next;
    });
  }

  // Sync folder selection to URL search params so back-navigation restores it
  const handleSelectionChange = useCallback((newSelection: FolderSelection) => {
    setSelection(newSelection);
    const params = new URLSearchParams();
    if (newSelection.type === "unfiled") {
      params.set("view", "unfiled");
    } else if (newSelection.type === "folder") {
      params.set("folder", String(newSelection.folderId));
    }
    const qs = params.toString();
    router.replace(`/projects/${projectId}/test-cases${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [projectId, router]);

  // Clear selection when folder changes
  useEffect(() => { setSelectedIds(new Set()); }, [selection]);

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  // Cache sidebar left position at mousedown — avoids getBoundingClientRect on every mousemove (forced reflow)
  const sidebarStartLeft = useRef(0);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isResizing.current) return;
      const sidebarLeft = sidebarStartLeft.current;
      const maxWidth = window.innerWidth - sidebarLeft - 300;
      const newWidth = Math.min(maxWidth, Math.max(140, e.clientX - sidebarLeft));
      setSidebarWidth(newWidth);
    }
    function onMouseUp() {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function startResizing(e: React.MouseEvent) {
    e.preventDefault();
    // Read layout once here instead of on every mousemove
    sidebarStartLeft.current = sidebarRef.current?.getBoundingClientRect().left ?? 0;
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  // Persist browser selection to localStorage so it survives page navigation
  useEffect(() => {
    if (selectedBrowser) {
      const fullId = headlessMode ? `${selectedBrowser}-headless` : selectedBrowser;
      localStorage.setItem(`checkmate:browser:${projectId}`, fullId);
    }
  }, [selectedBrowser, headlessMode, projectId]);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  async function fetchData() {
    try {
      const [projectRes, testCasesRes, browsersRes, foldersData, featuresData] =
        await Promise.all([
          fetch(`${API_URL}/api/projects/${projectId}`),
          fetch(`${API_URL}/api/test-cases/project/${projectId}`),
          fetch(`${API_URL}/api/test-runs/browsers`),
          foldersApi.listByProject(projectIdNum),
          getFeatures(),
        ]);

      if (projectRes.ok) setProject(await projectRes.json());
      if (testCasesRes.ok) setTestCases(await testCasesRes.json());
      if (browsersRes.ok) {
        const browserData = await browsersRes.json();
        const browserList = (browserData.browsers || []).slice().sort((a: BrowserOption, b: BrowserOption) => a.name.localeCompare(b.name));
        setBrowsers(browserList);
        if (browserList.length > 0 && !selectedBrowser) {
          // Derive unique browser families (base IDs without -headless suffix)
          const headedBrowsers = browserList.filter((b: BrowserOption) => !b.headless);
          const hasHeaded = headedBrowsers.length > 0;
          const raw = typeof window !== "undefined"
            ? localStorage.getItem(`checkmate:browser:${projectId}`)
            : null;
          // Restore headless mode from saved preference
          const savedWasHeadless = raw?.endsWith("-headless") ?? false;
          const savedBase = raw?.replace(/-headless$/, "") ?? null;

          let preferred: string;
          if (hasHeaded) {
            preferred = (savedBase && browserList.some((b: BrowserOption) => b.id === savedBase))
              ? savedBase
              : (browserData.default?.replace(/-headless$/, "") || headedBrowsers[0]?.id);
            // Check if the headless counterpart exists before enabling headless mode
            if (savedWasHeadless && browserList.some((b: BrowserOption) => b.id === `${preferred}-headless`)) {
              setHeadlessMode(true);
            }
          } else {
            // Headless-only environment (e.g. Docker): strip suffix for base id
            preferred = (savedBase && browserList.some((b: BrowserOption) => b.id === `${savedBase}-headless`))
              ? savedBase
              : (browserData.default?.replace(/-headless$/, "") || browserList[0]?.id.replace(/-headless$/, ""));
            setHeadlessMode(true); // forced headless
          }
          setSelectedBrowser(preferred);
          setSelectedBrowsers([preferred]);
        }
      }
      setFolders(foldersData);
      setFeatures(featuresData);
      if (featuresData.intelligent_retry) {
        setRetryMode("intelligent");
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function refreshFolders() {
    try {
      const data = await foldersApi.listByProject(projectIdNum);
      setFolders(data);
    } catch (error) {
      console.error("Failed to refresh folders:", error);
    }
  }

  // --- Folder-filtered test cases ---
  const folderFilteredTestCases = useMemo(() => {
    if (selection.type === "all") return testCases;
    if (selection.type === "unfiled")
      return testCases.filter((tc) => tc.folder_id === null);
    if (selection.type === "folder") {
      const folder = folders.find((f) => f.id === selection.folderId);
      if (!folder) return [];

      // Smart folder: compute client-side
      if (folder.folder_type === "smart") {
        const criteria = parseSmartCriteria(folder.smart_criteria);
        const filterTags = (criteria.tags || []).map((t) => t.toLowerCase());
        const filterStatuses = criteria.statuses || [];
        return testCases.filter((tc) => {
          if (
            filterStatuses.length > 0 &&
            !filterStatuses.includes(tc.status)
          )
            return false;
          if (filterTags.length > 0) {
            const tcTags = parseTags(tc.tags).map((t) => t.toLowerCase());
            return filterTags.some((t) => tcTags.includes(t));
          }
          return true;
        });
      }

      // Regular folder: direct + descendants
      const folderIds = new Set([selection.folderId]);
      for (const f of folders) {
        if (f.parent_id === selection.folderId) {
          folderIds.add(f.id);
        }
      }
      return testCases.filter(
        (tc) => tc.folder_id !== null && folderIds.has(tc.folder_id),
      );
    }
    return testCases;
  }, [testCases, folders, selection]);

  // Extract unique tags from folder-filtered test cases
  const allTags = useMemo(
    () =>
      Array.from(
        new Set(folderFilteredTestCases.flatMap((tc) => parseTags(tc.tags))),
      ).sort(),
    [folderFilteredTestCases],
  );

  // Apply search + status + tag filter on top of folder filter
  const filteredTestCases = useMemo(() => {
    return folderFilteredTestCases.filter((tc) => {
      const matchesSearch =
        search === "" ||
        tc.name.toLowerCase().includes(search.toLowerCase()) ||
        tc.natural_query.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || tc.status === statusFilter;
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => parseTags(tc.tags).includes(tag));
      return matchesSearch && matchesStatus && matchesTags;
    });
  }, [folderFilteredTestCases, search, statusFilter, selectedTags]);

  // Runnable test cases from current view
  const runnableTestCases = useMemo(
    () =>
      folderFilteredTestCases.filter((tc) => {
        const steps = parseSteps(tc.steps);
        return (
          ["draft", "active", "ready", "approved"].includes(tc.status) &&
          steps.length > 0
        );
      }),
    [folderFilteredTestCases],
  );

  const statusCounts = useMemo(
    () =>
      folderFilteredTestCases.reduce(
        (acc, tc) => {
          acc[tc.status] = (acc[tc.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [folderFilteredTestCases],
  );

  // Tags that appear as criteria in any smart folder — highlighted in the table
  const smartTags = useMemo(() => {
    const tags = new Set<string>();
    for (const folder of folders) {
      if (folder.folder_type === "smart" && folder.smart_criteria) {
        const criteria = parseSmartCriteria(folder.smart_criteria);
        for (const tag of (criteria.tags || [])) {
          tags.add(tag.toLowerCase());
        }
      }
    }
    return tags;
  }, [folders]);

  // --- Grouped test cases for "All Scenarios" view ---
  const groupedTestCases = useMemo(() => {
    if (selection.type !== "all") return null;

    // Build folder lookup
    const folderMap = new Map<number, TestFolder>();
    for (const f of folders) {
      folderMap.set(f.id, f);
    }

    // Group filtered test cases by folder_id
    const groups = new Map<number | null, TestCase[]>();
    for (const tc of filteredTestCases) {
      const key = tc.folder_id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tc);
    }

    // Sort groups: regular folders first (by name), then unfiled last
    const sorted: { key: number | null; label: string; icon: "folder" | "unfiled"; isSmart: boolean; testCases: TestCase[] }[] = [];

    // Collect folder groups
    const folderEntries: { key: number; folder: TestFolder; testCases: TestCase[] }[] = [];
    for (const [key, tcs] of groups) {
      if (key !== null) {
        const folder = folderMap.get(key);
        if (folder) {
          folderEntries.push({ key, folder, testCases: tcs });
        }
      }
    }
    // Sort by folder name
    folderEntries.sort((a, b) => a.folder.name.localeCompare(b.folder.name));

    for (const entry of folderEntries) {
      sorted.push({
        key: entry.key,
        label: entry.folder.name,
        icon: "folder",
        isSmart: entry.folder.folder_type === "smart",
        testCases: entry.testCases,
      });
    }

    // Unfiled at the end
    const unfiled = groups.get(null);
    if (unfiled && unfiled.length > 0) {
      sorted.push({
        key: null,
        label: "Unassigned Scenarios",
        icon: "unfiled",
        isSmart: false,
        testCases: unfiled,
      });
    }

    return sorted;
  }, [selection, filteredTestCases, folders]);

  // Unique browser families (base IDs, e.g. "chromium", "firefox" — no "-headless" variants)
  const browserFamilies = useMemo(() => {
    const seen = new Set<string>();
    return browsers.reduce<BrowserOption[]>((acc, b) => {
      const baseId = b.id.replace(/-headless$/, "");
      if (!seen.has(baseId)) {
        seen.add(baseId);
        acc.push({ ...b, id: baseId, name: b.name.replace(" (Headless)", ""), headless: false });
      }
      return acc;
    }, []);
  }, [browsers]);

  // Toggle a browser in/out of the multi-browser selection.
  // At least one browser must remain selected (enforced here, not just in UI).
  function toggleBrowserSelection(id: string) {
    setSelectedBrowsers(prev =>
      prev.includes(id)
        ? prev.length === 1 ? prev : prev.filter(b => b !== id)
        : [...prev, id]
    );
  }

  // --- Batch run ---
  function cancelBatch() {
    batchAbortRef.current?.abort();
  }

  async function runBatch(testCaseIds: number[], label: string) {
    if (testCaseIds.length === 0) {
      toast.error(`No ${label.toLowerCase()} test cases to run`);
      return;
    }

    const controller = new AbortController();
    batchAbortRef.current = controller;
    setBatchRunning(true);
    toast.info(`Starting ${label}: ${testCaseIds.length} test cases`);

    try {
      const res = await fetch(
        `${API_URL}/api/test-cases/project/${projectId}/run-batch/stream`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            test_case_ids: testCaseIds,
            // Apply headless suffix to base browser IDs when headless mode is on
            ...(() => {
              const effectiveBrowsers = selectedBrowsers.map(b =>
                headlessMode ? `${b}-headless` : b
              );
              return {
                browser: effectiveBrowsers[0] || (headlessMode ? `${selectedBrowser}-headless` : selectedBrowser) || undefined,
                browsers: effectiveBrowsers.length > 1 ? effectiveBrowsers : [],
              };
            })(),
            viewport: (viewportWidth !== 1280 || viewportHeight !== 720) ? {
              width: viewportWidth,
              height: viewportHeight,
            } : undefined,
            retry: retryEnabled ? {
              max_retries: maxRetries,
              retry_mode: retryMode,
            } : undefined,
            parallel: parallelWorkers,
            context: label,
            environment_id: activeEnv?.id ?? undefined,
          }),
        },
      );

      if (!res.ok) throw new Error("Batch run failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "batch_completed") {
                const browserSuffix = data.browsers?.length > 1
                  ? ` across ${data.browsers.length} browsers`
                  : "";
                toast.success(
                  `${label} complete: ${data.passed} passed, ${data.failed} failed${browserSuffix}`,
                );
              }
            } catch {
              // skip
            }
          }
        }
      }

      router.push(`/projects/${projectId}/runs`);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        toast.info("Batch run cancelled");
        return;
      }
      const msg = error instanceof Error ? error.message : "Batch run failed";
      toast.error(msg);
    } finally {
      setBatchRunning(false);
      batchAbortRef.current = null;
    }
  }

  async function runFolder(folder: TestFolder) {
    try {
      const result = await foldersApi.runFolder(folder.id);
      if (result.count === 0) {
        toast.error("No runnable test cases in this folder");
        return;
      }
      await runBatch(result.test_case_ids, folder.name);
    } catch (error) {
      toast.error("Failed to get folder test cases");
    }
  }

  // --- Folder actions ---
  function handleNewFolder(parentId?: number) {
    setEditingFolder(null);
    setNewFolderParentId(parentId);
    setFolderDialogOpen(true);
  }

  function handleEditFolder(folder: TestFolder) {
    setEditingFolder(folder);
    setNewFolderParentId(undefined);
    setFolderDialogOpen(true);
  }

  async function handleFolderSubmit(data: {
    name: string;
    description: string;
    folder_type: "regular" | "smart";
    smart_criteria?: string;
    parent_id?: number | null;
  }) {
    try {
      if (editingFolder) {
        await foldersApi.update(editingFolder.id, {
          name: data.name,
          description: data.description || null,
          smart_criteria: data.smart_criteria,
        });
        toast.success("Folder updated");
      } else {
        await foldersApi.create({
          project_id: projectIdNum,
          name: data.name,
          description: data.description || null,
          folder_type: data.folder_type,
          smart_criteria: data.smart_criteria,
          parent_id: data.parent_id ?? newFolderParentId ?? null,
        });
        toast.success("Folder created");
      }
      refreshFolders();
    } catch (error) {
      toast.error("Failed to save folder");
    }
  }

  async function handleDeleteFolder() {
    if (!deletingFolder) return;
    try {
      await foldersApi.delete(deletingFolder.id);
      toast.success("Folder deleted");
      // If we were viewing this folder, go back to all
      if (
        selection.type === "folder" &&
        selection.folderId === deletingFolder.id
      ) {
        handleSelectionChange({ type: "all" });
      }
      refreshFolders();
    } catch (error: unknown) {
      // 409 = folder not empty — extract detail from response body
      let msg = "Failed to delete folder";
      if (error && typeof error === "object" && "body" in error) {
        const body = (error as { body?: { detail?: string } }).body;
        if (body?.detail) msg = body.detail;
      }
      toast.error(msg);
    } finally {
      setDeletingFolder(null);
    }
  }

  async function handleMoveTestCase(folderId: number | null) {
    if (!movingTestCase) return;
    try {
      const updated = await foldersApi.moveTestCase(movingTestCase.id, folderId);
      setTestCases((prev) =>
        prev.map((tc) => (tc.id === updated.id ? updated : tc)),
      );
      toast.success(
        folderId ? "Test case moved to folder" : "Test case moved to Unassigned Scenarios",
      );
    } catch (error) {
      toast.error("Failed to move test case");
    } finally {
      setMovingTestCase(null);
    }
  }

  async function handleDropTestCase(testCaseId: number, folderId: number | null) {
    try {
      const updated = await foldersApi.moveTestCase(testCaseId, folderId);
      setTestCases((prev) =>
        prev.map((tc) => (tc.id === updated.id ? updated : tc)),
      );
      const targetName = folderId
        ? folders.find((f) => f.id === folderId)?.name ?? "folder"
        : "Unassigned Scenarios";
      toast.success(`Moved to ${targetName}`);
    } catch (error) {
      toast.error("Failed to move test case");
    }
  }

  function handleTestCaseUpdate(updated: TestCase) {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === updated.id ? updated : tc)),
    );
  }

  // --- Breadcrumb ---
  const breadcrumb = useMemo(() => {
    if (selection.type === "all") return ["All Scenarios"];
    if (selection.type === "unfiled") return ["Unassigned Scenarios"];
    if (selection.type === "folder") {
      const folder = folders.find((f) => f.id === selection.folderId);
      if (!folder) return ["All Scenarios"];
      if (folder.parent_id) {
        const parent = folders.find((f) => f.id === folder.parent_id);
        if (parent) return [parent.name, folder.name];
      }
      return [folder.name];
    }
    return ["All Scenarios"];
  }, [selection, folders]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSkeleton variant="list" count={6} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Folder Sidebar — resizable */}
      <div
        ref={sidebarRef}
        className="border-r border-border bg-muted/30 shrink-0 relative"
        style={{ width: sidebarWidth }}
      >
        <FolderTree
          folders={folders}
          testCases={testCases}
          selection={selection}
          onSelect={handleSelectionChange}
          onNewFolder={handleNewFolder}
          onEditFolder={handleEditFolder}
          onDeleteFolder={(f) => setDeletingFolder(f)}
          onRunFolder={runFolder}
          onDropTestCase={handleDropTestCase}
        />
        {/* Resize handle */}
        <div
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-10"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 space-y-4">
          {/* Header with breadcrumb + Run buttons */}
          <div className="flex items-center justify-between">
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                <span>Features</span>
                {breadcrumb.map((segment, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span>/</span>
                    <span
                      className={
                        i === breadcrumb.length - 1
                          ? "text-foreground font-medium"
                          : ""
                      }
                    >
                      {segment}
                    </span>
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {folderFilteredTestCases.length} test case
                {folderFilteredTestCases.length !== 1 ? "s" : ""}
                {selection.type !== "all" ? " in view" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Select All / Deselect toggle */}
              {runnableTestCases.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={toggleSelectAll}
                >
                  {selectedIds.size === runnableTestCases.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              )}

              {/* Run Selected button — appears when checkboxes are ticked */}
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  variant={batchRunning ? "destructive" : "outline"}
                  onClick={() => {
                    if (batchRunning) { cancelBatch(); return; }
                    // Derive label from selected tests' actual folder(s)
                    const selectedTcs = testCases.filter((tc) => selectedIds.has(tc.id));
                    const folderIds = new Set(selectedTcs.map((tc) => tc.folder_id));
                    let contextLabel: string;
                    if (folderIds.size === 1) {
                      const fid = [...folderIds][0];
                      contextLabel = fid !== null
                        ? folders.find((f) => f.id === fid)?.name || "Folder"
                        : "Unassigned Scenarios";
                    } else {
                      contextLabel = selection.type === "folder"
                        ? folders.find((f) => f.id === selection.folderId)?.name || "Folder"
                        : selection.type === "unfiled"
                          ? "Unfiled"
                          : "All Scenarios";
                    }
                    runBatch(Array.from(selectedIds), `${contextLabel} (${selectedIds.size} tests)`);
                    setSelectedIds(new Set());
                  }}
                >
                  {batchRunning ? (
                    <Square className="h-4 w-4 mr-2 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {batchRunning ? "Cancel" : `Run Selected (${selectedIds.size})`}
                </Button>
              )}

              <Button
                size="sm"
                variant={batchRunning ? "destructive" : "default"}
                onClick={() => {
                  if (batchRunning) { cancelBatch(); return; }
                  const label =
                    selection.type === "folder"
                      ? folders.find((f) => f.id === selection.folderId)?.name || "Folder"
                      : selection.type === "unfiled"
                        ? "Unfiled"
                        : "All Scenarios";
                  runBatch(
                    runnableTestCases.map((tc) => tc.id),
                    label,
                  );
                }}
                disabled={!batchRunning && runnableTestCases.length === 0}
              >
                {batchRunning ? (
                  <Square className="h-4 w-4 mr-2 fill-current" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {batchRunning
                  ? "Cancel Run"
                  : selection.type === "folder"
                    ? `Run ${folders.find((f) => f.id === selection.folderId)?.name || "Folder"} (${runnableTestCases.length})`
                    : `Run All (${runnableTestCases.length})`}
              </Button>
            </div>
          </div>

          {/* Quick actions row */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${projectId}/build`}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Builder
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${projectId}/record`}>
                <Video className="h-4 w-4 mr-2" />
                Record
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${projectId}/test-cases/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Test Case
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNewFolder()}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Feature
            </Button>
          </div>

          {/* Run Settings — collapsible panel */}
          <div>
            <button
              onClick={() => setShowRunSettings(!showRunSettings)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="font-medium">Run Settings</span>
              {showRunSettings ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {(retryEnabled || selectedBrowser || viewportWidth !== 1280 || viewportHeight !== 720 || parallelWorkers > 1) && !showRunSettings && (
                <span className="text-xs text-muted-foreground/70">
                  ({[
                    (selectedBrowsers.length > 1
                      ? selectedBrowsers.map(id => getBrowserDisplay(id).label).join("+")
                      : browserFamilies.find((b) => b.id === selectedBrowser)?.name) + (headlessMode ? " HL" : ""),
                    (viewportWidth !== 1280 || viewportHeight !== 720) && `${viewportWidth}x${viewportHeight}`,
                    retryEnabled && `retry ×${maxRetries}`,
                    parallelWorkers > 1 && `${parallelWorkers}× parallel`,
                  ].filter(Boolean).join(", ")})
                </span>
              )}
            </button>

            {showRunSettings && (
              <div className="mt-2 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Browser selector */}
                  {browsers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        Browser
                      </label>
                      <Select
                        value={selectedBrowser || ""}
                        onValueChange={(v) => {
                          const oldBase = selectedBrowser;
                          setSelectedBrowser(v);
                          // Update multi-browser selection: swap old for new
                          setSelectedBrowsers(prev => {
                            if (prev.includes(v)) return prev.filter(b => b !== oldBase || b === v);
                            return prev.map(b => b === oldBase ? v : b);
                          });
                        }}
                      >
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue placeholder="Browser" />
                        </SelectTrigger>
                        <SelectContent>
                          {browserFamilies.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Browser mode toggle (headed / headless) */}
                  {browsers.length > 0 && selectedBrowser && browsers.some(b => b.id === `${selectedBrowser}-headless`) && (
                    <BrowserModeToggle
                      browsers={browsers}
                      selectedBrowser={headlessMode ? `${selectedBrowser}-headless` : selectedBrowser}
                      onBrowserChange={(id) => setHeadlessMode(id.endsWith("-headless"))}
                    />
                  )}

                  {/* Resolution */}
                  <div className="flex items-center gap-2">
                    <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                    <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      Resolution
                    </label>
                    <Select
                      value={resolutionPreset}
                      onValueChange={(v) => {
                        setResolutionPreset(v);
                        if (v !== "custom") {
                          const [w, h] = v.split("x").map(Number);
                          setViewportWidth(w);
                          setViewportHeight(h);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[150px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1280x720">1280 x 720</SelectItem>
                        <SelectItem value="1366x768">1366 x 768</SelectItem>
                        <SelectItem value="1440x900">1440 x 900</SelectItem>
                        <SelectItem value="1920x1080">1920 x 1080</SelectItem>
                        <SelectItem value="375x812">375 x 812 (Mobile)</SelectItem>
                        <SelectItem value="768x1024">768 x 1024 (Tablet)</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {resolutionPreset === "custom" && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={320}
                          max={3840}
                          value={viewportWidth}
                          onChange={(e) => setViewportWidth(parseInt(e.target.value) || 1280)}
                          className="w-[70px] h-8 text-center text-sm"
                        />
                        <span className="text-xs text-muted-foreground">x</span>
                        <Input
                          type="number"
                          min={320}
                          max={2160}
                          value={viewportHeight}
                          onChange={(e) => setViewportHeight(parseInt(e.target.value) || 720)}
                          className="w-[70px] h-8 text-center text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Separator */}
                  <div className="h-6 w-px bg-border" />

                  {/* Retry toggle */}
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    <label
                      htmlFor="retry-toggle"
                      className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                    >
                      Retry on failure
                    </label>
                    <Switch
                      id="retry-toggle"
                      checked={retryEnabled}
                      onCheckedChange={setRetryEnabled}
                    />
                  </div>

                  {/* Retry options (shown when enabled) */}
                  {retryEnabled && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          Max
                        </label>
                        <Select
                          value={String(maxRetries)}
                          onValueChange={(v) => setMaxRetries(parseInt(v))}
                        >
                          <SelectTrigger className="w-[80px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {features.intelligent_retry && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            Mode
                          </label>
                          <Select
                            value={retryMode}
                            onValueChange={(v) => setRetryMode(v as "simple" | "intelligent")}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simple">Simple</SelectItem>
                              <SelectItem value="intelligent">Smart (AI)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}

                  {/* Separator */}
                  <div className="h-6 w-px bg-border" />

                  {/* Parallel execution */}
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      Parallel
                    </label>
                    <Select value={String(parallelWorkers)} onValueChange={(v) => setParallelWorkers(parseInt(v))}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Multi-browser icon toggles — show when 2+ browser families exist */}
                  {browserFamilies.length > 1 && (
                    <>
                      <div className="h-6 w-px bg-border" />
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          Browsers
                        </label>
                        <div className="flex items-center gap-1">
                          {browserFamilies.map(b => {
                            const d = getBrowserDisplay(b.id);
                            const sel = selectedBrowsers.includes(b.id);
                            return (
                              <button
                                key={b.id}
                                type="button"
                                title={`${b.name}${sel ? " (selected)" : " — click to add"}`}
                                onClick={() => toggleBrowserSelection(b.id)}
                                className={cn(
                                  "w-7 h-7 rounded-full text-[10px] font-bold text-white",
                                  "flex items-center justify-center transition-all ring-2 ring-offset-1",
                                  sel
                                    ? "ring-current opacity-100 scale-100"
                                    : "ring-transparent opacity-40 scale-95 hover:opacity-70"
                                )}
                                style={{ backgroundColor: d.bg }}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={search}
                onChange={(e) => { const v = e.target.value; startTransition(() => setSearch(v)); }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant={statusFilter === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => startTransition(() => setStatusFilter("all"))}
              >
                All ({folderFilteredTestCases.length})
              </Button>
              {Object.entries(statusCounts).map(([status, count]) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => startTransition(() => setStatusFilter(status))}
                >
                  {status === "in_review"
                    ? "In Review"
                    : status.charAt(0).toUpperCase() + status.slice(1)}{" "}
                  ({count})
                </Button>
              ))}
            </div>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tags
              </span>
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() =>
                    startTransition(() =>
                      setSelectedTags((prev) =>
                        prev.includes(tag)
                          ? prev.filter((t) => t !== tag)
                          : [...prev, tag],
                      )
                    )
                  }
                >
                  {tag}
                </Badge>
              ))}
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => startTransition(() => setSelectedTags([]))}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Test Cases Table */}
          {filteredTestCases.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title={
                search || statusFilter !== "all"
                  ? "No matching features"
                  : selection.type === "unfiled"
                    ? "No unassigned scenarios"
                    : selection.type === "folder"
                      ? "No features in this folder"
                      : "No features yet"
              }
              description={
                search || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : selection.type === "unfiled"
                    ? "All scenarios have been organized into features"
                    : selection.type === "folder"
                      ? "Move features into this folder or create new ones"
                      : "Create your first feature to get started"
              }
              action={
                !search && statusFilter === "all" && selection.type === "all" ? (
                  <Button asChild>
                    <Link href={`/projects/${projectId}/test-cases/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Feature
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              {/* Table header */}
              <div
                className="grid items-center px-3 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground"
                style={{ gridTemplateColumns: COL_TEMPLATE }}
              >
                <span className="flex items-center justify-center gap-1">
                  {groupedTestCases && (
                    <>
                      <button
                        onClick={() => startTransition(() => setCollapsedFolders(new Set()))}
                        title="Expand all folders"
                        className="p-0.5 rounded hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <ChevronsDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => startTransition(() => setCollapsedFolders(new Set(groupedTestCases.map(g => g.key?.toString() ?? "__unfiled__"))))}
                        title="Collapse all folders"
                        className="p-0.5 rounded hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <ChevronsUp className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </span>
                <span className="pl-1">Feature Name</span>
                <span>Tags</span>
                <span className="text-center">Status</span>
                <span className="text-center">Priority</span>
                <span className="text-center">Steps</span>
                <span className="text-right pr-2">Actions</span>
              </div>

              {groupedTestCases ? (
                /* Grouped view for "All Scenarios" */
                groupedTestCases.map((group) => {
                  const folderKey = group.key?.toString() ?? "__unfiled__";
                  const isCollapsed = collapsedFolders.has(folderKey);
                  const runnableInGroup = group.testCases.filter(tc =>
                    ["draft","active","ready","approved"].includes(tc.status) && parseSteps(tc.steps).length > 0
                  );
                  const allSelected = runnableInGroup.length > 0 && runnableInGroup.every(tc => selectedIds.has(tc.id));
                  const someSelected = !allSelected && runnableInGroup.some(tc => selectedIds.has(tc.id));

                  return (
                    <div key={group.key ?? "unfiled"}>
                      {/* Folder group separator */}
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-2 border-t border-border",
                        group.isSmart
                          ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30"
                          : "bg-muted/30",
                      )}>
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={() => toggleFolderSelect(group.testCases)}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          disabled={runnableInGroup.length === 0}
                          className="shrink-0"
                        />
                        <button
                          className="flex items-center gap-2 flex-1 min-w-0"
                          onClick={() => toggleFolderCollapse(folderKey)}
                        >
                          {group.icon === "folder" ? (
                            group.isSmart ? (
                              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                            ) : (
                              <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                            )
                          ) : (
                            <InboxIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={cn(
                            "text-xs font-medium",
                            group.isSmart ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                          )}>
                            {group.label}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs h-5",
                              group.isSmart && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
                            )}
                          >
                            {group.testCases.length}
                          </Badge>
                          <ChevronDown className={cn(
                            "h-3.5 w-3.5 text-muted-foreground ml-1 transition-transform duration-150",
                            isCollapsed && "-rotate-90",
                          )} />
                        </button>
                      </div>
                      {/* Test cases in this group — hidden when collapsed */}
                      {!isCollapsed && group.testCases.map((tc) => (
                        <TestCaseRow
                          key={tc.id}
                          tc={tc}
                          projectId={projectId}
                          projectIdNum={projectIdNum}
                          projectPrefix={project?.test_case_prefix ?? null}
                          draggingId={draggingId}
                          setDraggingId={setDraggingId}
                          setMovingTestCase={setMovingTestCase}
                          handleTestCaseUpdate={handleTestCaseUpdate}
                          isSelected={selectedIds.has(tc.id)}
                          onToggleSelect={() => toggleSelected(tc.id)}
                          onRunSingle={() => runBatch([tc.id], tc.name)}
                          isRunnable={["draft","active","ready","approved"].includes(tc.status) && parseSteps(tc.steps).length > 0}
                          isBatchRunning={batchRunning}
                          smartTags={smartTags}
                        />
                      ))}
                    </div>
                  );
                })
              ) : (
                /* Flat list for folder / unfiled views */
                filteredTestCases.map((tc) => (
                  <TestCaseRow
                    key={tc.id}
                    tc={tc}
                    projectId={projectId}
                    projectIdNum={projectIdNum}
                    projectPrefix={project?.test_case_prefix ?? null}
                    draggingId={draggingId}
                    setDraggingId={setDraggingId}
                    setMovingTestCase={setMovingTestCase}
                    handleTestCaseUpdate={handleTestCaseUpdate}
                    isSelected={selectedIds.has(tc.id)}
                    onToggleSelect={() => toggleSelected(tc.id)}
                    onRunSingle={() => runBatch([tc.id], tc.name)}
                    isRunnable={["draft","active","ready","approved"].includes(tc.status) && parseSteps(tc.steps).length > 0}
                    isBatchRunning={batchRunning}
                    smartTags={smartTags}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Folder Create/Edit Dialog */}
      <FolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        folder={editingFolder}
        parentId={newFolderParentId}
        onSubmit={handleFolderSubmit}
      />

      {/* Move to Folder Dialog */}
      <MoveToFolderDialog
        open={!!movingTestCase}
        onOpenChange={(open) => !open && setMovingTestCase(null)}
        folders={folders}
        currentFolderId={movingTestCase?.folder_id ?? null}
        onMove={handleMoveTestCase}
      />

      {/* Delete Folder Confirmation */}
      {(() => {
        const isSmart = deletingFolder?.folder_type === "smart";
        const count = deletingFolder && !isSmart
          ? testCases.filter((tc) => tc.folder_id === deletingFolder.id).length
          : 0;
        const canDelete = isSmart || count === 0;
        return (
          <ConfirmDialog
            open={!!deletingFolder}
            onOpenChange={(open) => !open && setDeletingFolder(null)}
            title={canDelete ? "Delete Folder" : "Folder Not Empty"}
            description={
              canDelete
                ? `Are you sure you want to delete "${deletingFolder?.name}"?${isSmart ? " This is a smart folder — no test cases will be affected." : ""}`
                : `"${deletingFolder?.name}" contains ${count} test case${count !== 1 ? "s" : ""}. Move them to another folder before deleting.`
            }
            onConfirm={canDelete ? handleDeleteFolder : () => setDeletingFolder(null)}
            confirmLabel={canDelete ? "Delete" : "OK"}
            variant={canDelete ? "destructive" : "default"}
          />
        );
      })()}
    </div>
  );
}

// --- Extracted Test Case Row ---

const COL_TEMPLATE = "72px 1fr 140px 110px 80px 64px 160px";

function TestCaseRow({
  tc,
  projectId,
  projectIdNum,
  projectPrefix,
  draggingId,
  setDraggingId,
  setMovingTestCase,
  handleTestCaseUpdate,
  isSelected,
  onToggleSelect,
  onRunSingle,
  isRunnable,
  isBatchRunning,
  smartTags,
}: {
  tc: TestCase;
  projectId: string;
  projectIdNum: number;
  projectPrefix: string | null;
  draggingId: number | null;
  setDraggingId: (id: number | null) => void;
  setMovingTestCase: (tc: TestCase) => void;
  handleTestCaseUpdate: (tc: TestCase) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRunSingle: () => void;
  isRunnable: boolean;
  isBatchRunning: boolean;
  smartTags: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const tags = parseTags(tc.tags);
  const steps = parseSteps(tc.steps);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/x-test-case-id", String(tc.id));
          e.dataTransfer.effectAllowed = "move";
          setDraggingId(tc.id);
        }}
        onDragEnd={() => setDraggingId(null)}
        className={cn(
          "border-t border-border",
          draggingId === tc.id && "opacity-50",
        )}
      >
        {/* Grid row */}
        <div
          className="grid items-center px-3 py-2 hover:bg-muted/20 transition-colors cursor-grab active:cursor-grabbing"
          style={{ gridTemplateColumns: COL_TEMPLATE }}
        >
          {/* Col 1: Controls (checkbox + grip + expand) */}
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect()}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              disabled={!isRunnable}
              className="shrink-0"
            />
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </button>
          </div>

          {/* Col 2: ID badge + Name */}
          <div className="flex items-center gap-2 min-w-0 pr-2">
            {projectPrefix && tc.test_case_number != null && (
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                {projectPrefix}-T{tc.test_case_number}
              </span>
            )}
            <Link
              href={`/projects/${projectId}/test-cases/${tc.id}`}
              className="font-medium text-sm truncate hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {tc.name}
            </Link>
          </div>

          {/* Col 3: Tags */}
          <div className="flex items-center gap-1 flex-wrap">
            {tags.slice(0, 3).map((tag) => {
              const isSmart = smartTags.has(tag.toLowerCase());
              return (
                <Badge
                  key={tag}
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4",
                    isSmart && "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
                  )}
                >
                  {tag}
                </Badge>
              );
            })}
            {tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
            )}
          </div>

          {/* Col 4: Status */}
          <div className="flex justify-center">
            <ScenarioStatusBadge status={tc.status as TestCaseStatus} className="shrink-0" />
          </div>

          {/* Col 5: Priority */}
          <div className="flex justify-center">
            <PriorityBadge priority={tc.priority} className="shrink-0" />
          </div>

          {/* Col 6: Steps count */}
          <div className="flex justify-center">
            <span className="text-xs text-muted-foreground">{steps.length}</span>
          </div>

          {/* Col 7: Actions */}
          <div className="flex items-center justify-end gap-1">
            {isRunnable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Run this test"
                disabled={isBatchRunning}
                onClick={(e) => { e.stopPropagation(); onRunSingle(); }}
              >
                <Play className="h-3.5 w-3.5 text-green-600" />
              </Button>
            )}
            {tc.status === "draft" && steps.length === 0 && (
              <GenerateStepsButton
                testCase={tc}
                projectId={projectIdNum}
                onStepsGenerated={handleTestCaseUpdate}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Move to folder"
              aria-label="Move to folder"
              data-testid={`move-folder-${tc.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setMovingTestCase(tc);
              }}
            >
              <FolderInput className="h-3.5 w-3.5" />
            </Button>
            <ScenarioStatusTransition
              testCase={tc}
              onStatusChange={handleTestCaseUpdate}
            />
            <VisibilityToggle
              testCase={tc}
              onVisibilityChange={handleTestCaseUpdate}
            />
          </div>
        </div>

        {/* Expanded detail panel */}
        {expanded && (
          <div className="border-t border-border bg-muted/30">
            {tc.natural_query && (
              <div className="px-4 pt-3 pb-1">
                <p className="text-sm text-muted-foreground">{tc.natural_query}</p>
              </div>
            )}
            {tags.length > 2 && (
              <div className="px-4 py-1.5 flex items-center gap-1 flex-wrap">
                <Tag className="h-3 w-3 text-muted-foreground" />
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
            {steps.length > 0 && (
              <div className="px-4 py-3 pl-10">
                <ol className="space-y-1.5">
                  {steps.map((step: TestStep, i: number) => (
                    <li key={i} className="flex items-baseline gap-2 text-sm">
                      <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 text-right">
                        {i + 1}.
                      </span>
                      <Badge variant="secondary" className="text-xs shrink-0 font-normal">
                        {ACTION_LABELS[step.action] || step.action}
                      </Badge>
                      {step.description && (
                        <span className="text-muted-foreground truncate">{step.description}</span>
                      )}
                      {!step.description && step.target && (
                        <span className="text-muted-foreground truncate">{step.target}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
