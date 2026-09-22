-- FIX-5: Physical source_id referential integrity

DO $$
DECLARE
  v_invalid_count int;
  v_orphan_count int;
BEGIN

  -- 1. ADD source_id varchar NULLABLE
  ALTER TABLE jurisprudence_internal.jurisprudence_source_bindings
    ADD COLUMN source_id varchar;

  -- 2. validate payload JSON type + canonical domain rules
  -- 3. backfill source_id from payload_json->>'sourceId'
  UPDATE jurisprudence_internal.jurisprudence_source_bindings
  SET source_id = payload_json->>'sourceId'
  WHERE jsonb_typeof(payload_json->'sourceId') = 'string'
    AND length(payload_json->>'sourceId') BETWEEN 3 AND 160
    AND (payload_json->>'sourceId') ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    AND (payload_json->>'sourceId') !~ '^\d{8,12}$';

  -- 4. assert no invalid/NULL source_id remains
  SELECT COUNT(*) INTO v_invalid_count
  FROM jurisprudence_internal.jurisprudence_source_bindings
  WHERE source_id IS NULL;

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: Found % bindings with missing, malformed, or non-string sourceId in payload_json.', v_invalid_count;
  END IF;

  -- 5. assert no orphan governed-source reference exists
  SELECT COUNT(*) INTO v_orphan_count
  FROM jurisprudence_internal.jurisprudence_source_bindings b
  LEFT JOIN jurisprudence_internal.jurisprudence_governed_sources s
    ON b.source_id = s.source_id
  WHERE s.source_id IS NULL;

  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: Found % orphaned source_id values that do not exist in jurisprudence_governed_sources.', v_orphan_count;
  END IF;

  -- 6. CREATE INDEX on source_id
  CREATE INDEX jurisprudence_source_bindings_source_id_idx ON jurisprudence_internal.jurisprudence_source_bindings (source_id);

  -- 7. ADD FK to governed_sources(source_id) ON DELETE RESTRICT
  ALTER TABLE jurisprudence_internal.jurisprudence_source_bindings
    ADD CONSTRAINT jurisprudence_source_bindings_source_id_jurisprudence_governed_sources_source_id_fk
    FOREIGN KEY (source_id) REFERENCES jurisprudence_internal.jurisprudence_governed_sources (source_id) ON DELETE RESTRICT;

  -- 8. ALTER source_id SET NOT NULL
  ALTER TABLE jurisprudence_internal.jurisprudence_source_bindings
    ALTER COLUMN source_id SET NOT NULL;

END $$;
