"use client";

/**
 * EnvironmentContext — tracks the active environment per project.
 *
 * Active environment is persisted in localStorage under the key
 * `env:{projectId}` so switching survives page navigation.
 * Components read activeEnv and call setActiveEnv to switch.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Environment } from "@/types/environment";
import { environmentsApi } from "@/lib/api/environments";

interface EnvironmentContextValue {
  environments: Environment[];
  activeEnv: Environment | null;
  setActiveEnv: (env: Environment | null) => void;
  loadEnvironments: (projectId: number) => Promise<void>;
  isLoading: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextValue>({
  environments: [],
  activeEnv: null,
  setActiveEnv: () => {},
  loadEnvironments: async () => {},
  isLoading: false,
});

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnv, setActiveEnvState] = useState<Environment | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setActiveEnv = useCallback((env: Environment | null) => {
    setActiveEnvState(env);
    if (currentProjectId) {
      if (env) {
        localStorage.setItem(`env:${currentProjectId}`, String(env.id));
      } else {
        localStorage.removeItem(`env:${currentProjectId}`);
      }
    }
  }, [currentProjectId]);

  const loadEnvironments = useCallback(async (projectId: number) => {
    setIsLoading(true);
    setCurrentProjectId(projectId);
    try {
      const envs = await environmentsApi.list(projectId);
      setEnvironments(envs);

      // Restore previously selected env from localStorage
      const savedId = localStorage.getItem(`env:${projectId}`);
      if (savedId) {
        const saved = envs.find((e) => e.id === Number(savedId));
        setActiveEnvState(saved ?? null);
      } else {
        // Auto-select default env if one exists
        const defaultEnv = envs.find((e) => e.is_default);
        setActiveEnvState(defaultEnv ?? null);
      }
    } catch {
      setEnvironments([]);
      setActiveEnvState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <EnvironmentContext.Provider value={{ environments, activeEnv, setActiveEnv, loadEnvironments, isLoading }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  return useContext(EnvironmentContext);
}
