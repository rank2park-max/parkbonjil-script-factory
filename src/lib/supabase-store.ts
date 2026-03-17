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
  content?: string | null;
  research_notes?: unknown;
  chat_history?: unknown;
  created_at: string;
  updated_at: string;
}

/** v2 에디터: 리서치 노트 항목 */
export interface ResearchNote {
  id: string;
  content: string;
  created_at: string;
}

/** v2 에디터: AI 채팅 메시지 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** v2 에디터 프로젝트 데이터 */
export interface EditorProjectData {
  id: string;
  title: string;
  content: string;
  research_notes: ResearchNote[];
  chat_history: ChatMessage[];
  created_at: string;
  updated_at: string;
}

/** v2: 새 에디터 프로젝트 생성 (주제만 입력) */
export async function createEditorProject(title: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        title,
        duration: 15,
        outline: [],
        current_step: -1,
        status: "in_progress",
        content: "",
        research_notes: [],
        chat_history: [],
      })
      .select("id")
      .single();

    return error || !data ? null : data.id;
  } catch {
    return null;
  }
}

/** v2: 에디터 프로젝트 로드 */
export async function loadEditorProject(
  projectId: string
): Promise<EditorProjectData | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, content, research_notes, chat_history, created_at, updated_at")
      .eq("id", projectId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      title: data.title || "",
      content: data.content ?? "",
      research_notes: Array.isArray(data.research_notes) ? data.research_notes : [],
      chat_history: Array.isArray(data.chat_history) ? data.chat_history : [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch {
    return null;
  }
}

/** v2: 에디터 프로젝트 저장 */
export async function saveEditorProject(
  projectId: string,
  updates: {
    content?: string;
    research_notes?: ResearchNote[];
    chat_history?: ChatMessage[];
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const payload: Record<string, unknown> = {};
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.research_notes !== undefined)
      payload.research_notes = updates.research_notes;
    if (updates.chat_history !== undefined)
      payload.chat_history = updates.chat_history;

    await supabase.from("projects").update(payload).eq("id", projectId);
  } catch (err) {
    console.error("Editor save error:", err);
  }
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

// ─── v3: 리서치 패널 ─────────────────────────────────────────────────────────

export interface ResearchHistoryItem {
  id: string;
  script_id: string;
  query: string;
  result: string;
  created_at: string;
}

export interface ScriptNoteData {
  id: string;
  script_id: string;
  content: string;
  updated_at: string;
}

export interface ScriptReference {
  id: string;
  script_id: string;
  url: string | null;
  title: string | null;
  file_url: string | null;
  file_content: string | null;
  created_at: string;
}

export async function loadResearchHistory(
  scriptId: string
): Promise<ResearchHistoryItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("research_history")
      .select("id, script_id, query, result, created_at")
      .eq("script_id", scriptId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as ResearchHistoryItem[];
  } catch {
    return [];
  }
}

export async function insertResearchHistory(
  scriptId: string,
  query: string,
  result: string
): Promise<ResearchHistoryItem | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("research_history")
      .insert({ script_id: scriptId, query, result })
      .select("id, script_id, query, result, created_at")
      .single();

    if (error || !data) return null;
    return data as ResearchHistoryItem;
  } catch {
    return null;
  }
}

export async function loadScriptNote(
  scriptId: string
): Promise<ScriptNoteData | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("script_notes")
      .select("id, script_id, content, updated_at")
      .eq("script_id", scriptId)
      .maybeSingle();

    if (error) return null;
    return data as ScriptNoteData | null;
  } catch {
    return null;
  }
}

export async function upsertScriptNote(
  scriptId: string,
  content: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from("script_notes").upsert(
      {
        script_id: scriptId,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "script_id" }
    );
  } catch (err) {
    console.error("Script note save error:", err);
  }
}

export async function loadScriptReferences(
  scriptId: string
): Promise<ScriptReference[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("script_references")
      .select("id, script_id, url, title, file_url, file_content, created_at")
      .eq("script_id", scriptId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as ScriptReference[];
  } catch {
    return [];
  }
}

export async function addScriptReference(
  scriptId: string,
  ref: { url?: string; title?: string; file_url?: string; file_content?: string }
): Promise<ScriptReference | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("script_references")
      .insert({
        script_id: scriptId,
        url: ref.url ?? null,
        title: ref.title ?? null,
        file_url: ref.file_url ?? null,
        file_content: ref.file_content ?? null,
      })
      .select("id, script_id, url, title, file_url, file_content, created_at")
      .single();

    if (error || !data) return null;
    return data as ScriptReference;
  } catch {
    return null;
  }
}

export async function removeScriptReference(
  id: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("script_references")
      .delete()
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

// ─── v4: AI 채팅 (chat_messages) ───────────────────────────────────────────

export interface ChatMessageRow {
  id: string;
  script_id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  created_at: string;
}

export async function loadChatMessages(
  scriptId: string
): Promise<ChatMessageRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, script_id, role, content, model, created_at")
      .eq("script_id", scriptId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data as ChatMessageRow[];
  } catch {
    return [];
  }
}

export async function insertChatMessage(
  scriptId: string,
  role: "user" | "assistant",
  content: string,
  model: string | null
): Promise<ChatMessageRow | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ script_id: scriptId, role, content, model })
      .select("id, script_id, role, content, model, created_at")
      .single();

    if (error || !data) return null;
    return data as ChatMessageRow;
  } catch {
    return null;
  }
}
