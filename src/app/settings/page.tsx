"use client";

import { useState, useEffect } from "react";
import { setApiKey, getApiKey } from "@/lib/workspace-store";
import { Key, Check, Eye, EyeOff } from "lucide-react";

interface KeyField {
  provider: "openai" | "anthropic" | "google" | "xai";
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
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loaded: Record<string, string> = {};
    KEY_FIELDS.forEach((f) => {
      loaded[f.provider] = getApiKey(f.provider) || "";
    });
    setKeys(loaded);
  }, []);

  const handleSave = () => {
    KEY_FIELDS.forEach((f) => {
      setApiKey(f.provider, (keys[f.provider] || "").trim());
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Key className="w-6 h-6 text-indigo-400" />
          API 설정
        </h1>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
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
                    setVisibility({ ...visibility, [field.provider]: !visibility[field.provider] })
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
              "저장"
            )}
          </button>

          <p className="text-xs text-zinc-500 text-center">
            API 키는 브라우저 localStorage에만 저장되며, 서버에 저장되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
