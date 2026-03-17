"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  loadEditorProject,
  saveEditorProject,
  type EditorProjectData,
  type ResearchNote,
} from "@/lib/supabase-store";
import { getApiKey } from "@/lib/workspace-store";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Copy,
  Download,
  Sparkles,
  Expand,
  PenLine,
  MessageCircle,
  Menu,
  RefreshCw,
  Film,
} from "lucide-react";
import { ResearchPanel } from "@/components/ResearchPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { RewriteCompareView } from "@/components/RewriteCompareView";
import { getSupabaseHeaders } from "@/lib/supabase";

/** content? '---'? split, ? ?? ??? ?? */
function parseSections(content: string) {
  if (!content.trim()) return [];
  const sep = "\n---\n";
  const parts = content.split(sep);
  let idx = 0;
  return parts.map((part: string) => {
    const trimmed = part.trim();
    const firstLine = trimmed.split("\n")[0]?.trim() || "(?? ??)";
    const title = firstLine.length > 40 ? firstLine.slice(0, 40) + "..." : firstLine;
    const start = idx;
    idx += part.length + sep.length;
    return { title, startIndex: start };
  });
}

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");

  const [project, setProject] = useState<EditorProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftCollapsed, setLeftCollapsed] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768
  );
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [floatingLoading, setFloatingLoading] = useState<string | null>(null);
  const [rewriteCompare, setRewriteCompare] = useState<{ original: string; rewritten: string } | null>(null);
  const [fullRewriteLoading, setFullRewriteLoading] = useState(false);
  const [taggingLoading, setTaggingLoading] = useState(false);

  const loadProject = useCallback(async () => {
    if (!projectId) return null;
    return await loadEditorProject(projectId);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    loadProject().then((data) => {
      if (!cancelled) setProject(data ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [loadProject]);

  const debouncedSave = useCallback((updates: { content?: string; research_notes?: { id: string; content: string; created_at: string }[] }) => {
    if (!projectId || !project) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveEditorProject(projectId, updates);
    }, 1500);
  }, [projectId, project]);

  const updateContent = useCallback((content: string) => {
    if (!project) return;
    setProject((p) => p ? { ...p, content } : null);
    debouncedSave({ content });
  }, [project, debouncedSave]);

  const insertTextToEditor = useCallback(
    (text: string) => {
      if (!project) return;
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = project.content.slice(0, start);
      const after = project.content.slice(end);
      const next = before + text + after;
      updateContent(next);
      setTimeout(() => {
        const newPos = start + text.length;
        ta.setSelectionRange(newPos, newPos);
      }, 0);
    },
    [project, updateContent]
  );

  const handleCopy = useCallback(() => {
    if (!project?.content) return;
    navigator.clipboard.writeText(project.content);
  }, [project?.content]);

  const handleDownload = useCallback(() => {
    if (!project?.content) return;
    const blob = new Blob([project.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (project.title || "script") + " - script.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [project?.content, project?.title]);

  const handleFullRewrite = useCallback(async () => {
    if (!project?.content.trim() || fullRewriteLoading) return;
    const apiKey = getApiKey("anthropic");
    if (!apiKey) {
      alert("???? Anthropic API ?? ??????.");
      return;
    }
    setFullRewriteLoading(true);
    try {
      let referenceMaterials = "";
      try {
        const refRes = await fetch("/api/reference-materials", {
          headers: getSupabaseHeaders(),
        });
        if (refRes.ok) {
          const refData = await refRes.json();
          if (Array.isArray(refData) && refData.length > 0) {
            referenceMaterials = refData
              .map((m: { title?: string; content?: string }) => `${m.title || ""}\n${m.content || ""}`)
              .join("\n\n");
          }
        }
      } catch {
        /* ignore */
      }
      const res = await fetch("/api/rewrite-full", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anthropic-api-key": apiKey,
        },
        body: JSON.stringify({
          text: project.content,
          topic: project.title,
          referenceMaterials: referenceMaterials || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "???? ??");
      setRewriteCompare({ original: project.content, rewritten: data.result });
    } catch (err) {
      alert(err instanceof Error ? err.message : "???? ? ??? ??????.");
    } finally {
      setFullRewriteLoading(false);
    }
  }, [project, fullRewriteLoading]);

  const handleApplyRewrite = useCallback(
    (merged: string) => {
      updateContent(merged);
      setRewriteCompare(null);
    },
    [updateContent]
  );

  const handleTagSources = useCallback(async () => {
    if (!project?.content.trim() || taggingLoading) return;
    const apiKey = getApiKey("anthropic");
    if (!apiKey) {
      alert("???? Anthropic API ?? ??????.");
      return;
    }
    setTaggingLoading(true);
    try {
      const res = await fetch("/api/tag-sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anthropic-api-key": apiKey,
        },
        body: JSON.stringify({ script: project.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "?? ?? ??");
      if (data.taggedScript) updateContent(data.taggedScript);
    } catch (err) {
      alert(err instanceof Error ? err.message : "?? ?? ? ??? ??????.");
    } finally {
      setTaggingLoading(false);
    }
  }, [project, updateContent, taggingLoading]);

  const sections = project ? parseSections(project.content) : [];
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const fn = () => setIsMobile(window.innerWidth < 768);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const scrollToSection = useCallback((startIndex: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(startIndex, startIndex);
    ta.scrollTop = ta.scrollHeight * (startIndex / Math.max(1, ta.value.length));
  }, []);

  const checkSelection = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start < end) {
      setSelection({ start, end, text: ta.value.slice(start, end) });
    } else {
      setSelection(null);
    }
  }, []);

  const replaceSelection = useCallback((newText: string) => {
    if (!selection || !project) return;
    const before = project.content.slice(0, selection.start);
    const after = project.content.slice(selection.end);
    const next = before + newText + after;
    updateContent(next);
    setSelection(null);
    setFloatingLoading(null);
  }, [selection, project, updateContent]);

  const runFloatingAction = useCallback(async (action: string) => {
    if (!selection?.text.trim()) return;
    setFloatingLoading(action);
    try {
      if (action === "ask") {
        const msg =
          "? ???? ?? ?????:\n\n\"" +
          selection.text.slice(0, 500) +
          (selection.text.length > 500 ? "..." : "") +
          "\"\n\n? ??? ??? ?? ??????.";
        setPendingChatPrompt(msg);
        setRightCollapsed(false);
        setFloatingLoading(null);
      } else {
        const endpoint = action === "refine" ? "/api/refine-text" : action === "expand" ? "/api/expand-text" : "/api/rewrite-full";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-openai-api-key": getApiKey("openai") || "",
            ...(action === "rewrite" && { "x-anthropic-api-key": getApiKey("anthropic") || "" }),
          },
          body: JSON.stringify({ text: selection.text, ...(action === "rewrite" && { topic: project?.title }) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        replaceSelection(data.result);
      }
    } catch {
      setFloatingLoading(null);
    }
  }, [selection, project, projectId, replaceSelection]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">????? ?? ? ????.</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          ???
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      <aside
        className={`${leftCollapsed ? "w-10" : "w-72 md:w-80"} flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all shrink-0`}
      >
        <div className="flex items-center justify-between h-12 px-3 border-b border-zinc-800">
          {!leftCollapsed && (
            <span className="text-sm font-medium text-zinc-400">??? ??</span>
          )}
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {leftCollapsed ? (
              isMobile ? <Menu className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
        {!leftCollapsed && (
          <div className="flex-1 flex flex-col min-h-0">
            <ResearchPanel
              scriptId={projectId || project.id}
              onInsertToEditor={insertTextToEditor}
              isMobile={isMobile}
            />
            {sections.length > 0 && (
              <div className="border-t border-zinc-800 p-3 shrink-0">
                <h4 className="text-xs font-medium text-zinc-500 mb-2">?? ??</h4>
                <div className="space-y-1">
                  {sections.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => scrollToSection(s.startIndex)}
                      className="w-full text-left text-sm text-zinc-400 hover:text-white py-1.5 px-2 rounded hover:bg-zinc-800 truncate"
                    >
                      {i + 1}. {s.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950">
          <span className="text-sm font-medium text-white truncate">{project.title}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFullRewrite}
              disabled={!project.content.trim() || fullRewriteLoading}
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 border border-indigo-500/50 rounded-md text-white flex items-center gap-1.5 transition-colors"
            >
              {fullRewriteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              ?? ????
            </button>
            <button
              onClick={handleTagSources}
              disabled={!project.content.trim() || taggingLoading}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-zinc-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {taggingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />}
              ?? ??
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              ??
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              ????
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <textarea
            ref={textareaRef}
            value={project.content}
            onChange={(e) => updateContent(e.target.value)}
            onMouseUp={checkSelection}
            onKeyUp={checkSelection}
            placeholder="??? ???? ?????. '---'? ?? ??. ??? ?? ? AI ??? ? ? ????."
            className="w-full h-full p-6 bg-transparent text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none text-base leading-relaxed"
          />
          {selection && selection.text.trim() && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10">
              <button
                onClick={() => runFloatingAction("refine")}
                disabled={!!floatingLoading}
                className="px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                {floatingLoading === "refine" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                ???
              </button>
              <button
                onClick={() => runFloatingAction("expand")}
                disabled={!!floatingLoading}
                className="px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                {floatingLoading === "expand" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Expand className="w-3 h-3" />}
                ????
              </button>
              <button
                onClick={() => runFloatingAction("rewrite")}
                disabled={!!floatingLoading}
                className="px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                {floatingLoading === "rewrite" ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
                ????
              </button>
              <button
                onClick={() => runFloatingAction("ask")}
                disabled={!!floatingLoading}
                className="px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                {floatingLoading === "ask" ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                AI ????
              </button>
            </div>
          )}
        </div>
      </div>

      <aside
        className={`${rightCollapsed ? "w-10" : "w-80"} flex flex-col border-l border-zinc-800 bg-zinc-950 transition-all shrink-0`}
      >
        <div className="flex items-center justify-between h-12 px-3 border-b border-zinc-800">
          {!rightCollapsed && (
            <span className="text-sm font-medium text-zinc-400">AI ?????</span>
          )}
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {rightCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        {!rightCollapsed && (
          <div className="flex-1 flex flex-col min-h-0">
            <ChatPanel
              scriptId={projectId || project.id}
              scriptContent={project.content}
              onInsertToEditor={insertTextToEditor}
              isRightCollapsed={false}
              onToggleCollapsed={() => {}}
              pendingPrompt={pendingChatPrompt}
              onClearPendingPrompt={() => setPendingChatPrompt(null)}
            />
          </div>
        )}
      </aside>

      {rewriteCompare && (
        <RewriteCompareView
          original={rewriteCompare.original}
          rewritten={rewriteCompare.rewritten}
          onApply={handleApplyRewrite}
          onClose={() => setRewriteCompare(null)}
        />
      )}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
