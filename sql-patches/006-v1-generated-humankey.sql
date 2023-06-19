drop view if exists dict.v_last_updates;

alter table dict.entries drop column human_key;
alter table dict.entries add column human_key text generated always as (case when type_id = 4 then 'mwe:' || id::text else heading || ':' || homonym_no::text end) stored;

-- heading and homonym_no should always be set, also ensures that no coalescing is needed for human_key generation
alter table dict.entries alter column heading set not null;
alter table dict.entries alter column homonym_no set not null;

-- ensure correct homonym_no generation, fix ~100 duplicated homonym numbers
select heading, homonym_no, count(1), json_agg(e) from dict.entries e group by heading, homonym_no having count(1) > 1;
update dict.entries e
  set homonym_no = (select count(1) from dict.entries where id <= e.id and heading = e.heading)
  from (select unnest(array_agg(id)) id from dict.entries e group by heading, homonym_no having count(1) > 1) u
  where e.id = u.id;
alter table dict.entries add unique (heading, homonym_no);

-- human_key should be unique
alter table dict.entries add constraint entries_human_key unique (human_key);

alter table dict.entries alter column type_id set not null;

create view dict.v_last_updates(updated_at, updated_by, row_new_value, table_name, row_id) as
select
  entries.updated_at,
  entries.updated_by,
  entries.human_key as row_new_value,
  'entries'::text as table_name,
  entries.id as row_id
from dict.entries
union
select
  lexemes.updated_at,
  lexemes.updated_by,
  lexemes.lemma as row_new_value,
  'lexemes'::text as table_name,
  lexemes.id as row_id
from dict.lexemes
union
select
  senses.updated_at,
  senses.updated_by,
  senses.gloss as row_new_value,
  'senses'::text as table_name,
  senses.id as row_id
from dict.senses
union
select
  examples.updated_at,
  examples.updated_by,
  examples.content as row_new_value,
  'examples'::text as table_name,
  examples.id as row_id
from dict.examples
order by 1 desc;
