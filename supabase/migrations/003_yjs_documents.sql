-- ============================================================
-- Yjs document persistence (for Hocuspocus server)
-- ============================================================
CREATE TABLE yjs_documents (
  doc_name   TEXT PRIMARY KEY,
  state      BYTEA,
  updated_at TIMESTAMPTZ DEFAULT now()
);
