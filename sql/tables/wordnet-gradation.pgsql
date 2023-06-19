SET client_encoding = 'UTF8';

DROP TABLE IF EXISTS dict.gradsets;

CREATE TABLE dict.gradsets
(
    id SERIAL NOT NULL,
    synset_id integer,
    data jsonb,
    CONSTRAINT gradsets_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE dict.gradsets IS 'gradācijas jēdzienu kopas';
COMMENT ON COLUMN dict.gradsets.synset_id IS 'kopu raksturojošais jēdziens';
COMMENT ON COLUMN dict.gradsets.data IS 'JSON dati';

ALTER TABLE dict.synsets
    ADD COLUMN gradset_id integer;

COMMENT ON COLUMN dict.synsets.gradset_id
    IS 'gradācijas kopa, kurai pieder sinonīmu kopa';