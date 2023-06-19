-- select * from lexemes where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Noliedzamie';

-- lexeme flags

update dict.lexemes
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Personas"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Personu';

-- sense flags

update dict.senses
set data = jsonb_set(data, '{Gram, Flags, "Vietniekvārda tips"}'::text[], '"Personas"'::jsonb)
where data->'Gram'->'Flags'->>'Vietniekvārda tips' = 'Personu';

