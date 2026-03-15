"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Copy, Download, Check, Film } from "lucide-react";
import { getApiKey } from "@/lib/workspace-store";

export default function StandaloneTagSourcesSection() {
  const [script, setScript] = useState("");
  const [taggedScript, setTaggedScript] = useState<string | null>(null);
  const [tagging, setTagging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTagSources = async (contentToTag: string) => {
    if (!contentToTag.trim()) return;
    setTagging(true);
    setError(null);
    try {
      const apiKey = getApiKey("anthropic");
      if (!apiKey)
        throw new Error("Anthropic API 키를 설정 페이지에서 입력해주세요.");

      const res = await fetch("/api/tag-sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anthropic-api-key": apiKey,
        },
        body: JSON.stringify({ script: contentToTag }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTaggedScript(data.taggedScript);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "태깅 중 오류가 발생했습니다."
      );
    } finally {
      setTagging(false);
    }
  };

  const handleStartTagging = () => handleTagSources(script);
  const handleRetag = () => handleTagSources(taggedScript ?? script);

  const handleCopy = () => {
    const text = taggedScript ?? script;
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = taggedScript ?? script;
    if (!text.trim()) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "대본 - 소스태깅.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasResult = taggedScript !== null;

  return (
    <section className="mt-0">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Film className="w-6 h-6 text-claude" />
          영상 소스 태깅
        </h2>
        <p className="text-zinc-400 text-sm">
          완성된 대본을 붙여넣으면 단락별로 영상/이미지 소스를 태깅해줍니다.
          대본 생성 워크플로우와 완전히 별개의 독립 도구입니다.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Input Phase */}
      {!hasResult && !tagging && (
        <div className="space-y-4">
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="대본을 직접 붙여넣으세요. 직접 쓴 대본, 다른 데서 가져온 대본, 뭐든 상관없이 태깅 가능합니다."
            rows={12}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 focus:border-claude focus:ring-1 focus:ring-claude transition-colors resize-y"
          />
          <button
            onClick={handleStartTagging}
            disabled={!script.trim() || tagging}
            className="w-full py-3 bg-claude hover:bg-claude-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Film className="w-5 h-5" />
            소스 태깅 시작
          </button>
        </div>
      )}

      {/* Loading */}
      {tagging && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-10 h-10 text-claude animate-spin mb-4" />
          <p className="text-zinc-400">Claude가 영상 소스를 태깅하고 있습니다...</p>
        </div>
      )}

      {/* Result Phase */}
      {hasResult && !tagging && (
        <div className="space-y-6">
          <textarea
            value={taggedScript}
            onChange={(e) => setTaggedScript(e.target.value)}
            rows={16}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:border-claude focus:ring-1 focus:ring-claude transition-colors resize-y"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleRetag}
              disabled={!taggedScript?.trim()}
              className="px-5 py-2.5 bg-claude hover:bg-claude-light disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              다시 태깅
            </button>
            <button
              onClick={handleCopy}
              className="px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "복사됨" : "복사"}
            </button>
            <button
              onClick={handleDownload}
              className="px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              다운로드 (.txt)
            </button>
            <button
              onClick={() => {
                setTaggedScript(null);
                setScript(taggedScript ?? "");
              }}
              className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              새 대본으로
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
