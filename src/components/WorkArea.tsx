"use client";

import { useState } from "react";
import { OutlineItem, Draft } from "@/lib/types";
import { getApiKey } from "@/lib/workspace-store";
import DraftCard from "./DraftCard";
import {
  Loader2,
  Sparkles,
  RefreshCw,
  CheckCircle,
  Wand2,
} from "lucide-react";

interface WorkAreaProps {
  item: OutlineItem;
  stepIndex: number;
  topic: string;
  duration: number;
  allOutlineTitles: string[];
  previousDrafts: string;
  referenceMaterials?: string;
  onUpdate: (updates: Partial<OutlineItem>) => void;
  onConfirm: (finalDraft: string) => void;
}

export default function WorkArea({
  item,
  stepIndex,
  topic,
  duration,
  allOutlineTitles,
  previousDrafts,
  referenceMaterials = "",
  onUpdate,
  onConfirm,
}: WorkAreaProps) {
  const [generating, setGenerating] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDrafts = item.drafts.length > 0;
  const hasSelection = item.selectedDraftIndex !== null;
  const hasRewrite = item.rewrittenDraft !== null;
  const isCompleted = item.finalDraft !== null;

  const handleGenerate = async (baseDraft?: string) => {
    setGenerating(true);
    setError(null);
    try {
      const apiKey = getApiKey("openai");
      if (!apiKey) throw new Error("OpenAI API 키를 설정 페이지에서 입력해주세요.");

      const res = await fetch("/api/generate-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openai-api-key": apiKey,
        },
        body: JSON.stringify({
          topic,
          duration,
          outline: allOutlineTitles,
          currentOutline: item.title,
          previousDrafts,
          referenceMaterials: referenceMaterials || undefined,
          baseDraft: baseDraft || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onUpdate({
        drafts: data.drafts,
        selectedDraftIndex: null,
        editedDraft: "",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateDraft = () => {
    if (!item.editedDraft.trim()) return;
    handleGenerate(item.editedDraft);
  };

  const handleSelectDraft = (index: number) => {
    onUpdate({
      selectedDraftIndex: index,
      editedDraft: item.drafts[index].content,
    });
  };

  const handleRewrite = async (overrideDraft?: string) => {
    const draftToRewrite = overrideDraft ?? item.editedDraft;
    setRewriting(true);
    setError(null);
    try {
      const apiKey = getApiKey("anthropic");
      if (!apiKey)
        throw new Error("Anthropic API 키를 설정 페이지에서 입력해주세요.");

      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anthropic-api-key": apiKey,
        },
        body: JSON.stringify({
          topic,
          duration,
          outline: allOutlineTitles,
          currentOutline: item.title,
          selectedDraft: draftToRewrite,
          previousDrafts,
          referenceMaterials: referenceMaterials || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onUpdate({
        rewrittenDraft: data.rewrittenDraft,
        editedRewrite: data.rewrittenDraft,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setRewriting(false);
    }
  };

  const handleConfirm = () => {
    const finalText = hasRewrite ? item.editedRewrite : item.editedDraft;
    onConfirm(finalText);
  };

  if (isCompleted) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">
              <span className="text-zinc-500 mr-2">{stepIndex + 1}.</span>
              {item.title}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              확정됨
            </span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {item.finalDraft}
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
          <span className="text-zinc-500 mr-2">{stepIndex + 1}.</span>
          {item.title}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Phase 1: Generate */}
        {!hasDrafts && !generating && (
          <div className="flex flex-col items-center justify-center py-16">
            <Sparkles className="w-12 h-12 text-zinc-600 mb-4" />
            <p className="text-zinc-400 mb-6">
              GPT가 3가지 스타일의 초안을 생성합니다.
            </p>
            <button
              onClick={() => handleGenerate()}
              className="px-6 py-3 bg-gpt hover:bg-gpt-light text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              초안 3개 생성
            </button>
          </div>
        )}

        {/* Loading: Generating */}
        {generating && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gpt animate-spin mb-4" />
            <p className="text-zinc-400">GPT가 초안을 작성 중입니다...</p>
          </div>
        )}

        {/* Phase 2: Select a draft */}
        {hasDrafts && !hasSelection && !generating && (
          <div>
            <p className="text-sm text-zinc-400 mb-4">
              3가지 스타일의 초안이 생성되었습니다. 마음에 드는 초안을 선택해주세요.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {item.drafts.map((draft: Draft, i: number) => (
                <DraftCard
                  key={i}
                  draft={draft}
                  index={i}
                  onSelect={() => handleSelectDraft(i)}
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
        {hasSelection && !hasRewrite && !rewriting && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-700 text-zinc-300">
                선택된 스타일: {item.drafts[item.selectedDraftIndex!].style}
              </span>
            </div>
            <textarea
              value={item.editedDraft}
              onChange={(e) => onUpdate({ editedDraft: e.target.value })}
              className="w-full min-h-[300px] px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 leading-relaxed resize-y focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <button
                onClick={handleRegenerateDraft}
                disabled={generating || !item.editedDraft.trim()}
                className="px-5 py-2.5 bg-gpt hover:bg-gpt-light disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                이 내용으로 다시 생성
              </button>
              <button
                onClick={() => handleRewrite()}
                className="px-5 py-2.5 bg-claude hover:bg-claude-light text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                리라이팅으로 넘어가기
              </button>
              <button
                onClick={handleConfirm}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
              >
                리라이팅 없이 확정
              </button>
              <button
                onClick={() =>
                  onUpdate({ selectedDraftIndex: null, editedDraft: "" })
                }
                className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                다른 초안 선택
              </button>
            </div>
          </div>
        )}

        {/* Loading: Rewriting */}
        {rewriting && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-claude animate-spin mb-4" />
            <p className="text-zinc-400">Claude가 리라이팅 중입니다...</p>
          </div>
        )}

        {/* Phase 4: Review rewrite */}
        {hasRewrite && !rewriting && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-full text-xs bg-claude/20 text-claude border border-claude/30">
                Claude 리라이팅 결과
              </span>
            </div>
            <textarea
              value={item.editedRewrite}
              onChange={(e) => onUpdate({ editedRewrite: e.target.value })}
              className="w-full min-h-[300px] px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 leading-relaxed resize-y focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleConfirm}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                이 목차 확정
              </button>
              <button
                onClick={() => handleRewrite(item.editedRewrite)}
                disabled={rewriting || !item.editedRewrite.trim()}
                className="px-5 py-2.5 bg-claude hover:bg-claude-light disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {rewriting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                다시 리라이팅
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
