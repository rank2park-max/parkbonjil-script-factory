"use client";

import { useState } from "react";
import { IntroData, Draft } from "@/lib/types";
import { getApiKey } from "@/lib/workspace-store";
import DraftCard from "./DraftCard";
import {
  Loader2,
  Sparkles,
  RefreshCw,
  CheckCircle,
  Mic,
} from "lucide-react";

interface IntroAreaProps {
  intro: IntroData;
  topic: string;
  duration: number;
  allOutlineTitles: string[];
  onUpdate: (updates: Partial<IntroData>) => void;
  onConfirm: (finalDraft: string) => void;
}

export default function IntroArea({
  intro,
  topic,
  duration,
  allOutlineTitles,
  onUpdate,
  onConfirm,
}: IntroAreaProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDrafts = intro.drafts.length > 0;
  const hasSelection = intro.selectedDraftIndex !== null;
  const isCompleted = intro.finalDraft !== null;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const apiKey = getApiKey("openai");
      if (!apiKey) throw new Error("OpenAI API 키를 설정 페이지에서 입력해주세요.");

      const res = await fetch("/api/generate-intro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openai-api-key": apiKey,
        },
        body: JSON.stringify({
          topic,
          duration,
          outline: allOutlineTitles,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onUpdate({ drafts: data.drafts });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectDraft = (index: number) => {
    onUpdate({
      selectedDraftIndex: index,
      editedDraft: intro.drafts[index].content,
    });
  };

  const handleConfirm = () => {
    onConfirm(intro.editedDraft);
  };

  if (isCompleted) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">
              <span className="text-zinc-500 mr-2">0.</span>
              도입부
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              확정됨
            </span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {intro.finalDraft}
            </p>
          </div>
          <button
            onClick={() => onUpdate({ finalDraft: null })}
            className="mt-4 px-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors"
          >
            다시 수정하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold mb-6">
          <span className="text-zinc-500 mr-2">0.</span>
          도입부
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Phase 1: Generate */}
        {!hasDrafts && !generating && (
          <div className="flex flex-col items-center justify-center py-16">
            <Mic className="w-12 h-12 text-zinc-600 mb-4" />
            <p className="text-zinc-400 mb-2">
              GPT가 5가지 스타일의 도입부를 생성합니다.
            </p>
            <p className="text-zinc-500 text-sm mb-6">
              충격형 / 스토리형 / 데이터형 / 질문형 / 비유형
            </p>
            <button
              onClick={handleGenerate}
              className="px-6 py-3 bg-gpt hover:bg-gpt-light text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              도입부 5개 생성
            </button>
          </div>
        )}

        {/* Loading */}
        {generating && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gpt animate-spin mb-4" />
            <p className="text-zinc-400">GPT가 도입부를 작성 중입니다...</p>
          </div>
        )}

        {/* Phase 2: Select a draft */}
        {hasDrafts && !hasSelection && !generating && (
          <div>
            <p className="text-sm text-zinc-400 mb-4">
              5가지 스타일의 도입부가 생성되었습니다. 마음에 드는 도입부를 선택해주세요.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {intro.drafts.map((draft: Draft, i: number) => (
                <DraftCard
                  key={i}
                  draft={draft}
                  index={i}
                  onSelect={() => handleSelectDraft(i)}
                  selectLabel="이 도입부 선택"
                />
              ))}
            </div>
            <button
              onClick={() => {
                onUpdate({ drafts: [] });
                handleGenerate();
              }}
              className="mt-4 px-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              다시 생성
            </button>
          </div>
        )}

        {/* Phase 3: Edit selected draft */}
        {hasSelection && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-700 text-zinc-300">
                선택된 스타일: {intro.drafts[intro.selectedDraftIndex!].style}
              </span>
            </div>
            <textarea
              value={intro.editedDraft}
              onChange={(e) => onUpdate({ editedDraft: e.target.value })}
              className="w-full min-h-[200px] px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 leading-relaxed resize-y focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleConfirm}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                도입부 확정
              </button>
              <button
                onClick={() =>
                  onUpdate({ selectedDraftIndex: null, editedDraft: "" })
                }
                className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                다른 도입부 선택
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
