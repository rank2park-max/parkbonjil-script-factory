"use client";

import { useState, useEffect } from "react";
import { setApiKey, getApiKey } from "@/lib/workspace-store";
import { isSupabaseConfigured, resetSupabaseClient } from "@/lib/supabase";
import { Key, Check, Eye, EyeOff, Database } from "lucide-react";

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
    description: "Claude 리라이팅 + 목차 생성에 사용됩니다 (claude-opus-4-6)",
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
    setSbConfigured(isSupabaseConfigured());
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
      </div>
    </div>
  );
}
