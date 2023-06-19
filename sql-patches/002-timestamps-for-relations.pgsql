ALTER TABLE dict.entry_relations
    ADD COLUMN created_at timestamp with time zone DEFAULT now();
ALTER TABLE dict.entry_relations
    ADD COLUMN updated_at timestamp with time zone;
ALTER TABLE dict.entry_relations
    ADD COLUMN updated_by integer DEFAULT 1;

ALTER TABLE dict.sense_relations
    ADD COLUMN created_at timestamp with time zone DEFAULT now();
ALTER TABLE dict.sense_relations
    ADD COLUMN updated_at timestamp with time zone;
ALTER TABLE dict.sense_relations
    ADD COLUMN updated_by integer DEFAULT 1;

ALTER TABLE dict.sense_entry_relations
    ADD COLUMN created_at timestamp with time zone DEFAULT now();
ALTER TABLE dict.sense_entry_relations
    ADD COLUMN updated_at timestamp with time zone;
ALTER TABLE dict.sense_entry_relations
    ADD COLUMN updated_by integer DEFAULT 1;

ALTER TABLE dict.source_links
    ADD COLUMN created_at timestamp with time zone DEFAULT now();
ALTER TABLE dict.source_links
    ADD COLUMN updated_at timestamp with time zone;
ALTER TABLE dict.source_links
    ADD COLUMN updated_by integer DEFAULT 1;

CREATE TRIGGER update_en_rel_changetimestamp
    BEFORE UPDATE
    ON dict.entry_relations
    FOR EACH ROW
    EXECUTE PROCEDURE dict.update_modification_timestamp();

CREATE TRIGGER update_se_rel_changetimestamp
    BEFORE UPDATE
    ON dict.sense_relations
    FOR EACH ROW
    EXECUTE PROCEDURE dict.update_modification_timestamp();

CREATE TRIGGER update_se_en_rel_changetimestamp
    BEFORE UPDATE
    ON dict.sense_entry_relations
    FOR EACH ROW
    EXECUTE PROCEDURE dict.update_modification_timestamp();

CREATE TRIGGER update_source_links_changetimestamp
    BEFORE UPDATE
    ON dict.source_links
    FOR EACH ROW
    EXECUTE PROCEDURE dict.update_modification_timestamp();

-- ALTER TABLE ONLY dict.entries
--    ADD CONSTRAINT entries_human_key_unique UNIQUE (human_key) DEFERRABLE INITIALLY DEFERRED;
