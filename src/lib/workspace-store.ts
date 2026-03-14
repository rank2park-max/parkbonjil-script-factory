"use client";

import { useState, useEffect, useCallback } from "react";
import { WorkspaceData, OutlineItem, IntroData } from "./types";

const EMPTY_INTRO: IntroData = {
  drafts: [],
  selectedDraftIndex: null,
  editedDraft: "",
  finalDraft: null,
};

const STORAGE_KEY = "script-factory-workspace";

function createEmptyOutlineItem(title: string): OutlineItem {
  return {
    title,
    drafts: [],
    selectedDraftIndex: null,
    editedDraft: "",
    rewrittenDraft: null,
    editedRewrite: "",
    finalDraft: null,
  };
}

export function initializeWorkspace(
  topic: string,
  duration: number,
  outlineTitles: string[]
): WorkspaceData {
  const data: WorkspaceData = {
    topic,
    duration,
    intro: { ...EMPTY_INTRO },
    outline: outlineTitles.map(createEmptyOutlineItem),
    currentStep: -1,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function useWorkspace() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.intro) {
          parsed.intro = { ...EMPTY_INTRO };
          parsed.currentStep = -1;
        }
        setData(parsed);
      } catch {
        setData(null);
      }
    }
    setLoaded(true);
  }, []);

  const save = useCallback((newData: WorkspaceData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }, []);

  const updateOutlineItem = useCallback(
    (index: number, updates: Partial<OutlineItem>) => {
      if (!data) return;
      const newOutline = [...data.outline];
      newOutline[index] = { ...newOutline[index], ...updates };
      save({ ...data, outline: newOutline });
    },
    [data, save]
  );

  const setCurrentStep = useCallback(
    (step: number) => {
      if (!data) return;
      save({ ...data, currentStep: step });
    },
    [data, save]
  );

  const clearWorkspace = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(null);
  }, []);

  return { data, loaded, save, updateOutlineItem, setCurrentStep, clearWorkspace };
}

type ApiProvider = "openai" | "anthropic" | "google" | "xai";

export function getApiKey(provider: ApiProvider): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`script-factory-${provider}-key`);
}

export function setApiKey(provider: ApiProvider, key: string) {
  localStorage.setItem(`script-factory-${provider}-key`, key);
}
