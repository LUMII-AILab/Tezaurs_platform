ALTER TABLE dict.changes
    ADD COLUMN entry_id integer;

CREATE INDEX idx_changes_entity
    ON dict.changes USING btree
    (entity_type COLLATE pg_catalog."default" ASC NULLS LAST, entity_id ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX idx_changes_entry_id
    ON dict.changes USING btree
    (entry_id ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX idx_changes_effective_on
    ON dict.changes USING btree
    (effective_on ASC NULLS LAST)
    TABLESPACE pg_default;

-- fill entry_id with values

update dict.changes
set entry_id = entity_id
where entry_id is null and entity_type = 'entries';

update dict.changes c
set entry_id = x.entry_id
from dict.senses x
where c.entry_id is null and c.entity_type = 'senses' and c.entity_id = x.id;

update dict.changes c
set entry_id = x.entry_id
from dict.lexemes x
where c.entry_id is null and c.entity_type = 'lexemes' and c.entity_id = x.id;

update dict.changes c
set entry_id = x.entry_id
from dict.examples x
where c.entry_id is null and c.entity_type = 'examples' and c.entity_id = x.id and x.entry_id is not null;

update dict.changes c
set entry_id = s.entry_id
from dict.examples x join dict.senses s on x.sense_id = s.id
where c.entry_id is null and c.entity_type = 'examples' and c.entity_id = x.id and s.entry_id is not null;

update dict.changes c
set entry_id = x.entry_id
from dict.source_links x
where c.entry_id is null and c.entity_type = 'source_links' and c.entity_id = x.id;

