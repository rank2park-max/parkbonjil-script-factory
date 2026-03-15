-- 참고 자료 테이블 (기존 프로젝트에 추가하는 경우 이 파일만 실행)
-- Supabase SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS reference_materials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  char_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reference_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on reference_materials" ON reference_materials
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_reference_materials_created_at ON reference_materials(created_at DESC);
