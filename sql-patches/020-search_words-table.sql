-- Table: dict.search_words

DROP TABLE IF EXISTS dict.search_words;

CREATE TABLE dict.search_words
(
    id serial NOT NULL,
    word text COLLATE dict.latviski NOT NULL,
    word_type_id integer NOT NULL DEFAULT 1,
    target_id integer NOT NULL,
    target_type_id integer NOT NULL,
    entry_id integer,
    target_subtype_id integer,
    CONSTRAINT search_words_pkey PRIMARY KEY (id),
    CONSTRAINT search_words_target_type_fk FOREIGN KEY (target_type_id)
        REFERENCES dict.entity_types (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID,
    CONSTRAINT search_words_word_type_fk FOREIGN KEY (word_type_id)
        REFERENCES dict.search_word_types (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

TABLESPACE pg_default;

ALTER TABLE dict.search_words
    OWNER to postgres;

COMMENT ON TABLE dict.search_words
    IS 'Tabula meklēšanai pa formām/locījumiem';

COMMENT ON COLUMN dict.search_words.word
    IS 'meklējamvārds';

COMMENT ON COLUMN dict.search_words.word_type_id
    IS 'meklējamvārda tips';

COMMENT ON COLUMN dict.search_words.target_id
    IS 'adresāta id';

COMMENT ON COLUMN dict.search_words.target_type_id
    IS 'adresāta tips (entry, lexeme, ...)';

COMMENT ON COLUMN dict.search_words.entry_id
    IS 'tā šķirkļa id, kurā mīt adresāts (sakrīt ar target_id, ja target_type ir šķirklis)';

COMMENT ON COLUMN dict.search_words.target_subtype_id
    IS 'adresāta apakštips (no attiecīgās entītes tipiem';
-- Index: fki_search_words_target_type_fk

-- DROP INDEX dict.fki_search_words_target_type_fk;

CREATE INDEX fki_search_words_target_type_fk
    ON dict.search_words USING btree
    (target_type_id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: fki_search_words_word_type_fk

-- DROP INDEX dict.fki_search_words_word_type_fk;

CREATE INDEX fki_search_words_word_type_fk
    ON dict.search_words USING btree
    (word_type_id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: idx_search_words_word

-- DROP INDEX dict.idx_search_words_word;

CREATE INDEX idx_search_words_word
    ON dict.search_words USING btree
    (word COLLATE dict.latviski text_pattern_ops ASC NULLS LAST)
    TABLESPACE pg_default;
