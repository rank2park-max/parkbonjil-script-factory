"use client";

import { useState } from "react";
import { Loader2, Check, X, ChevronDown } from "lucide-react";

const SECTION_SEP = "\n---\n";

function splitSections(content: string): string[] {
  if (!content.trim()) return [];
  return content.split(SECTION_SEP).map((s) => s.trim()).filter(Boolean);
}

export interface RewriteCompareViewProps {
  original: string;
  rewritten: string;
  onApply: (mergedContent: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function RewriteCompareView({
  original,
  rewritten,
  onApply,
  onClose,
  isLoading = false,
}: RewriteCompareViewProps) {
  const origSections = splitSections(original);
  const rewrSections = splitSections(rewritten);

  const maxLen = Math.max(origSections.length, rewrSections.length);
  const [choices, setChoices] = useState<("apply" | "keep")[]>(
    Array(maxLen).fill("apply")
  );

  const toggleChoice = (i: number) => {
    setChoices((prev) => {
      const next = [...prev];
      next[i] = next[i] === "apply" ? "keep" : "apply";
      return next;
    });
  };

  const handleApply = () => {
    const parts: string[] = [];
    for (let i = 0; i < maxLen; i++) {
      if (choices[i] === "apply" && rewrSections[i]) {
        parts.push(rewrSections[i]);
      } else if (origSections[i]) {
        parts.push(origSections[i]);
      }
    }
    const merged = parts.join(SECTION_SEP);
    onApply(merged);
    onClose();
  };

  const allApply = () => setChoices(Array(maxLen).fill("apply"));
  const allKeep = () => setChoices(Array(maxLen).fill("keep"));

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-zinc-900 rounded-xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          <p className="text-zinc-300">전체 리라이팅 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h3 className="text-lg font-medium text-white">리라이팅 비교</h3>
          <div className="flex gap-2">
            <button
              onClick={allApply}
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white"
            >
              전체 적용
            </button>
            <button
              onClick={allKeep}
              className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
            >
              전체 원본 유지
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded text-white flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              선택 적용
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-white rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-2">원본</h4>
              <div className="space-y-4">
                {origSections.map((s, i) => (
                  <div
                    key={i}
                    className="bg-zinc-800/80 rounded-lg p-3 text-sm text-zinc-200"
                  >
                    <div className="whitespace-pre-wrap">{s}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => toggleChoice(i)}
                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                          choices[i] === "keep"
                            ? "bg-amber-600/50 text-amber-200"
                            : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        <ChevronDown className="w-3 h-3" />
                        {choices[i] === "keep" ? "원본 유지" : "적용"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-2">리라이팅</h4>
              <div className="space-y-4">
                {rewrSections.map((s, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 text-sm ${
                      choices[i] === "apply"
                        ? "bg-indigo-500/10 border border-indigo-500/30 text-indigo-100"
                        : "bg-zinc-800/80 text-zinc-400"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
