const fs = require("fs");
const path = require("path");

const content = `"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  loadEditorProject,
  saveEditorProject,
  type EditorProjectData,
  type ResearchNote,
  type ChatMessage,
} from "@/lib/supabase-store";
import { getApiKey } from "@/lib/workspace-store";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Download,
  Sparkles,
  Expand,
  PenLine,
  MessageCircle,
} from "lucide-react";

/** content를 '---'로 split, 첫 줄을 목차로 표시 */
function parseSections(content) {
  if (!content.trim()) return [];
  const sep = "\\n---\\n";
  const parts = content.split(sep);
  let idx = 0;
  return parts.map((part) => {
    const trimmed = part.trim();
    const firstLine = trimmed.split("\\n")[0]?.trim() || "(제목 없음)";
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

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const saveTimerRef = useRef(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [selection, setSelection] = useState(null);
  const [floatingLoading, setFloatingLoading] = useState(null);

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

  const debouncedSave = useCallback((updates) => {
    if (!projectId || !project) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveEditorProject(projectId, updates);
    }, 1500);
  }, [projectId, project]);

  const updateContent = useCallback((content) => {
    if (!project) return;
    setProject((p) => p ? { ...p, content } : null);
    debouncedSave({ content });
  }, [project, debouncedSave]);

  const addResearchNote = useCallback(() => {
    if (!project) return;
    const note = {
      id: crypto.randomUUID(),
      content: "",
      created_at: new Date().toISOString(),
    };
    const notes = [...project.research_notes, note];
    setProject((p) => p ? { ...p, research_notes: notes } : null);
    saveEditorProject(projectId, { research_notes: notes });
  }, [project, projectId]);

  const updateResearchNote = useCallback((id, content) => {
    if (!project) return;
    const notes = project.research_notes.map((n) =>
      n.id === id ? { ...n, content } : n
    );
    setProject((p) => p ? { ...p, research_notes: notes } : null);
    debouncedSave({ research_notes: notes });
  }, [project, debouncedSave]);

  const removeResearchNote = useCallback((id) => {
    if (!project) return;
    const notes = project.research_notes.filter((n) => n.id !== id);
    setProject((p) => p ? { ...p, research_notes: notes } : null);
    saveEditorProject(projectId, { research_notes: notes });
  }, [project, projectId]);

  const sendChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || !project || !projectId || chatSending) return;

    const userMsg = { role: "user", content: msg };
    const newHistory = [...project.chat_history, userMsg];
    setProject((p) => p ? { ...p, chat_history: newHistory } : null);
    setChatInput("");
    setChatSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openai-api-key": getApiKey("openai") || "",
        },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          topic: project.title,
          script: project.content,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");

      const assistantMsg = { role: "assistant", content: data.content };
      const fullHistory = [...newHistory, assistantMsg];
      setProject((p) => p ? { ...p, chat_history: fullHistory } : null);
      saveEditorProject(projectId, { chat_history: fullHistory });
    } catch {
      const errMsg = {
        role: "assistant",
        content: "응답을 받지 못했습니다. 설정에서 API 키를 입력해주세요.",
      };
      const fullHistory = [...newHistory, errMsg];
      setProject((p) => p ? { ...p, chat_history: fullHistory } : null);
    } finally {
      setChatSending(false);
    }
  }, [chatInput, project, projectId, chatSending]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [project?.chat_history]);

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

  const sections = project ? parseSections(project.content) : [];

  const scrollToSection = useCallback((startIndex) => {
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

  const replaceSelection = useCallback((newText) => {
    if (!selection || !project) return;
    const before = project.content.slice(0, selection.start);
    const after = project.content.slice(selection.end);
    const next = before + newText + after;
    updateContent(next);
    setSelection(null);
    setFloatingLoading(null);
  }, [selection, project, updateContent]);

  const runFloatingAction = useCallback(async (action) => {
    if (!selection?.text.trim()) return;
    setFloatingLoading(action);
    try {
      if (action === "ask") {
        const msg = "이 텍스트에 대해 물어보세요:\\n\\n\\"" + selection.text.slice(0, 500) + (selection.text.length > 500 ? "..." : "") + "\\"\\n\\n이 부분을 어떻게 쓸지 조언해주세요.";
        const userMsg = { role: "user", content: msg };
        const newHistory = [...(project?.chat_history ?? []), userMsg];
        setProject((p) => p ? { ...p, chat_history: newHistory } : null);
        setRightCollapsed(false);
        setChatInput("");
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-openai-api-key": getApiKey("openai") || "" },
          body: JSON.stringify({ messages: newHistory.map((m) => ({ role: m.role, content: m.content })), topic: project?.title, script: project?.content }),
        });
        const data = await res.json();
        if (res.ok && projectId) {
          const assistantMsg = { role: "assistant", content: data.content };
          const fullHistory = [...newHistory, assistantMsg];
          setProject((p) => p ? { ...p, chat_history: fullHistory } : null);
          saveEditorProject(projectId, { chat_history: fullHistory });
        }
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
        <p className="text-zinc-400">프로젝트를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      <aside
        className={\`\${leftCollapsed ? "w-10" : "w-64"} flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all shrink-0\`}
      >
        <div className="flex items-center justify-between h-12 px-3 border-b border-zinc-800">
          {!leftCollapsed && (
            <span className="text-sm font-medium text-zinc-400">리서치 패널</span>
          )}
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {leftCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        {!leftCollapsed && (
          <div className="flex-1 overflow-auto p-3 space-y-4">
            {sections.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-500 mb-2">리서치</h4>
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
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-2">메모</h4>
              <div className="space-y-2">
                {project.research_notes.map((note) => (
                  <div
                    key={note.id}
                    className="group bg-zinc-900/80 border border-zinc-800 rounded-lg p-2"
                  >
                    <textarea
                      value={note.content}
                      onChange={(e) => updateResearchNote(note.id, e.target.value)}
                      placeholder="메모 입력..."
                      rows={3}
                      className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none"
                    />
                    <button
                      onClick={() => removeResearchNote(note.id)}
                      className="mt-1 p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addResearchNote}
                  className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors flex items-center justify-center gap-1.5 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  새 메모 추가
                </button>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-2">참고자료</h4>
              <a href="/#tag-sources" className="block text-xs text-zinc-500 hover:text-zinc-300">
                참고자료 관리
              </a>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950">
          <span className="text-sm font-medium text-white truncate">{project.title}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              복사
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              다운로드
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
            placeholder="대본을 자유롭게 작성하세요. '---'로 섹션 구분. 텍스트 선택 시 AI 도구를 쓸 수 있습니다."
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
                다듬기
              </button>
              <button
                onClick={() => runFloatingAction("expand")}
                disabled={!!floatingLoading}
                className="px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                {floatingLoading === "expand" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Expand className="w-3 h-3" />}
                풀어쓰기
              </button>
              <button
                onClick={() => runFloatingAction("rewrite")}
                disabled={!!floatingLoading}
                className="px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                {floatingLoading === "rewrite" ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
                리라이팅
              </button>
              <button
                onClick={() => runFloatingAction("ask")}
                disabled={!!floatingLoading}
                className="px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                {floatingLoading === "ask" ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                AI 질문하기
              </button>
            </div>
          )}
        </div>
      </div>

      <aside
        className={\`\${rightCollapsed ? "w-10" : "w-80"} flex flex-col border-l border-zinc-800 bg-zinc-950 transition-all shrink-0\`}
      >
        <div className="flex items-center justify-between h-12 px-3 border-b border-zinc-800">
          {!rightCollapsed && (
            <span className="text-sm font-medium text-zinc-400">AI 어시스턴트</span>
          )}
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {rightCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        {!rightCollapsed && (
          <>
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {project.chat_history.length === 0 && (
                <p className="text-xs text-zinc-500">설정에서 API키를 입력해주세요.</p>
              )}
              {project.chat_history.map((m, i) => (
                <div
                  key={i}
                  className={\`rounded-lg p-3 text-sm \${m.role === "user" ? "bg-indigo-500/20 text-indigo-200 ml-4" : "bg-zinc-800/80 text-zinc-200 mr-4"}\`}
                >
                  {m.content}
                </div>
              ))}
              {chatSending && (
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  응답 대기 중..
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-zinc-800">
              <form
                onSubmit={(e) => { e.preventDefault(); sendChat(); }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="메시지를 입력하세요..."
                  disabled={chatSending}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatSending}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </aside>
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
`;

const filePath = path.join(__dirname, "src", "app", "editor", "page.tsx");
fs.writeFileSync(filePath, content, "utf8");
console.log("Created page.tsx with UTF-8 encoding");