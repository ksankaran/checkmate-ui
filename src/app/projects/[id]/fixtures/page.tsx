"use client";

import { useParams } from "next/navigation";
import { FixturesTab } from "@/components/fixtures/FixturesTab";

export default function FixturesPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <FixturesTab projectId={projectId} />
    </div>
  );
}
