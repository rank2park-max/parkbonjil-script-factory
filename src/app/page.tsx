"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { initializeWorkspace, getApiKey } from "@/lib/workspace-store";
import {
  ArrowRight,
  Film,
  List,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

interface TopicItem {
  title: string;
  reason: string;
}

interface TopicRecommendations {
  trending: TopicItem[];
  explainer: TopicItem[];
}

interface TopicAIResult {
  ai: string;
  status: "success" | "error";
  data?: TopicRecommendations;
  error?: string;
}

interface OutlineEntry {
  title: string;
  question: string;
  summary: string;
  duration: string;
}

interface OutlineResult {
  titles: string[];
  outline: OutlineEntry[];
}

interface AIResult {
  ai: string;
  status: "success" | "error";
  data?: OutlineResult;
  error?: string;
}

const AI_COLORS: Record<string, { dot: string; badge: string; border: string }> = {
  GPT: {
    dot: "bg-gpt",
    badge: "bg-gpt/20 text-gpt border-gpt/30",
    border: "border-gpt/40",
  },
  Claude: {
    dot: "bg-claude",
    badge: "bg-claude/20 text-claude border-claude/30",
    border: "border-claude/40",
  },
  Gemini: {
    dot: "bg-gemini",
    badge: "bg-gemini/20 text-gemini border-gemini/30",
    border: "border-gemini/40",
  },
  Grok: {
    dot: "bg-grok",
    badge: "bg-grok/20 text-grok border-grok/30",
    border: "border-grok/40",
  },
  Perplexity: {
    dot: "bg-perplexity",
    badge: "bg-perplexity/20 text-perplexity border-perplexity/30",
    border: "border-perplexity/40",
  },
};

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(15);
  const [outlineText, setOutlineText] = useState("");
  const [aiResults, setAiResults] = useState<AIResult[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [topicResults, setTopicResults] = useState<TopicAIResult[] | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const outlineRef = useRef<HTMLTextAreaElement>(null);

  const outlineItems = outlineText
    .split("\n")
    .map((line) => line.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || outlineItems.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      const projectId = await initializeWorkspace(
        topic.trim(),
        duration,
        outlineItems
      );
      if (projectId) {
        router.push(`/workspace?id=${projectId}`);
      } else {
        router.push("/workspace");
      }
    } catch {
      router.push("/workspace");
    }
  };

  const handleRecommendTopics = async () => {
    setLoadingTopics(true);
    setTopicError(null);
    setTopicResults(null);

    try {
      const res = await fetch("/api/recommend-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openai-api-key": getApiKey("openai") || "",
          "x-anthropic-api-key": getApiKey("anthropic") || "",
          "x-google-api-key": getApiKey("google") || "",
          "x-xai-api-key": getApiKey("xai") || "",
          "x-perplexity-api-key": getApiKey("perplexity") || "",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopicResults(data.results);
    } catch (err: unknown) {
      setTopicError(
        err instanceof Error ? err.message : "주제 추천에 실패했습니다."
      );
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setAiResults(null);

    try {
      const res = await fetch("/api/generate-outline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openai-api-key": getApiKey("openai") || "",
          "x-anthropic-api-key": getApiKey("anthropic") || "",
          "x-google-api-key": getApiKey("google") || "",
          "x-xai-api-key": getApiKey("xai") || "",
        },
        body: JSON.stringify({ topic: topic.trim(), duration }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiResults(data.results);
    } catch {
      setAiResults([]);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOutline = (result: AIResult) => {
    if (!result.data) return;
    const text = result.data.outline.map((item) => item.title).join("\n");
    setOutlineText(text);
    outlineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">유튜브 대본 생성기</h1>
          <p className="text-zinc-400">
            AI가 도와주는 체계적인 대본 작성 워크플로우
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Topic + Duration */}
          <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <Film className="w-4 h-4" />
                  영상 주제
                </label>
                <button
                  type="button"
                  onClick={handleRecommendTopics}
                  disabled={loadingTopics}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20 disabled:opacity-50"
                >
                  {loadingTopics ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Lightbulb className="w-3 h-3" />
                  )}
                  AI 주제 추천
                </button>
              </div>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 인공지능이 바꿀 미래 직업 TOP 10"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />

              {topicError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {topicError}
                </div>
              )}

              {loadingTopics && (
                <div className="mt-3 flex items-center gap-2 text-sm text-indigo-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  5개 AI가 주제를 추천 중입니다...
                </div>
              )}
            </div>
          </div>

          {/* Topic AI Results */}
          {loadingTopics && (
            <div className="max-w-5xl mx-auto mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {["GPT", "Claude", "Gemini", "Grok", "Perplexity"].map((ai) => {
                const colors = AI_COLORS[ai];
                return (
                  <div
                    key={ai}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse"
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      {ai}
                    </span>
                    <div className="mt-3 space-y-2">
                      <div className="h-3 bg-zinc-800 rounded w-3/4" />
                      <div className="h-3 bg-zinc-800 rounded w-1/2" />
                      <div className="h-3 bg-zinc-800 rounded w-2/3" />
                      <div className="h-3 bg-zinc-800 rounded w-5/6" />
                      <div className="h-3 bg-zinc-800 rounded w-1/2" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {topicResults && !loadingTopics && topicResults.length > 0 && (
            <div className="max-w-5xl mx-auto mt-4">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">
                AI 추천 주제 — 클릭하면 영상 주제에 자동 입력됩니다
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {topicResults.map((result) => (
                  <AITopicCard
                    key={result.ai}
                    result={result}
                    onSelectTopic={(title) => setTopic(title)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="max-w-2xl mx-auto mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                <Clock className="w-4 h-4" />
                영상 분량
              </label>
              <div className="flex gap-3">
                {[10, 15, 20].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      duration === d
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {d}분
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateOutline}
              disabled={!topic.trim() || generating}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-600 border border-zinc-700 text-zinc-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  4개 AI가 목차를 생성 중입니다...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI 목차 생성
                </>
              )}
            </button>
          </div>

          {/* AI Results */}
          {generating && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {["GPT", "Claude", "Gemini", "Grok"].map((ai) => {
                const colors = AI_COLORS[ai];
                return (
                  <div
                    key={ai}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse"
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      {ai}
                    </span>
                    <div className="mt-4 space-y-2.5">
                      <div className="h-4 bg-zinc-800 rounded w-3/4" />
                      <div className="h-4 bg-zinc-800 rounded w-1/2" />
                      <div className="h-4 bg-zinc-800 rounded w-2/3" />
                      <div className="h-4 bg-zinc-800 rounded w-5/6" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {aiResults && !generating && aiResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">
                AI 추천 목차 — 마음에 드는 목차를 선택하거나 조합해서 사용하세요
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {aiResults.map((result) => (
                  <AIOutlineCard
                    key={result.ai}
                    result={result}
                    onSelect={() => handleSelectOutline(result)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Outline Input + Submit */}
          <div className="max-w-2xl mx-auto mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                <List className="w-4 h-4" />
                목차 입력
                <span className="text-zinc-500 font-normal">
                  (직접 입력하거나 AI 추천에서 선택)
                </span>
              </label>
              <textarea
                ref={outlineRef}
                value={outlineText}
                onChange={(e) => setOutlineText(e.target.value)}
                placeholder={
                  "도입 - 왜 이 주제가 중요한가\n본론 1 - 현재 상황 분석\n본론 2 - 미래 전망\n결론 - 시청자에게 전하는 메시지"
                }
                rows={6}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
              />
              {outlineItems.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {outlineItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-zinc-400"
                    >
                      <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-700 text-xs font-medium text-zinc-300">
                        {i + 1}
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!topic.trim() || outlineItems.length === 0 || submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  프로젝트 생성 중...
                </>
              ) : (
                <>
                  대본 작성 시작
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            {isSupabaseConfigured() && (
              <p className="text-xs text-emerald-500/70 text-center mt-2">
                Supabase에 자동 저장됩니다
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function AIOutlineCard({
  result,
  onSelect,
}: {
  result: AIResult;
  onSelect: () => void;
}) {
  const colors = AI_COLORS[result.ai] || AI_COLORS.GPT;

  if (result.status === "error") {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          {result.ai}
        </span>
        <div className="flex items-center gap-2 mt-6 mb-4 text-zinc-500">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{result.error}</span>
        </div>
      </div>
    );
  }

  const data = result.data!;

  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors flex flex-col`}
    >
      {/* AI Badge */}
      <span
        className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors.badge}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        {result.ai}
      </span>

      {/* Recommended Titles */}
      <div className="mt-4">
        <h4 className="text-xs font-medium text-zinc-500 mb-1.5">추천 제목</h4>
        <ul className="space-y-1">
          {data.titles.map((title, i) => (
            <li key={i} className="text-sm text-zinc-300 flex gap-1.5">
              <span className="text-zinc-600 shrink-0">{i + 1}.</span>
              {title}
            </li>
          ))}
        </ul>
      </div>

      {/* Outline */}
      <div className="mt-4 flex-1">
        <h4 className="text-xs font-medium text-zinc-500 mb-1.5">목차</h4>
        <ul className="space-y-2.5">
          {data.outline.map((item, i) => (
            <li key={i}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-zinc-200">
                  <span className="text-zinc-600 mr-1">{i + 1}.</span>
                  {item.title}
                </span>
                <span className="text-xs text-zinc-600 shrink-0">
                  {item.duration}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 ml-4">
                Q: {item.question}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Select Button */}
      <button
        type="button"
        onClick={onSelect}
        className={`mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium text-white transition-colors`}
      >
        이 목차 선택
      </button>
    </div>
  );
}

function AITopicCard({
  result,
  onSelectTopic,
}: {
  result: TopicAIResult;
  onSelectTopic: (title: string) => void;
}) {
  const colors = AI_COLORS[result.ai] || AI_COLORS.GPT;

  if (result.status === "error") {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          {result.ai}
        </span>
        <div className="flex items-center gap-2 mt-4 text-zinc-500">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-xs">{result.error}</span>
        </div>
      </div>
    );
  }

  const data = result.data!;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors.badge}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        {result.ai}
        {result.ai === "Perplexity" && (
          <span className="text-[10px] opacity-60 ml-0.5">실시간</span>
        )}
      </span>

      <div className="mt-3">
        <h4 className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 mb-1.5">
          <TrendingUp className="w-3 h-3" />
          트렌드 주제
        </h4>
        <div className="space-y-0.5">
          {data.trending?.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectTopic(item.title)}
              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-zinc-800 transition-colors group"
            >
              <span className="text-xs text-zinc-300 group-hover:text-white">
                {item.title}
              </span>
              <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">
                {item.reason}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2">
        <h4 className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 mb-1.5">
          <BookOpen className="w-3 h-3" />
          설명형 주제
        </h4>
        <div className="space-y-0.5">
          {data.explainer?.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectTopic(item.title)}
              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-zinc-800 transition-colors group"
            >
              <span className="text-xs text-zinc-300 group-hover:text-white">
                {item.title}
              </span>
              <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">
                {item.reason}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
