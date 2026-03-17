"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEditorProject } from "@/lib/supabase-store";
import { ArrowRight, Film, FolderOpen, Loader2, AlertCircle } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import StandaloneTagSourcesSection from "@/components/StandaloneTagSourcesSection";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || submitting) return;

    if (!isSupabaseConfigured()) {
      setError("Supabase를 설정해주세요. 설정 페이지에서 URL과 Anon Key를 입력하세요.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const projectId = await createEditorProject(topic.trim());
      if (projectId) {
        router.push(`/editor?id=${projectId}`);
      } else {
        setError("프로젝트 생성에 실패했습니다.");
      }
    } catch {
      setError("프로젝트 생성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 새 대본 시작 */}
        <div className="mb-12">
          <h1 className="text-2xl font-bold mb-6">Script Factory v2</h1>
          <p className="text-zinc-400 mb-6">
            사용자가 주도하는 자유로운 대본 작성. 주제를 입력하고 에디터에서 대본을 자유롭게 작성하세요.
          </p>
          <form onSubmit={handleStartNew} className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                <Film className="w-4 h-4" />
                영상 주제
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 인공지능이 바꿀 미래 직업 TOP 10"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              {error && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!topic.trim() || submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  새 대본 시작
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            {isSupabaseConfigured() && (
              <p className="text-xs text-emerald-500/70 text-center">
                Supabase에 자동 저장됩니다
              </p>
            )}
          </form>
        </div>

        {/* 내 프로젝트 */}
        <div className="mb-12">
          <Link
            href="/projects"
            className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-medium text-white group-hover:text-indigo-400 transition-colors">
                내 프로젝트
              </h3>
              <p className="text-sm text-zinc-500">
                저장된 대본 프로젝트 목록
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
          </Link>
        </div>

        {/* 소스 태깅 */}
        <div id="tag-sources" className="pt-12 border-t border-zinc-800">
          <StandaloneTagSourcesSection />
        </div>
      </div>
    </div>
  );
}
