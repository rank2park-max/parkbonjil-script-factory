"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WorkspaceData, OutlineItem, IntroData } from "./types";
import {
  createSupabaseProject,
  loadSupabaseProject,
  saveSupabaseProject,
} from "./supabase-store";

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

export async function initializeWorkspace(
  topic: string,
  duration: number,
  outlineTitles: string[]
): Promise<string | null> {
  const data: WorkspaceData = {
    topic,
    duration,
    intro: { ...EMPTY_INTRO },
    outline: outlineTitles.map(createEmptyOutlineItem),
    currentStep: -1,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  const projectId = await createSupabaseProject(topic, duration, outlineTitles);
  return projectId;
}

export function useWorkspace(projectId?: string | null) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (projectId) {
        const supabaseData = await loadSupabaseProject(projectId);
        if (!cancelled && supabaseData) {
          setData(supabaseData);
          setLoaded(true);
          return;
        }
      }

      if (!cancelled) {
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
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const save = useCallback((newData: WorkspaceData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));

    const pid = projectIdRef.current;
    if (pid) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveSupabaseProject(pid, newData);
      }, 1500);
    }
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

type ApiProvider = "openai" | "anthropic" | "google" | "xai" | "perplexity";

export function getApiKey(provider: ApiProvider): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`script-factory-${provider}-key`);
}

export function setApiKey(provider: ApiProvider, key: string) {
  localStorage.setItem(`script-factory-${provider}-key`, key);
}
