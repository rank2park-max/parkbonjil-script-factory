-- Script Factory v2: 사용자 주도 워크플로우
-- 기존 projects 테이블에 content, research_notes, chat_history 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.

-- content: 전체 대본 (단일 텍스트)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS content text DEFAULT '';

-- research_notes: 리서치 노트 배열 [ { id, content, created_at }, ... ]
ALTER TABLE projects ADD COLUMN IF NOT EXISTS research_notes jsonb DEFAULT '[]'::jsonb;

-- chat_history: AI 대화 기록 [ { role: "user"|"assistant", content }, ... ]
ALTER TABLE projects ADD COLUMN IF NOT EXISTS chat_history jsonb DEFAULT '[]'::jsonb;

-- duration 기본값 유지 (nullable 허용으로 기존 호환)
-- 기존 컬럼(outline, intro, current_step, sections)은 유지하여 v1 프로젝트 호환
