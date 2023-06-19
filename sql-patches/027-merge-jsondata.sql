CREATE OR REPLACE FUNCTION dict.merge_entry_jsondata(j1 jsonb, j2 jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
	result jsonb;
	known_keys text[] := '{Gram,Etymology,Normative,ImportNotices}';
    known_gram_keys text[] := '{Flags,StructuralRestrictions,FreeText,FlagText,Leftovers}';
    kv record;
    kv2 record;
    kv3 record;
    j1g jsonb;
    j2g jsonb;
    j1gf jsonb;
    j2gf jsonb;
begin
    -- Sagaidāmā j1 un j2 struktūra
    -- data
    --  Etymology?
    --  Normative?
    --  ImportNotices[]?
    --  Gram{}?
    --    Flags{}?
    --    StructuralRestrictions{}?
    --    FreeText?
    --    FlagText?
    --    Leftovers?
    --    ...

    -- checks
    if j1 is null then
        return j2;
    end if;
    if j2 is null then
        return j1;
    end if;
    if jsonb_typeof(j1) <> 'object' or jsonb_typeof(j2) <> 'object' then
        raise exception 'both parameters should be jsonb objects';
    end if;

    -- work
    result := j1;

    for kv in select * from jsonb_each(j2)
        loop
            if result -> kv.key is null then
                result := jsonb_set(result, array[kv.key], j2 -> kv.key, true);
            elsif jsonb_typeof(j2 -> kv.key) = 'array' then
                result := jsonb_set(result, array[kv.key], dict.jsonb_merge_lists(result -> kv.key, j2 -> kv.key));
            elsif kv.key <> 'Gram' then
                raise exception 'Abiem šķirkļiem ir json lauks %, jāapvieno manuāli', kv.key;
            else -- Gram
                j1g := j1 -> 'Gram';
                j2g := j2 -> 'Gram';
                for kv2 in select * from jsonb_each(j2g)
                    loop
                        if j1g -> kv2.key is null then
                            result := jsonb_set(result, array['Gram', kv2.key], j2g -> kv2.key, true);
                        elsif jsonb_typeof(j2g -> kv2.key) = 'array' then
                            result := jsonb_set(result, array['Gram', kv2.key], dict.jsonb_merge_lists(j1g -> kv2.key, j2g -> kv2.key));
                        elsif kv2.key <> 'Flags' then
                            raise exception 'Abu šķirkļu gramatikām ir json lauks %, jāapvieno manuāli', kv2.key;
                        else -- Flags
--                            result := jsonb_set(result, '{Gram,Flags}', dict.merge_flags(j1g -> 'Flags', j2g -> 'Flags'));
                            j1gf := j1g -> 'Flags';
                            j2gf := j2g -> 'Flags';
                            for kv3 in select * from jsonb_each(j2gf)
                                loop
                                    if j1gf -> kv3.key is null then
                                        result := jsonb_set(result, array['Gram', 'Flags', kv3.key], j2gf -> kv3.key, true);
                                    elsif jsonb_typeof(j2gf -> kv3.key) = 'array' then
                                        result := jsonb_set(result, array['Gram', 'Flags', kv3.key], dict.jsonb_merge_lists(j1gf -> kv3.key, j2gf -> kv3.key));
                                    elsif j1gf -> kv3.key = kv3.value then
                                        continue;
                                    else
                                        raise exception 'skalāram karogam % konfliktējošas vērtības % un %; konflikts jānovērš manuāli', kv3.key, j1gf -> kv3.key, kv3.value;
                                    end if;
                                end loop;
                        end if;
                    end loop;
            end if;

        end loop;

	return jsonb_strip_nulls(result);
end;
$function$
;
