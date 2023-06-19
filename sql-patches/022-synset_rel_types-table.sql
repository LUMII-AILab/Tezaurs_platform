SET client_encoding = 'UTF8';

ALTER TABLE dict.synset_rel_types
    ADD COLUMN name_inverse text COLLATE pg_catalog."default";

COMMENT ON COLUMN dict.synset_rel_types.name_inverse
    IS 'saites tehniskais nosaukums (pretējā virzienā)';

ALTER TABLE dict.synset_rel_types
    ADD COLUMN description_inverse text COLLATE pg_catalog."default";

COMMENT ON COLUMN dict.synset_rel_types.description_inverse
    IS 'saites apraksts (pretējā virzienā)';

ALTER TABLE dict.synset_rel_types
    ADD COLUMN is_symmetric boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN dict.synset_rel_types.is_symmetric
    IS 'vai saite ir simetriska';

ALTER TABLE dict.synset_rel_types
    ADD COLUMN relation_name text COLLATE pg_catalog."default";

COMMENT ON COLUMN dict.synset_rel_types.relation_name
    IS 'Saites vispārīgais nosaukums (kopīgs abiem virzieniem)';


INSERT INTO dict.synset_rel_types (id, name, description, name_inverse, description_inverse, is_symmetric, relation_name) VALUES (1, 'hyperonym', 'hiperonīms', 'hyponym', 'hiponīms', false, 'hyponymy');
INSERT INTO dict.synset_rel_types (id, name, description, name_inverse, description_inverse, is_symmetric, relation_name) VALUES (2, 'holonym', 'holonīms', 'meronym', 'meronīms', false, 'meronymy');
INSERT INTO dict.synset_rel_types (id, name, description, name_inverse, description_inverse, is_symmetric, relation_name) VALUES (3, 'synonym', 'aptuvens sinonīms', 'synonym', 'aptuvens sinonīms', true, 'synonymy');
INSERT INTO dict.synset_rel_types (id, name, description, name_inverse, description_inverse, is_symmetric, relation_name) VALUES (4, 'also', 'saistīts ar', 'also', 'saistīts ar', true, 'link');

SELECT pg_catalog.setval('dict.synset_rel_types_id_seq', 4, true);
