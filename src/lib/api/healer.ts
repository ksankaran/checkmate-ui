import { API_URL } from "@/lib/api";
import type { HealSuggestion } from "@/types/healer";

export const healerApi = {
  async suggest(testCaseId: number, runId: number): Promise<HealSuggestion> {
    const res = await fetch(`${API_URL}/api/test-cases/${testCaseId}/heal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "Unknown error");
      throw new Error(detail || "Heal analysis failed");
    }
    return res.json();
  },
};
