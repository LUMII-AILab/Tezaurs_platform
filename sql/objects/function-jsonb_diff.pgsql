CREATE OR REPLACE FUNCTION dict.jsonb_diff(val_old jsonb, val_new jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  result jsonb;
  v record;
begin
  result := val_new;
  for v in select * from jsonb_each(val_old)
    loop
      if result ? v.key and result -> v.key = v.value
      then
        result := result - v.key;
      elsif result ? v.key then
        continue;
      else
        result := result || jsonb_build_object(v.key, 'null');
      end if;
    end loop;
  return result;
end;
$function$
;
