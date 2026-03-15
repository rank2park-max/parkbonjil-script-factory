"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  listSupabaseProjects,
  deleteSupabaseProject,
  ProjectListItem,
} from "@/lib/supabase-store";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  FolderOpen,
  Trash2,
  Clock,
  Loader2,
  AlertCircle,
  Plus,
  CheckCircle2,
  PlayCircle,
  ChevronRight,
} from "lucide-react";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const ok = isSupabaseConfigured();
    setConfigured(ok);
    if (ok) {
      loadProjects();
    } else {
      setLoading(false);
    }
  }, []);

  async function loadProjects() {
    setLoading(true);
    const data = await listSupabaseProjects();
    setProjects(data);
    setLoading(false);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    setDeleting(id);
    const ok = await deleteSupabaseProject(id);
    if (ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
    setDeleting(null);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  }

  if (!configured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-10 h-10 text-zinc-600" />
        <div className="text-center">
          <p className="text-zinc-300 font-medium mb-1">Supabase 미연결</p>
          <p className="text-zinc-500 text-sm max-w-md">
            프로젝트 저장 기능을 사용하려면 Supabase를 설정해주세요.
            <br />
            설정 페이지에서 URL과 Anon Key를 입력하거나, .env.local 파일에 환경변수를 추가하세요.
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => router.push("/settings")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            설정으로 이동
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg border border-zinc-700 transition-colors"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-indigo-400" />
            내 프로젝트
          </h1>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 프로젝트
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 mb-1">저장된 프로젝트가 없습니다</p>
            <p className="text-zinc-600 text-sm">
              홈에서 새 프로젝트를 시작해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => {
              const outlineCount = Array.isArray(project.outline)
                ? project.outline.length
                : 0;
              const isCompleted = project.status === "completed";

              return (
                <button
                  key={project.id}
                  onClick={() => router.push(`/workspace?id=${project.id}`)}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 hover:bg-zinc-900/80 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <PlayCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <h3 className="text-sm font-medium text-white truncate">
                          {project.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 ml-6">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {project.duration}분
                        </span>
                        <span>목차 {outlineCount}개</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {isCompleted ? "완료" : "진행 중"}
                        </span>
                        <span>{formatDate(project.updated_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        disabled={deleting === project.id}
                        className="p-1.5 text-zinc-600 hover:text-red-400 rounded-md hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {deleting === project.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
