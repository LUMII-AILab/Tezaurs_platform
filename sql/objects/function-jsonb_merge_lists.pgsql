CREATE OR REPLACE FUNCTION dict.jsonb_merge_lists(l1 jsonb, l2 jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
	declare
		l jsonb;
		ls text[];
		e jsonb;
	begin
		-- checks
		if l1 is null then
			return l2;
		elsif l2 is null then
			return l1;
		end if;
		if jsonb_typeof(l1) <> 'array' or jsonb_typeof(l2) <> 'array' then
			raise exception 'both parameters should be jsonb arrays';
		end if;

		-- work
		l := l1;
		for e in select jsonb_array_elements(l2)
		loop
			if not (l @> e) then
				l := l || e;
			end if;
		end loop;

		-- TODO: sort l
/*
		select * from jsonb_array_elements_text(l) order by value into ls;
        l := jsonb_agg(ls);
*/

        return l;
	END;
$function$
;
