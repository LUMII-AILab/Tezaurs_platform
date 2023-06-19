update lexemes
set paradigm_id = null
where id in (
	select l.id from lexemes l join entries e on e.id = l.entry_id where l.paradigm_id = 52 and e.type_id = 5
);

