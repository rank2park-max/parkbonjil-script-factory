"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { setApiKey, getApiKey } from "@/lib/workspace-store";
import { isSupabaseConfigured, resetSupabaseClient, getSupabaseHeaders } from "@/lib/supabase";
import { Key, Check, Eye, EyeOff, Database, BookOpen, Upload, Trash2, Loader2 } from "lucide-react";

interface KeyField {
  provider: "openai" | "anthropic" | "google" | "xai" | "perplexity";
  label: string;
  color: string;
  focusColor: string;
  placeholder: string;
  description: string;
}

const KEY_FIELDS: KeyField[] = [
  {
    provider: "openai",
    label: "OpenAI API Key",
    color: "bg-gpt",
    focusColor: "focus:border-gpt focus:ring-gpt",
    placeholder: "sk-...",
    description: "GPT 초안 생성 + 목차 생성에 사용됩니다 (gpt-5.4)",
  },
  {
    provider: "anthropic",
    label: "Anthropic API Key",
    color: "bg-claude",
    focusColor: "focus:border-claude focus:ring-claude",
    placeholder: "sk-ant-...",
    description: "Claude 리라이팅 + 목차 생성에 사용됩니다 (claude-sonnet-4-20250514)",
  },
  {
    provider: "google",
    label: "Google AI API Key",
    color: "bg-gemini",
    focusColor: "focus:border-gemini focus:ring-gemini",
    placeholder: "AIza...",
    description: "Gemini 목차 생성에 사용됩니다 (gemini-2.5-pro)",
  },
  {
    provider: "xai",
    label: "xAI API Key",
    color: "bg-grok",
    focusColor: "focus:border-grok focus:ring-grok",
    placeholder: "xai-...",
    description: "Grok 목차 생성에 사용됩니다 (grok-3)",
  },
  {
    provider: "perplexity",
    label: "Perplexity API Key",
    color: "bg-perplexity",
    focusColor: "focus:border-perplexity focus:ring-perplexity",
    placeholder: "pplx-...",
    description: "트렌드 기반 주제 추천에 사용됩니다 (sonar-pro)",
  },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [supabaseSaved, setSupabaseSaved] = useState(false);
  const [sbConfigured, setSbConfigured] = useState(false);

  useEffect(() => {
    const loaded: Record<string, string> = {};
    KEY_FIELDS.forEach((f) => {
      loaded[f.provider] = getApiKey(f.provider) || "";
    });
    setKeys(loaded);

    setSupabaseUrl(localStorage.getItem("script-factory-supabase-url") || "");
    setSupabaseKey(localStorage.getItem("script-factory-supabase-anon-key") || "");
    setSbConfigured(isSupabaseConfigured());
  }, []);

  const handleSave = () => {
    KEY_FIELDS.forEach((f) => {
      setApiKey(f.provider, (keys[f.provider] || "").trim());
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveSupabase = () => {
    const url = supabaseUrl.trim();
    const key = supabaseKey.trim();

    if (url) {
      localStorage.setItem("script-factory-supabase-url", url);
    } else {
      localStorage.removeItem("script-factory-supabase-url");
    }
    if (key) {
      localStorage.setItem("script-factory-supabase-anon-key", key);
    } else {
      localStorage.removeItem("script-factory-supabase-anon-key");
    }

    resetSupabaseClient();
    // 저장한 값으로 즉시 연결 상태 반영 (localStorage 읽기 타이밍 이슈 방지)
    setSbConfigured(!!(url && key));
    setSupabaseSaved(true);
    setTimeout(() => setSupabaseSaved(false), 2000);
  };

  const hasEnvVars =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="w-6 h-6 text-indigo-400" />
          설정
        </h1>

        {/* API Keys */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-zinc-200">AI API 키</h2>

          {KEY_FIELDS.map((field) => (
            <div key={field.provider}>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                <span className={`w-2 h-2 rounded-full ${field.color}`} />
                {field.label}
              </label>
              <div className="relative">
                <input
                  type={visibility[field.provider] ? "text" : "password"}
                  value={keys[field.provider] || ""}
                  onChange={(e) =>
                    setKeys({ ...keys, [field.provider]: e.target.value })
                  }
                  placeholder={field.placeholder}
                  className={`w-full px-4 py-3 pr-12 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 ${field.focusColor} focus:ring-1 transition-colors`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setVisibility({
                      ...visibility,
                      [field.provider]: !visibility[field.provider],
                    })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {visibility[field.provider] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{field.description}</p>
            </div>
          ))}

          <button
            onClick={handleSave}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                저장 완료
              </>
            ) : (
              "API 키 저장"
            )}
          </button>

          <p className="text-xs text-zinc-500 text-center">
            API 키는 브라우저 localStorage에만 저장되며, 서버에 저장되지 않습니다.
          </p>
        </div>

        {/* Supabase */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Supabase 연결
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                sbConfigured
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-zinc-700 text-zinc-400"
              }`}
            >
              {sbConfigured ? "연결됨" : "미연결"}
            </span>
          </div>

          {hasEnvVars && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <Check className="w-3.5 h-3.5 shrink-0" />
              환경 변수로 Supabase가 설정되어 있습니다. 아래 필드는 무시됩니다.
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">
              Supabase URL
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              disabled={hasEnvVars}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">
              Supabase Anon Key
            </label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              disabled={hasEnvVars}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
            />
          </div>

          {!hasEnvVars && (
            <button
              onClick={handleSaveSupabase}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {supabaseSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  저장 완료
                </>
              ) : (
                "Supabase 설정 저장"
              )}
            </button>
          )}

          <p className="text-xs text-zinc-500">
            배포 시에는 Vercel 환경변수(NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY)를 사용하세요.
          </p>
        </div>

        {/* 참고 자료 관리 */}
        <ReferenceMaterialsSection sbConfigured={sbConfigured} />
      </div>
    </div>
  );
}

interface RefMaterial {
  id: string;
  title: string;
  content: string;
  char_count: number;
  created_at: string;
}

function ReferenceMaterialsSection({ sbConfigured }: { sbConfigured: boolean }) {
  const [materials, setMaterials] = useState<RefMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMaterials = useCallback(async () => {
    if (!sbConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reference-materials", {
        headers: getSupabaseHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "로드 실패");
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "참고 자료를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, [sbConfigured]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sbConfigured) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/reference-materials", {
        method: "POST",
        headers: getSupabaseHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      setMaterials((prev) => [data, ...prev]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTitle.trim() || !textContent.trim() || !sbConfigured) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/reference-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getSupabaseHeaders() },
        body: JSON.stringify({ title: textTitle.trim(), content: textContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setMaterials((prev) => [data, ...prev]);
      setTextTitle("");
      setTextContent("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!sbConfigured) return;
    try {
      const res = await fetch(`/api/reference-materials?id=${id}`, {
        method: "DELETE",
        headers: getSupabaseHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "";
    }
  };

  if (!sbConfigured) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          참고 자료 관리
        </h2>
        <p className="text-sm text-zinc-500">Supabase를 연결하면 참고 자료를 업로드할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-amber-400" />
        참고 자료 관리
      </h2>
      <p className="text-xs text-zinc-500">
        업로드된 자료는 초안 생성·리라이팅 시 컨텍스트로 사용됩니다. .txt, .md, .pdf, .docx 지원.
      </p>

      {/* 파일 업로드 */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf,.docx"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-200 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          파일 업로드
        </button>
      </div>

      {/* 텍스트 직접 입력 */}
      <form onSubmit={handleTextSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-1 block">제목</label>
          <input
            type="text"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            placeholder="자료 제목"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-1 block">내용</label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="참고할 텍스트를 입력하세요"
            rows={4}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={uploading || !textTitle.trim() || !textContent.trim()}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          텍스트 추가
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* 자료 목록 */}
      <div>
        <h3 className="text-sm font-medium text-zinc-400 mb-2">등록된 자료</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            로딩 중...
          </div>
        ) : materials.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">등록된 참고 자료가 없습니다.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {materials.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 py-2 px-3 bg-zinc-800/50 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-200 truncate">{m.title}</p>
                  <p className="text-xs text-zinc-500">{formatDate(m.created_at)} · {m.char_count.toLocaleString()}자</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
