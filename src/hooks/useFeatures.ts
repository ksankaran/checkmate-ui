"use client";

import { useEffect, useState } from "react";
import { settingsApi, type Features } from "@/lib/api/settings";

const defaultFeatures: Features = {
  intelligent_retry: false,
  multiple_environments: false,
};

export function useFeatures() {
  const [features, setFeatures] = useState<Features>(defaultFeatures);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi
      .getFeatures()
      .then(setFeatures)
      .catch((err) => {
        console.error("Failed to fetch features:", err);
        // Keep default features on error
      })
      .finally(() => setLoading(false));
  }, []);

  return { features, loading };
}
