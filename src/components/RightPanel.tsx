"use client";

import { OutlineItem } from "@/lib/types";
import { FileText, Clock, X } from "lucide-react";

interface RightPanelProps {
  outline: OutlineItem[];
  duration: number;
  introDraft: string | null;
  onClose: () => void;
}

const CHARS_PER_MINUTE = 300;

export default function RightPanel({ outline, duration, introDraft, onClose }: RightPanelProps) {
  const completedDrafts = outline
    .map((item, i) => ({ index: i, title: item.title, draft: item.finalDraft }))
    .filter((item): item is { index: number; title: string; draft: string } =>
      item.draft !== null
    );

  const introChars = introDraft ? introDraft.length : 0;
  const outlineChars = completedDrafts.reduce((sum, d) => sum + d.draft.length, 0);
  const totalChars = introChars + outlineChars;
  const estimatedMinutes = Math.round(totalChars / CHARS_PER_MINUTE);
  const hasAnyContent = introDraft || completedDrafts.length > 0;

  return (
    <aside className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-300">확정된 대본</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <FileText className="w-3.5 h-3.5" />
          <span>{totalChars.toLocaleString()}자</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Clock className="w-3.5 h-3.5" />
          <span>
            약 {estimatedMinutes}분 / {duration}분
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasAnyContent ? (
          <p className="text-sm text-zinc-600 text-center mt-8">
            아직 확정된 대본이 없습니다.
          </p>
        ) : (
          <>
            {introDraft && (
              <div>
                <h3 className="text-xs font-medium text-zinc-500 mb-1.5">
                  0. 도입부
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {introDraft}
                </p>
              </div>
            )}
            {introDraft && completedDrafts.length > 0 && (
              <div className="border-t border-zinc-800/50" />
            )}
            {completedDrafts.map((d) => (
              <div key={d.index}>
                <h3 className="text-xs font-medium text-zinc-500 mb-1.5">
                  {d.index + 1}. {d.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {d.draft}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
