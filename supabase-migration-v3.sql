-- Script Factory v3: 리서치 패널 (좌측 패널)
-- research_history, script_notes, script_references
-- Supabase SQL Editor에서 실행하세요.

-- 검색 히스토리 (Perplexity 리서치 결과)
CREATE TABLE IF NOT EXISTS research_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  query text NOT NULL,
  result text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_history_script_id ON research_history(script_id);
CREATE INDEX IF NOT EXISTS idx_research_history_created_at ON research_history(created_at DESC);

-- 대본별 메모 (단일 텍스트)
CREATE TABLE IF NOT EXISTS script_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  content text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_script_notes_script_id ON script_notes(script_id);

-- 참고자료 (URL 또는 업로드 파일)
CREATE TABLE IF NOT EXISTS script_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url text,
  title text,
  file_url text,
  file_content text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_script_references_script_id ON script_references(script_id);

-- RLS 정책 (anon key 사용 시 필요)
ALTER TABLE research_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for research_history" ON research_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for script_notes" ON script_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for script_references" ON script_references FOR ALL USING (true) WITH CHECK (true);
