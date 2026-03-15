"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/lib/workspace-store";
import { OutlineItem, IntroData } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import WorkArea from "@/components/WorkArea";
import IntroArea from "@/components/IntroArea";
import RightPanel from "@/components/RightPanel";
import { PanelRight, Copy, Download, Check, Loader2 } from "lucide-react";

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");

  const { data, loaded, save, updateOutlineItem, setCurrentStep } =
    useWorkspace(projectId);
  const [showPanel, setShowPanel] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleStepClick = useCallback(
    (index: number) => setCurrentStep(index),
    [setCurrentStep]
  );

  const handleUpdateIntro = useCallback(
    (updates: Partial<IntroData>) => {
      if (!data) return;
      save({ ...data, intro: { ...data.intro, ...updates } });
    },
    [data, save]
  );

  const handleConfirmIntro = useCallback(
    (finalDraft: string) => {
      if (!data) return;
      save({
        ...data,
        intro: { ...data.intro, finalDraft },
        currentStep: 0,
      });
    },
    [data, save]
  );

  const handleUpdateItem = useCallback(
    (updates: Partial<OutlineItem>) => {
      if (!data) return;
      updateOutlineItem(data.currentStep, updates);
    },
    [data, updateOutlineItem]
  );

  const handleConfirmStep = useCallback(
    (finalDraft: string) => {
      if (!data) return;

      const newOutline = [...data.outline];
      newOutline[data.currentStep] = {
        ...newOutline[data.currentStep],
        finalDraft,
      };

      let nextStep = newOutline.findIndex(
        (item, i) => i > data.currentStep && item.finalDraft === null
      );
      if (nextStep === -1) {
        nextStep = newOutline.findIndex(
          (item, i) => i < data.currentStep && item.finalDraft === null
        );
      }

      save({
        ...data,
        outline: newOutline,
        currentStep: nextStep !== -1 ? nextStep : data.currentStep,
      });
    },
    [data, save]
  );

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          프로젝트 불러오는 중...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">작업 데이터가 없습니다.</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          새 프로젝트 시작
        </button>
      </div>
    );
  }

  const introCompleted = data.intro.finalDraft !== null;
  const outlineCompletedCount = data.outline.filter((i) => i.finalDraft).length;
  const allCompleted =
    introCompleted && data.outline.every((item) => item.finalDraft !== null);
  const isIntroStep = data.currentStep === -1;

  const previousDrafts = [
    data.intro.finalDraft ? `[도입부]\n${data.intro.finalDraft}` : "",
    ...data.outline
      .slice(0, data.currentStep >= 0 ? data.currentStep : 0)
      .filter((item) => item.finalDraft)
      .map((item, i) => `[${i + 1}. ${item.title}]\n${item.finalDraft}`),
  ]
    .filter(Boolean)
    .join("\n\n");

  const fullScript = [
    data.intro.finalDraft ? `[도입부]\n${data.intro.finalDraft}` : null,
    ...data.outline
      .filter((item) => item.finalDraft)
      .map((item, i) => `[${i + 1}. ${item.title}]\n${item.finalDraft}`),
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullScript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.topic} - 대본.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      <Sidebar
        outline={data.outline}
        currentStep={data.currentStep}
        introCompleted={introCompleted}
        onStepClick={handleStepClick}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950">
          <div className="text-sm text-zinc-400">
            <span className="text-white font-medium">{data.topic}</span>
            <span className="mx-2 text-zinc-600">&middot;</span>
            <span>{data.duration}분</span>
            <span className="mx-2 text-zinc-600">&middot;</span>
            <span>
              {(introCompleted ? 1 : 0) + outlineCompletedCount}/
              {1 + data.outline.length} 완료
            </span>
            {projectId && (
              <span className="ml-2 text-emerald-500/60 text-xs">
                자동 저장
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {allCompleted && (
              <>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-zinc-300 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "복사됨" : "전체 복사"}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-zinc-300 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  다운로드
                </button>
              </>
            )}
            <button
              onClick={() => setShowPanel(!showPanel)}
              className={`p-1.5 rounded-md transition-colors ${
                showPanel
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex min-h-0">
          {isIntroStep ? (
            <IntroArea
              intro={data.intro}
              topic={data.topic}
              duration={data.duration}
              allOutlineTitles={data.outline.map((i) => i.title)}
              onUpdate={handleUpdateIntro}
              onConfirm={handleConfirmIntro}
            />
          ) : (
            <WorkArea
              item={data.outline[data.currentStep]}
              stepIndex={data.currentStep}
              topic={data.topic}
              duration={data.duration}
              allOutlineTitles={data.outline.map((i) => i.title)}
              previousDrafts={previousDrafts}
              onUpdate={handleUpdateItem}
              onConfirm={handleConfirmStep}
            />
          )}
          {showPanel && (
            <RightPanel
              outline={data.outline}
              duration={data.duration}
              introDraft={data.intro.finalDraft}
              onClose={() => setShowPanel(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            로딩 중...
          </div>
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
