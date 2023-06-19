-- Table: dict.feedbacks

DROP TABLE IF EXISTS dict.feedbacks;

CREATE TABLE dict.feedbacks
(
    id serial NOT NULL,
    entry_id integer NOT NULL,
    text text COLLATE pg_catalog."default" NOT NULL,
    status smallint NOT NULL DEFAULT 0,
    created_at timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fixed_by integer,
    fixed_at timestamp(6) with time zone,
    CONSTRAINT feedbacks_pkey PRIMARY KEY (id),
    CONSTRAINT feedbacks_entries_fk FOREIGN KEY (entry_id)
        REFERENCES dict.entries (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

TABLESPACE pg_default;

ALTER TABLE dict.feedbacks
    OWNER to postgres;

-- Index: fki_feedbacks_entries_fk

DROP INDEX IF EXISTS dict.fki_feedbacks_entries_fk;

CREATE INDEX fki_feedbacks_entries_fk
    ON dict.feedbacks USING btree
    (entry_id ASC NULLS LAST)
    TABLESPACE pg_default;
