"use client";

import { OutlineItem } from "@/lib/types";
import { Check, ChevronRight, Circle } from "lucide-react";

interface SidebarProps {
  outline: OutlineItem[];
  currentStep: number;
  introCompleted: boolean;
  onStepClick: (index: number) => void;
}

export default function Sidebar({ outline, currentStep, introCompleted, onStepClick }: SidebarProps) {
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
    </aside>
  );
}
