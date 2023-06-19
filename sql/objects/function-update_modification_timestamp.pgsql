CREATE OR REPLACE FUNCTION dict.update_modification_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  _user_id int;
BEGIN
   _user_id := current_setting('myvars.appuser', true);
   IF row(NEW.*) IS DISTINCT FROM row(OLD.*) THEN
      NEW.updated_at = now();
	  NEW.updated_by = _user_id;
      RETURN NEW;
   ELSE
      RETURN OLD;
   END IF;
END;
$function$
;
