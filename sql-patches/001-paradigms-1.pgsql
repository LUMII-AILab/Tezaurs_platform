--
-- papildina paradigms tabulu ar papildus datiem par vārdšķiru; izmantojams ar 2019.12, 2020.01 datubāzēm
--
update llvv.paradigms
set data = data || '{"Vārdšķira":"Darbības vārds"}'::jsonb
where legacy_no in (15,16,17,18,19,20,45,46,50);

update mlvv.paradigms
set data = data || '{"Vārdšķira":"Darbības vārds"}'::jsonb
where legacy_no in (15,16,17,18,19,20,45,46,50);

update tezaurs.paradigms
set data = data || '{"Vārdšķira":"Darbības vārds"}'::jsonb
where legacy_no in (15,16,17,18,19,20,45,46,50);
