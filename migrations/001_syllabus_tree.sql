CREATE TABLE IF NOT EXISTS syllabus_sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS syllabus_nodes (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 500),
  parent_id TEXT REFERENCES syllabus_nodes(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  node_type TEXT NOT NULL CHECK (node_type IN ('exam','stage','paper','subject','topic','subtopic')),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  source_id TEXT REFERENCES syllabus_sources(id),
  source_ref TEXT,
  coverage TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  seed_managed BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK ((node_type='exam' AND parent_id IS NULL AND id IN ('upsc','bpsc')) OR (node_type<>'exam' AND parent_id IS NOT NULL)),
  CHECK (id IS DISTINCT FROM parent_id)
);
CREATE INDEX IF NOT EXISTS syllabus_nodes_by_parent ON syllabus_nodes(parent_id,display_order,id);

CREATE OR REPLACE FUNCTION validate_syllabus_hierarchy() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual_type TEXT; expected_type TEXT;
BEGIN
  SELECT CASE node_type WHEN 'stage' THEN 'exam' WHEN 'paper' THEN 'stage' WHEN 'subject' THEN 'paper' WHEN 'topic' THEN 'subject' WHEN 'subtopic' THEN 'topic' END
  INTO expected_type FROM syllabus_nodes WHERE id=NEW.id;
  IF expected_type IS NOT NULL THEN
    SELECT p.node_type INTO actual_type FROM syllabus_nodes n JOIN syllabus_nodes p ON p.id=n.parent_id WHERE n.id=NEW.id;
    IF actual_type IS DISTINCT FROM expected_type THEN
      RAISE EXCEPTION 'Invalid syllabus parent level for %',NEW.id USING ERRCODE='23514';
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM syllabus_nodes c JOIN syllabus_nodes p ON p.id=c.parent_id
    WHERE p.id=NEW.id AND p.node_type IS DISTINCT FROM CASE c.node_type
      WHEN 'stage' THEN 'exam' WHEN 'paper' THEN 'stage' WHEN 'subject' THEN 'paper' WHEN 'topic' THEN 'subject' WHEN 'subtopic' THEN 'topic' END
  ) THEN RAISE EXCEPTION 'Invalid syllabus child level for %',NEW.id USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER syllabus_hierarchy_check AFTER INSERT OR UPDATE ON syllabus_nodes
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_syllabus_hierarchy();

-- File-backed study material, question banks and news keep their existing source
-- files. This catalog stores stable identities and tags, not duplicate content.
CREATE TABLE IF NOT EXISTS syllabus_content_items (
  kind TEXT NOT NULL CHECK (kind IN ('study_material','mcq','current_affairs')),
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  syllabus_node_id TEXT REFERENCES syllabus_nodes(id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(kind,id)
);
CREATE INDEX IF NOT EXISTS syllabus_content_by_node ON syllabus_content_items(syllabus_node_id,kind) WHERE active;

ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS syllabus_node_id TEXT REFERENCES syllabus_nodes(id) ON DELETE RESTRICT;
ALTER TABLE planner_blocks ADD COLUMN IF NOT EXISTS syllabus_node_id TEXT REFERENCES syllabus_nodes(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS study_materials_by_syllabus ON study_materials(syllabus_node_id);
CREATE INDEX IF NOT EXISTS planner_blocks_by_syllabus ON planner_blocks(account_id,syllabus_node_id) WHERE deleted_at IS NULL;
