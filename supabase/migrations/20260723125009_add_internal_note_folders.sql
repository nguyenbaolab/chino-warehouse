-- Bảng folders
CREATE TABLE internal_note_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed folder Chung
INSERT INTO internal_note_folders (name, is_default)
VALUES ('Chung', true);

-- Thêm cột folder_id vào internal_notes
ALTER TABLE internal_notes
ADD COLUMN folder_id UUID REFERENCES internal_note_folders(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE internal_note_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read folders" ON internal_note_folders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write folders" ON internal_note_folders
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
