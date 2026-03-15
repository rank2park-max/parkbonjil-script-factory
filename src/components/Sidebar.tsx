"use client";

import { OutlineItem } from "@/lib/types";
import { Check, ChevronRight, Circle, BookOpen, AlertTriangle } from "lucide-react";

export interface RefMaterial {
  id: string;
  title: string;
  content: string;
  char_count: number;
  created_at: string;
}

interface SidebarProps {
  outline: OutlineItem[];
  currentStep: number;
  introCompleted: boolean;
  onStepClick: (index: number) => void;
  refMaterials?: RefMaterial[];
  refEnabled: boolean;
  refSelectedIds: Set<string>;
  onRefToggle: (enabled: boolean) => void;
  onRefMaterialToggle: (id: string) => void;
}

export default function Sidebar({
  outline,
  currentStep,
  introCompleted,
  onStepClick,
  refMaterials = [],
  refEnabled,
  refSelectedIds,
  onRefToggle,
  onRefMaterialToggle,
}: SidebarProps) {
  const isIntroCurrent = currentStep === -1;

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 p-4 overflow-y-auto shrink-0">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        목차
      </h2>
      <ul className="space-y-1">
        {/* 도입부 */}
        <li>
          <button
            onClick={() => onStepClick(-1)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
              isIntroCurrent
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : introCompleted
                ? "text-zinc-400 hover:bg-zinc-800/50"
                : "text-zinc-500 hover:bg-zinc-800/50"
            }`}
          >
            <span className="shrink-0">
              {introCompleted ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : isIntroCurrent ? (
                <ChevronRight className="w-4 h-4 text-indigo-400" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </span>
            <span className="truncate">
              <span className="text-zinc-600 mr-1.5">0.</span>
              도입부
            </span>
          </button>
        </li>

        {/* 구분선 */}
        <li className="py-1">
          <div className="border-t border-zinc-800/50" />
        </li>

        {/* 목차 항목들 */}
        {outline.map((item, index) => {
          const isCompleted = item.finalDraft !== null;
          const isCurrent = index === currentStep;

          return (
            <li key={index}>
              <button
                onClick={() => onStepClick(index)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  isCurrent
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : isCompleted
                    ? "text-zinc-400 hover:bg-zinc-800/50"
                    : "text-zinc-500 hover:bg-zinc-800/50"
                }`}
              >
                <span className="shrink-0">
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <ChevronRight className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </span>
                <span className="truncate">
                  <span className="text-zinc-600 mr-1.5">{index + 1}.</span>
                  {item.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* 참고 자료 */}
      {refMaterials.length > 0 && (
        <>
          <div className="border-t border-zinc-800/50 mt-4 pt-4">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              참고 자료
            </h2>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={refEnabled}
                onChange={(e) => onRefToggle(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-xs text-zinc-400">AI 호출 시 포함</span>
            </label>
            {refEnabled && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {refMaterials.map((m) => {
                  const selected = refSelectedIds.has(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-start gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onRefMaterialToggle(m.id)}
                        className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-zinc-400 group-hover:text-zinc-300 truncate block">
                          {m.title}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {m.char_count.toLocaleString()}자
                        </span>
                      </div>
                    </label>
                  );
                })}
                {(() => {
                  const totalChars = refMaterials
                    .filter((m) => refSelectedIds.has(m.id))
                    .reduce((sum, m) => sum + m.char_count, 0);
                  return totalChars > 10000 ? (
                    <div className="flex items-center gap-1.5 text-amber-400 text-[10px] mt-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      총 {totalChars.toLocaleString()}자 (10,000자 초과 시 토큰 한도 주의)
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
