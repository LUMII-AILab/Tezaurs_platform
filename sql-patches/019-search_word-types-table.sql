-- Table: dict.search_word_types

-- DROP TABLE IF EXISTS dict.search_word_types;

CREATE TABLE dict.search_word_types
(
    id integer NOT NULL DEFAULT nextval('search_word_types_id_seq'::regclass),
    name text COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    CONSTRAINT search_word_types_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE dict.search_word_types
    OWNER to postgres;

COMMENT ON TABLE dict.search_word_types
    IS 'Ierakstu tipi tabulā search_words';

INSERT INTO dict.search_word_types (id, name, description) VALUES (1, 'inflection', NULL);
INSERT INTO dict.search_word_types (id, name, description) VALUES (2, 'asciified', NULL);
