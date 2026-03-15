import { getSupabaseClient } from "./supabase";
import { WorkspaceData, IntroData, OutlineItem } from "./types";

const EMPTY_INTRO: IntroData = {
  drafts: [],
  selectedDraftIndex: null,
  editedDraft: "",
  finalDraft: null,
};

export async function createSupabaseProject(
  topic: string,
  duration: number,
  outlineTitles: string[]
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        title: topic,
        duration,
        outline: outlineTitles,
        current_step: -1,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (error || !project) return null;

    if (outlineTitles.length > 0) {
      const sections = outlineTitles.map((title, index) => ({
        project_id: project.id,
        section_index: index,
        title,
        status: "pending",
      }));
      await supabase.from("sections").insert(sections);
    }

    return project.id;
  } catch {
    return null;
  }
}

export async function loadSupabaseProject(
  projectId: string
): Promise<WorkspaceData | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (pErr || !project) return null;

    const { data: sections, error: sErr } = await supabase
      .from("sections")
      .select("*")
      .eq("project_id", projectId)
      .order("section_index");

    if (sErr) return null;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const outline: OutlineItem[] = (sections || []).map((s: any) => ({
      title: s.title,
      drafts: s.drafts || [],
      selectedDraftIndex: s.selected_draft_index ?? null,
      editedDraft: s.selected_draft || "",
      rewrittenDraft: s.rewritten || null,
      editedRewrite: s.rewritten || "",
      finalDraft: s.final || null,
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return {
      topic: project.title,
      duration: project.duration,
      intro: {
        ...EMPTY_INTRO,
        finalDraft: project.intro || null,
      },
      outline,
      currentStep: project.current_step ?? -1,
    };
  } catch {
    return null;
  }
}

export async function saveSupabaseProject(
  projectId: string,
  data: WorkspaceData
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const allCompleted =
      data.intro.finalDraft !== null &&
      data.outline.length > 0 &&
      data.outline.every((item) => item.finalDraft !== null);

    await supabase
      .from("projects")
      .update({
        title: data.topic,
        duration: data.duration,
        intro: data.intro.finalDraft,
        current_step: data.currentStep,
        outline: data.outline.map((item) => item.title),
        status: allCompleted ? "completed" : "in_progress",
      })
      .eq("id", projectId);

    for (const [index, item] of data.outline.entries()) {
      let status = "pending";
      if (item.finalDraft) status = "completed";
      else if (item.rewrittenDraft || item.editedRewrite) status = "rewritten";
      else if (item.selectedDraftIndex !== null) status = "selected";
      else if (item.drafts.length > 0) status = "drafted";

      await supabase
        .from("sections")
        .update({
          title: item.title,
          drafts: item.drafts,
          selected_draft_index: item.selectedDraftIndex,
          selected_draft: item.editedDraft || null,
          rewritten: item.editedRewrite || item.rewrittenDraft || null,
          final: item.finalDraft,
          status,
        })
        .eq("project_id", projectId)
        .eq("section_index", index);
    }
  } catch (err) {
    console.error("Supabase save error:", err);
  }
}

export interface ProjectListItem {
  id: string;
  title: string;
  duration: number;
  outline: string[];
  intro: string | null;
  current_step: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function listSupabaseProjects(): Promise<ProjectListItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function deleteSupabaseProject(
  projectId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);
    return !error;
  } catch {
    return false;
  }
}
