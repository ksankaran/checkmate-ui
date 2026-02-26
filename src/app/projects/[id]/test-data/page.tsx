"use client";

import { useParams } from "next/navigation";
import { TestDataTab } from "@/components/vault/TestDataTab";
import { PageHeader } from "@/components/shared/PageHeader";
import { useEnvironment } from "@/context/EnvironmentContext";

export default function TestDataPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const { activeEnv } = useEnvironment();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Data"
        subtitle="Store structured datasets for use in test cases."
      />

      <div className="px-6">
        <TestDataTab projectId={projectId} activeEnv={activeEnv} />
      </div>
    </div>
  );
}
