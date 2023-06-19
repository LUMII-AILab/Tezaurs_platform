SET client_encoding = 'UTF8';

INSERT INTO dict.synset_rel_types (id, name, description, name_inverse, description_inverse, is_symmetric, relation_name) VALUES (5, 'antonym', 'antonīms', 'antonym', 'antonīms', true, 'antonymy');

SELECT pg_catalog.setval('dict.synset_rel_types_id_seq', 5, true);
