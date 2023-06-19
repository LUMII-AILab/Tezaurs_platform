-- id must be 4 - FIXME later
SELECT setval('sentry_rel_types_id_seq', 4, false);
insert into sense_entry_rel_types (name, description, name_inverse, description_inverse, is_symmetric) values ('hasGlossLink', 'gloss contains a link to an entry', 'entryForGloss', 'entry is linked in gloss', false);

-- id must be 4 - FIXME later
SELECT setval('sense_rel_types_id_seq', 4, false);
insert into sense_rel_types (name, description, name_inverse, description_inverse, is_symmetric) values ('hasGlossLink', 'gloss contains a link to a sense', 'senseForGloss', 'sense is linked in gloss', false);