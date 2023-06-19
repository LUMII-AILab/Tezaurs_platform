SET client_encoding = 'UTF8';

DROP TABLE IF EXISTS dict.sketch_engine_errors;

CREATE TABLE dict.sketch_engine_errors
(
    id SERIAL NOT NULL,
    sentence text COLLATE pg_catalog."default",
    instance_found text COLLATE pg_catalog."default",
    query text COLLATE pg_catalog."default",
    token_num integer NOT NULL,
    corpname text COLLATE pg_catalog."default",
    CONSTRAINT sketch_engine_errors_pkey PRIMARY KEY (id)
);