"use client";

import { useState } from "react";
import { Loader2, RefreshCw, CheckCircle, Copy, Download } from "lucide-react";

interface TagSourcesAreaProps {
  topic: string;
  fullScript: string;
  sourceTaggedDraft: string | null;
  sourceTaggingFinal: boolean;
  onTagSources: (script: string) => Promise<void>;
  onUpdateDraft: (draft: string) => void;
  onConfirmFinal: () => void;
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
}

export default function TagSourcesArea({
  topic,
  fullScript,
  sourceTaggedDraft,
  sourceTaggingFinal,
  onTagSources,
  onUpdateDraft,
  onConfirmFinal,
  onCopy,
  onDownload,
  copied,
}: TagSourcesAreaProps) {
  const [tagging, setTagging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTagSources = async () => {
    setTagging(true);
    setError(null);
    try {
      await onTagSources(fullScript);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "태깅 중 오류가 발생했습니다.");
    } finally {
      setTagging(false);
    }
  };

  const handleRetag = async () => {
    const currentContent = sourceTaggedDraft ?? fullScript;
    if (!currentContent.trim()) return;
    setTagging(true);
    setError(null);
    try {
      await onTagSources(currentContent);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "다시 태깅 중 오류가 발생했습니다.");
    } finally {
      setTagging(false);
    }
  };

  const handleConfirmFinal = () => {
    onConfirmFinal();
  };

  const displayContent = sourceTaggedDraft ?? fullScript;
  const hasTaggedContent = sourceTaggedDraft !== null;

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold mb-6">영상 소스 태깅</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Phase 1: 아직 태깅 전 - 전체 대본 + 영상 소스 태깅 버튼 */}
        {!hasTaggedContent && !tagging && (
          <div>
            <div className="mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-sm text-zinc-400 mb-2">완성된 전체 대본</p>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {fullScript}
              </p>
            </div>
            <button
              onClick={handleTagSources}
              disabled={tagging}
              className="px-6 py-3 bg-claude hover:bg-claude-light text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              영상 소스 태깅
            </button>
          </div>
        )}

        {/* Loading: 태깅 중 */}
        {tagging && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-claude animate-spin mb-4" />
            <p className="text-zinc-400">Claude가 영상 소스를 태깅하고 있습니다...</p>
          </div>
        )}

        {/* Phase 2: 태깅 완료, 수정/재태깅 가능 */}
        {hasTaggedContent && !sourceTaggingFinal && !tagging && (
          <div>
            <textarea
              value={sourceTaggedDraft}
              onChange={(e) => onUpdateDraft(e.target.value)}
              className="w-full min-h-[400px] px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 leading-relaxed resize-y focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <button
                onClick={handleConfirmFinal}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                최종 확정
              </button>
              <button
                onClick={handleRetag}
                disabled={!sourceTaggedDraft.trim()}
                className="px-5 py-2.5 bg-claude hover:bg-claude-light text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                다시 태깅
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: 최종 확정됨 - 복사/다운로드 */}
        {sourceTaggingFinal && hasTaggedContent && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                최종 확정됨
              </span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {sourceTaggedDraft}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onCopy}
                className="px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "복사됨" : "복사"}
              </button>
              <button
                onClick={onDownload}
                className="px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                .txt 다운로드
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
