-- select * from lexemes where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Noliedzamie';

-- lexeme flags
update dict.lexemes
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Atgriezeniskais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Atgriezeniskie';

update dict.lexemes
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Jautājamais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Jautājamie';

update dict.lexemes
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Nenoteiktais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Nenoteiktie';

update dict.lexemes
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Noliegtais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Noliedzamie';

update dict.lexemes
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Norādāmais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Norādāmie';

update dict.lexemes
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Noteiktais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Noteiktie';

update dict.lexemes
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Vispārināmais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Vispārināmie';

-- sense flags
update dict.senses
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Atgriezeniskais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Atgriezeniskie';

update dict.senses
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Jautājamais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Jautājamie';

update dict.senses
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Nenoteiktais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Nenoteiktie';

update dict.senses
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Noliegtais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Noliedzamie';

update dict.senses
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Norādāmais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Norādāmie';

update dict.senses
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Noteiktais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Noteiktie';

update dict.senses
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Vispārināmais"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Vispārināmie';

