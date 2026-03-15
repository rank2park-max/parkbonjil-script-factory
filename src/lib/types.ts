export interface Draft {
  style: string;
  content: string;
}

export interface IntroData {
  drafts: Draft[];
  selectedDraftIndex: number | null;
  editedDraft: string;
  finalDraft: string | null;
}

export interface OutlineItem {
  title: string;
  drafts: Draft[];
  selectedDraftIndex: number | null;
  editedDraft: string;
  rewrittenDraft: string | null;
  editedRewrite: string;
  finalDraft: string | null;
}

export interface WorkspaceData {
  topic: string;
  duration: number;
  intro: IntroData;
  outline: OutlineItem[];
  currentStep: number; // -1 = 도입부, 0..outline.length-1 = 목차, outline.length = 영상 소스 태깅
  sourceTaggedDraft?: string | null; // 영상 소스 태깅 결과 (null = 미태깅)
  sourceTaggingFinal?: boolean; // 최종 확정 여부
}
