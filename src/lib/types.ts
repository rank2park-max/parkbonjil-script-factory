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
  currentStep: number; // -1 = 도입부, 0+ = 목차 인덱스
}
