COMMENT ON TABLE dict.source_links
  IS 'avotu piesaiste šķirklim, kā arī nozīmei vai leksēmai';

ALTER TABLE IF EXISTS dict.source_links
    ADD COLUMN sense_id integer;

COMMENT ON COLUMN dict.source_links.sense_id
    IS 'nozīme';

ALTER TABLE IF EXISTS dict.source_links
    ADD COLUMN lexeme_id integer;

COMMENT ON COLUMN dict.source_links.lexeme_id
    IS 'leksēma';

ALTER TABLE IF EXISTS dict.source_links
    ADD CONSTRAINT source_links_lexemes_fk FOREIGN KEY (lexeme_id)
    REFERENCES dict.lexemes (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE IF EXISTS dict.source_links
    ADD CONSTRAINT source_links_senses_fk FOREIGN KEY (sense_id)
    REFERENCES dict.senses (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE IF EXISTS dict.source_links
    ADD CONSTRAINT source_links_sense_lexeme_check CHECK (sense_id IS NULL OR lexeme_id IS NULL);

COMMENT ON CONSTRAINT source_links_sense_lexeme_check ON dict.source_links
    IS 'nevar būt reizē L un S avoti';

CREATE INDEX IF NOT EXISTS fki_source_links_lexemes_fk
    ON dict.source_links USING btree
    (lexeme_id ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS fki_source_links_senses_fk
    ON dict.source_links USING btree
    (sense_id ASC NULLS LAST)
    TABLESPACE pg_default;
