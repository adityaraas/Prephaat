ALTER TABLE syllabus_content_items DROP CONSTRAINT syllabus_content_items_kind_check;
ALTER TABLE syllabus_content_items ADD CONSTRAINT syllabus_content_items_kind_check CHECK(kind IN ('study_material','mcq','pyq','current_affairs'));
CREATE TABLE syllabus_topic_progress (
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL REFERENCES syllabus_nodes(id),
  status TEXT NOT NULL CHECK (status IN ('not-started','reading','revised')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(account_id,node_id)
);
CREATE TABLE syllabus_practice_answers (
  id BIGSERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL REFERENCES syllabus_nodes(id),
  question_id TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX syllabus_practice_by_account ON syllabus_practice_answers(account_id,node_id);
