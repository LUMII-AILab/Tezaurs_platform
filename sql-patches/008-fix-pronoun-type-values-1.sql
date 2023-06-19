-- flag values
update dict.grammar_flag_values
set value = 'Atgriezeniskais'
where flag_id = 50 and value = 'Atgriezeniskie';

update dict.grammar_flag_values
set value = 'Jautājamais'
where flag_id = 50 and value = 'Jautājamie';

update dict.grammar_flag_values
set value = 'Nenoteiktais'
where flag_id = 50 and value = 'Nenoteiktie';

update dict.grammar_flag_values
set value = 'Noliegtais'
where flag_id = 50 and value = 'Noliedzamie';

update dict.grammar_flag_values
set value = 'Norādāmais'
where flag_id = 50 and value = 'Norādāmie';

update dict.grammar_flag_values
set value = 'Noteiktais'
where flag_id = 50 and value = 'Noteiktie';

update dict.grammar_flag_values
set value = 'Vispārināmais'
where flag_id = 50 and value = 'Vispārināmie';

update dict.grammar_flag_values
set value = 'Personas'
where flag_id = 50 and value = 'Personu';

-- deprecate 'Vispārināmais'
update dict.grammar_flag_values
set is_deprecated = true
where flag_id = 50 and value = 'Vispārināmais';


