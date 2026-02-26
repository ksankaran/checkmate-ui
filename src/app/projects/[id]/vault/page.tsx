"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { KeyRound, Database } from "lucide-react";
import { CredentialsTab } from "@/components/vault/CredentialsTab";
import { TestDataTab } from "@/components/vault/TestDataTab";
import { PageHeader } from "@/components/shared/PageHeader";
import { useEnvironment } from "@/context/EnvironmentContext";
import { cn } from "@/lib/utils";

type VaultTab = "credentials" | "test-data";

export default function VaultPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const { activeEnv } = useEnvironment();
  const [activeTab, setActiveTab] = useState<VaultTab>("credentials");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vault"
        subtitle={
          activeEnv
            ? `Showing items for ${activeEnv.name} + global items`
            : "Manage encrypted credentials and test data for your project."
        }
      />

      <div className="px-6 space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("credentials")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
              activeTab === "credentials"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80",
            )}
          >
            <KeyRound className="h-4 w-4" />
            Credentials
          </button>
          <button
            onClick={() => setActiveTab("test-data")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
              activeTab === "test-data"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80",
            )}
          >
            <Database className="h-4 w-4" />
            Test Data
          </button>
        </div>

        {activeTab === "credentials" && (
          <CredentialsTab projectId={projectId} activeEnv={activeEnv} />
        )}
        {activeTab === "test-data" && (
          <TestDataTab projectId={projectId} activeEnv={activeEnv} />
        )}
      </div>
    </div>
  );
}
