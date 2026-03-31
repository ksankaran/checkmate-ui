"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2, AlertTriangle, CheckCircle2, FolderPlus, FolderInput } from "lucide-react";
import { toast } from "sonner";
import { promoteApi } from "@/lib/api/promote";
import type { Remote, RemoteProject, PromoteResult } from "@/lib/api/promote";
import type { TestCase } from "@/types";

interface PromoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCaseIds: number[];
  testCases: TestCase[];
  projectId: number;
  projectName: string;
}

const VAULT_REF_PATTERN = /\{\{\w+\.\w+\}\}/g;

function detectVaultRefs(testCases: TestCase[]): string[] {
  const refs = new Set<string>();
  for (const tc of testCases) {
    const matches = (tc.steps || "").match(VAULT_REF_PATTERN);
    if (matches) {
      matches.forEach((m) => refs.add(m));
    }
  }
  return Array.from(refs);
}

type ProjectChoice = "create_new" | "existing";

export function PromoteDialog({
  open,
  onOpenChange,
  testCaseIds,
  testCases,
  projectId,
  projectName,
}: PromoteDialogProps) {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedRemote, setSelectedRemote] = useState<string>("");
  const [promoting, setPromoting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<PromoteResult | null>(null);

  // Project mapping state
  const [remoteProjects, setRemoteProjects] = useState<RemoteProject[]>([]);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const [matchedProject, setMatchedProject] = useState<RemoteProject | null>(null);
  const [projectChoice, setProjectChoice] = useState<ProjectChoice>("create_new");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const vaultRefs = detectVaultRefs(testCases);

  // Fetch remotes on open
  useEffect(() => {
    if (open) {
      setFetching(true);
      setResult(null);
      setSelectedRemote("");
      setRemoteProjects([]);
      setMatchedProject(null);
      setProjectChoice("create_new");
      setSelectedProjectId("");
      promoteApi
        .getRemotes()
        .then(setRemotes)
        .catch((err) => {
          console.error("Failed to fetch remotes:", err);
          toast.error("Failed to fetch remote environments");
        })
        .finally(() => setFetching(false));
    }
  }, [open]);

  // Fetch remote projects when remote is selected
  useEffect(() => {
    if (!selectedRemote) {
      setRemoteProjects([]);
      setMatchedProject(null);
      return;
    }
    setFetchingProjects(true);
    setMatchedProject(null);
    setProjectChoice("create_new");
    setSelectedProjectId("");
    promoteApi
      .getRemoteProjects(selectedRemote)
      .then((projects) => {
        setRemoteProjects(projects);
        // Auto-match by project name
        const match = projects.find(
          (p) => p.name.toLowerCase() === projectName.toLowerCase()
        );
        if (match) {
          setMatchedProject(match);
          setProjectChoice("existing");
          setSelectedProjectId(String(match.id));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch remote projects:", err);
        toast.error("Failed to fetch projects from remote");
      })
      .finally(() => setFetchingProjects(false));
  }, [selectedRemote, projectName]);

  async function handlePromote() {
    if (!selectedRemote) return;

    let targetProjectId: number | null = null;
    if (projectChoice === "existing" && selectedProjectId) {
      targetProjectId = parseInt(selectedProjectId, 10);
    }

    setPromoting(true);
    try {
      const res = await promoteApi.promote({
        test_case_ids: testCaseIds,
        project_id: projectId,
        remote_name: selectedRemote,
        target_project_id: targetProjectId,
      });
      setResult(res);
      toast.success(
        `Promoted ${res.test_cases_created} test case${res.test_cases_created !== 1 ? "s" : ""} to ${selectedRemote}`
      );
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to promote test cases";
      toast.error(msg);
    } finally {
      setPromoting(false);
    }
  }

  const canPromote =
    selectedRemote &&
    !fetchingProjects &&
    (projectChoice === "create_new" ||
      (projectChoice === "existing" && selectedProjectId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Promote Test Cases
          </DialogTitle>
          <DialogDescription>
            Copy {testCaseIds.length} test case
            {testCaseIds.length !== 1 ? "s" : ""} from{" "}
            <span className="font-medium text-foreground">{projectName}</span>{" "}
            to a remote environment.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* --- Result view --- */
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Promotion complete
            </div>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>
                Test cases created:{" "}
                <span className="font-medium text-foreground">
                  {result.test_cases_created}
                </span>
              </p>
              {result.test_cases_skipped > 0 && (
                <p>
                  Test cases skipped (already exist):{" "}
                  <span className="font-medium text-foreground">
                    {result.test_cases_skipped}
                  </span>
                </p>
              )}
              <p>
                Fixtures created:{" "}
                <span className="font-medium text-foreground">
                  {result.fixtures_created}
                </span>
              </p>
              {result.fixtures_reused > 0 && (
                <p>
                  Fixtures reused:{" "}
                  <span className="font-medium text-foreground">
                    {result.fixtures_reused}
                  </span>
                </p>
              )}
            </div>
            {result.warnings.length > 0 && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings
                </div>
                <ul className="text-xs text-amber-600 dark:text-amber-500 space-y-1">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* --- Form view --- */
          <div className="space-y-4 py-2">
            {fetching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : remotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No remote environments configured.
              </p>
            ) : (
              <>
                {/* Remote selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Target Environment
                  </label>
                  <Select
                    value={selectedRemote}
                    onValueChange={setSelectedRemote}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select environment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {remotes.map((r) => (
                        <SelectItem key={r.name} value={r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project mapping — shown after remote is selected */}
                {selectedRemote && (
                  fetchingProjects ? (
                    <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking projects on {selectedRemote}...
                    </div>
                  ) : matchedProject ? (
                    /* Project found on target — auto-matched */
                    <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Project &quot;{matchedProject.name}&quot; found on {selectedRemote}
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                        Test cases will be imported into this project.
                      </p>
                    </div>
                  ) : (
                    /* Project NOT found — show options */
                    <div className="space-y-3">
                      <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-4 w-4" />
                          Project &quot;{projectName}&quot; not found on {selectedRemote}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {/* Create new option */}
                        <label
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                            projectChoice === "create_new"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-accent/50"
                          }`}
                          onClick={() => {
                            setProjectChoice("create_new");
                            setSelectedProjectId("");
                          }}
                        >
                          <input
                            type="radio"
                            name="projectChoice"
                            checked={projectChoice === "create_new"}
                            onChange={() => {
                              setProjectChoice("create_new");
                              setSelectedProjectId("");
                            }}
                            className="accent-primary"
                          />
                          <FolderPlus className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Create new project</p>
                            <p className="text-xs text-muted-foreground">
                              A new &quot;{projectName}&quot; project will be created on {selectedRemote}
                            </p>
                          </div>
                        </label>

                        {/* Import into existing option */}
                        {remoteProjects.length > 0 && (
                          <label
                            className={`flex items-start gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                              projectChoice === "existing"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-accent/50"
                            }`}
                            onClick={() => setProjectChoice("existing")}
                          >
                            <input
                              type="radio"
                              name="projectChoice"
                              checked={projectChoice === "existing"}
                              onChange={() => setProjectChoice("existing")}
                              className="accent-primary mt-1"
                            />
                            <FolderInput className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">Import into existing project</p>
                              {projectChoice === "existing" && (
                                <div className="mt-2">
                                  <Select
                                    value={selectedProjectId}
                                    onValueChange={setSelectedProjectId}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Select project..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {remoteProjects.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                          {p.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  )
                )}

                {/* What will be promoted */}
                {selectedRemote && !fetchingProjects && (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">
                      What will be promoted:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>
                        {testCaseIds.length} test case
                        {testCaseIds.length !== 1 ? "s" : ""} with steps
                      </li>
                      <li>Associated fixtures (deduplicated)</li>
                    </ul>
                  </div>
                )}

                {vaultRefs.length > 0 && selectedRemote && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      Vault References Detected
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      These test cases reference credentials ({vaultRefs.join(", ")})
                      that may not exist on the target. Ensure matching vault
                      entries are configured there.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={promoting}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePromote}
                disabled={promoting || !canPromote}
              >
                {promoting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Promoting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Promote
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
