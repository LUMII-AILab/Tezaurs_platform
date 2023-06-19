DROP TABLE IF EXISTS dict.potential_link_answers;
DROP TABLE IF EXISTS dict.potential_link_guesses;
DROP TABLE IF EXISTS dict.potential_links;

CREATE TABLE dict.potential_links
(
    id       serial   NOT NULL,
    status   smallint NOT NULL DEFAULT 0,
    sense_id integer  NOT NULL,
    order_no integer,
    CONSTRAINT potential_links_pkey PRIMARY KEY (id)
)
    TABLESPACE pg_default;

CREATE TABLE dict.potential_link_guesses
(
    id                serial  NOT NULL,
    potential_link_id integer NOT NULL,
    score             real,
    no                smallint,
    pwn               character(10),
    CONSTRAINT potential_link_guesses_pkey PRIMARY KEY (id),
    CONSTRAINT potential_link_guesses_potential_links_fk FOREIGN KEY (potential_link_id)
        REFERENCES dict.potential_links (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

    TABLESPACE pg_default;

CREATE TABLE dict.potential_link_answers
(
    id                serial                      NOT NULL,
    user_id           integer,
    guess_id          integer,
    potential_link_id integer                     NOT NULL,
    answer_type       integer                     NOT NULL,
    created_at        timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        timestamp(6) with time zone,
    CONSTRAINT potential_link_answers_pkey PRIMARY KEY (id),
    CONSTRAINT potential_link_answers_potential_link_guesses_fk FOREIGN KEY (guess_id)
        REFERENCES dict.potential_link_guesses (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID,
    CONSTRAINT potential_link_answers_potential_links_fk FOREIGN KEY (potential_link_id)
        REFERENCES dict.potential_links (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)
    TABLESPACE pg_default;

ALTER TABLE dict.potential_links
    OWNER to postgres;

ALTER TABLE dict.potential_link_guesses
    OWNER to postgres;

ALTER TABLE dict.potential_link_answers
    OWNER to postgres;