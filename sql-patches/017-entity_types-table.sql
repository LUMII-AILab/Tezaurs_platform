-- Table: dict.entity_types

DROP TABLE IF EXISTS dict.entity_types;

CREATE TABLE dict.entity_types
(
    id integer NOT NULL DEFAULT nextval('entity_types_id_seq'::regclass),
    name text COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    CONSTRAINT entity_types_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE dict.entity_types
    OWNER to postgres;

--
-- Data for Name: entity_types; Type: TABLE DATA; Schema: dict; Owner: postgres
--

INSERT INTO dict.entity_types (id, name, description) VALUES (1, 'entry', NULL);
INSERT INTO dict.entity_types (id, name, description) VALUES (2, 'lexeme', NULL);
INSERT INTO dict.entity_types (id, name, description) VALUES (3, 'sense', NULL);
INSERT INTO dict.entity_types (id, name, description) VALUES (4, 'example', NULL);
