-- skaitļa vārda tips

update dict.paradigms
set data = data - 'Skaitļa_vārda_tips';

update dict.paradigms
set data = data || '{"Skaitļa vārda tips": "Pamata"}'::jsonb
where legacy_no in (23, 24);

update dict.paradigms
set data = data || '{"Skaitļa vārda tips": "Kārtas"}'::jsonb
where legacy_no = 22;

-- reziduāļa tips

update dict.paradigms
set data = data - 'Reziduāļa_tips';

update dict.paradigms
set data = data || '{"Reziduāļa tips": "Vārds svešvalodā"}'::jsonb
where legacy_no = 39;

-- darbības vārda tips

update dict.paradigms
set data = data - 'Darbības_vārda_tips';

update dict.paradigms
set data = data || '{"Darbības vārda tips": "Patstāvīgs darbības vārds"}'::jsonb
where legacy_no in (15, 16, 17, 18, 19, 20, 45, 46);


