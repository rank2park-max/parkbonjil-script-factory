"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  loadResearchHistory,
  insertResearchHistory,
  loadScriptNote,
  upsertScriptNote,
  loadScriptReferences,
  addScriptReference,
  removeScriptReference,
  type ResearchHistoryItem,
  type ScriptReference,
} from "@/lib/supabase-store";
import { getApiKey } from "@/lib/workspace-store";
import {
  Search,
  Loader2,
  Link as LinkIcon,
  Trash2,
  Upload,
  FilePlus,
} from "lucide-react";
import Link from "next/link";

type TabId = "research" | "notes" | "references";

interface ResearchPanelProps {
  scriptId: string;
  onInsertToEditor: (text: string) => void;
  isMobile?: boolean;
}

export function ResearchPanel({
  scriptId,
  onInsertToEditor,
  isMobile = false,
}: ResearchPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("research");

  // 리서치 탭
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // 메모 탭
  const [noteContent, setNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const noteSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 참고자료 탭
  const [refUrl, setRefUrl] = useState("");
  const [refAdding, setRefAdding] = useState(false);
  const [references, setReferences] = useState<ScriptReference[]>([]);
  const [previewRefId, setPreviewRefId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const perplexityKey = typeof window !== "undefined" ? getApiKey("perplexity") : null;

  const loadHistory = useCallback(async () => {
    const items = await loadResearchHistory(scriptId);
    setHistory(items);
  }, [scriptId]);

  const loadNote = useCallback(async () => {
    const note = await loadScriptNote(scriptId);
    setNoteContent(note?.content ?? "");
  }, [scriptId]);

  const loadRefs = useCallback(async () => {
    const refs = await loadScriptReferences(scriptId);
    setReferences(refs);
  }, [scriptId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (activeTab === "notes") loadNote();
  }, [activeTab, loadNote]);

  useEffect(() => {
    if (activeTab === "references") loadRefs();
  }, [activeTab, loadRefs]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || searching || !perplexityKey) return;

    setSearchError(null);
    setSearching(true);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-perplexity-api-key": perplexityKey,
        },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error || "검색에 실패했습니다.");
        setSearchResult(null);
        return;
      }

      const result = data.content || "";
      setSearchResult(result);
      setSelectedHistoryId(null);

      const inserted = await insertResearchHistory(scriptId, q, result);
      if (inserted) {
        setHistory((prev) => [inserted, ...prev.filter((h) => h.id !== inserted.id)]);
      }
    } catch {
      setSearchError("요청 중 오류가 발생했습니다.");
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searching, perplexityKey, scriptId]);

  const handleSelectHistory = useCallback((item: ResearchHistoryItem) => {
    setSearchResult(item.result);
    setSelectedHistoryId(item.id);
    setSearchQuery(item.query);
  }, []);

  const saveNoteDebounced = useCallback(
    (content: string) => {
      if (noteSaveRef.current) clearTimeout(noteSaveRef.current);
      noteSaveRef.current = setTimeout(() => {
        setNoteSaving(true);
        upsertScriptNote(scriptId, content).then(() => {
          setNoteSaving(false);
        });
      }, 800);
    },
    [scriptId]
  );

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      setNoteContent(v);
      saveNoteDebounced(v);
    },
    [saveNoteDebounced]
  );

  const handleAddRefUrl = useCallback(async () => {
    const url = refUrl.trim();
    if (!url || refAdding) return;

    setRefAdding(true);
    let title = url;
    try {
      const res = await fetch(`/api/fetch-url-title?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data?.title) title = data.title;
    } catch {
      // title 추출 실패 시 URL 사용
    }

    const ref = await addScriptReference(scriptId, { url, title });
    if (ref) {
      setReferences((prev) => [ref, ...prev]);
      setRefUrl("");
    }
    setRefAdding(false);
  }, [refUrl, refAdding, scriptId]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const ext = file.name.toLowerCase().slice(-4);
      if (ext !== ".txt" && ext !== ".md" && !file.name.toLowerCase().endsWith(".markdown")) {
        alert(".txt 또는 .md 파일만 업로드할 수 있습니다.");
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const content = (reader.result as string) || "";
        const title = file.name.replace(/\.(txt|md|markdown)$/i, "") || file.name;
        const ref = await addScriptReference(scriptId, {
          title,
          file_content: content,
        });
        if (ref) {
          setReferences((prev) => [ref, ...prev]);
        }
      };
      reader.readAsText(file, "UTF-8");
      e.target.value = "";
    },
    [scriptId]
  );

  const handleRemoveRef = useCallback(async (id: string) => {
    const ok = await removeScriptReference(id);
    if (ok) setReferences((prev) => prev.filter((r) => r.id !== id));
    if (previewRefId === id) setPreviewRefId(null);
  }, [previewRefId]);

  const getDisplayResult = () => {
    if (selectedHistoryId) return searchResult;
    return searchResult;
  };

  const displayResult = getDisplayResult();

  const tabs: { id: TabId; label: string }[] = [
    { id: "research", label: "리서치" },
    { id: "notes", label: "메모" },
    { id: "references", label: "참고자료" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-zinc-800 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "text-indigo-400 border-b-2 border-indigo-500 bg-zinc-900/50"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {activeTab === "research" && (
          <>
            {!perplexityKey && (
              <p className="text-xs text-amber-500/90">
                설정 페이지에서 Perplexity API 키를 입력해주세요.{" "}
                <Link href="/settings" className="underline hover:text-amber-400">
                  설정으로 이동
                </Link>
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="검색어 입력..."
                disabled={!perplexityKey || searching}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={!perplexityKey || !searchQuery.trim() || searching}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shrink-0"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                검색
              </button>
            </div>

            {searchError && (
              <p className="text-xs text-red-400">{searchError}</p>
            )}

            {displayResult && (
              <div className="space-y-2">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 overflow-auto max-h-64">
                  <ReactMarkdown
                    components={{
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {displayResult}
                  </ReactMarkdown>
                </div>
                <button
                  type="button"
                  onClick={() => onInsertToEditor(displayResult)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FilePlus className="w-4 h-4" />
                  에디터에 삽입
                </button>
              </div>
            )}

            {history.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-500 mb-2">검색 히스토리</h4>
                <div className="space-y-1">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectHistory(item)}
                      className={`w-full text-left text-sm py-2 px-2 rounded truncate block ${
                        selectedHistoryId === item.id
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      {item.query}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "notes" && (
          <>
            <textarea
              value={noteContent}
              onChange={handleNoteChange}
              placeholder="메모를 자유롭게 작성하세요..."
              rows={10}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
            {noteSaving && (
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                저장 중...
              </p>
            )}
            <button
              type="button"
              onClick={() => noteContent && onInsertToEditor(noteContent)}
              disabled={!noteContent.trim()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FilePlus className="w-4 h-4" />
              에디터에 삽입
            </button>
          </>
        )}

        {activeTab === "references" && (
          <>
            <div className="flex gap-2">
              <input
                type="url"
                value={refUrl}
                onChange={(e) => setRefUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddRefUrl()}
                placeholder="URL 입력..."
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddRefUrl}
                disabled={!refUrl.trim() || refAdding}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 rounded-lg text-sm flex items-center gap-1.5 shrink-0"
              >
                {refAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                추가
              </button>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 border border-dashed border-zinc-600 rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                .txt / .md 파일 업로드
              </button>
            </div>

            <div className="space-y-1">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className="group flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-lg p-2"
                >
                  {ref.url ? (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 text-sm text-zinc-300 truncate hover:text-white"
                    >
                      {ref.title || ref.url}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreviewRefId(previewRefId === ref.id ? null : ref.id)}
                      className="flex-1 min-w-0 text-left text-sm text-zinc-300 truncate hover:text-white"
                    >
                      {ref.title || "업로드 파일"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveRef(ref.id)}
                    className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {previewRefId && (() => {
              const ref = references.find((r) => r.id === previewRefId);
              if (!ref?.file_content) return null;
              return (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 overflow-auto max-h-48 whitespace-pre-wrap">
                  {ref.file_content}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
