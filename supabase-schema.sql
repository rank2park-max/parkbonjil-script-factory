-- Script Factory: Supabase Schema
-- Supabase SQL Editor에서 실행하세요.

-- projects 테이블
CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  duration integer NOT NULL DEFAULT 15,
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  intro text,
  current_step integer NOT NULL DEFAULT -1,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- sections 테이블
CREATE TABLE sections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section_index integer NOT NULL,
  title text NOT NULL,
  drafts jsonb DEFAULT '[]'::jsonb,
  selected_draft_index integer,
  selected_draft text,
  rewritten text,
  final text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, section_index)
);

-- RLS 정책 (인증 없이 전체 접근 허용)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on projects" ON projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on sections" ON sections
  FOR ALL USING (true) WITH CHECK (true);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 인덱스
CREATE INDEX idx_sections_project_id ON sections(project_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
