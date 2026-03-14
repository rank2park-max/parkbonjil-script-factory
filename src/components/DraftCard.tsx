"use client";

import { Draft } from "@/lib/types";

interface DraftCardProps {
  draft: Draft;
  index: number;
  onSelect: () => void;
}

const styleColors: Record<string, string> = {
  "비유 중심": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "논리 전개": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "질문-답변": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "충격형": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "스토리형": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "데이터형": "bg-sky-500/20 text-sky-300 border-sky-500/30",
  "질문형": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "비유형": "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

export default function DraftCard({ draft, onSelect, selectLabel }: DraftCardProps & { selectLabel?: string }) {
  const colorClass =
    styleColors[draft.style] || "bg-zinc-700/20 text-zinc-300 border-zinc-500/30";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col hover:border-zinc-700 transition-colors">
      <span
        className={`self-start px-2.5 py-1 rounded-full text-xs font-medium border mb-3 ${colorClass}`}
      >
        {draft.style}
      </span>
      <div className="flex-1 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap mb-4 max-h-60 overflow-y-auto">
        {draft.content}
      </div>
      <button
        onClick={onSelect}
        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium text-white transition-colors"
      >
        {selectLabel || "이 초안 선택"}
      </button>
    </div>
  );
}
