CREATE OR REPLACE FUNCTION dict.log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  diff jsonb;
  _user_id int;
  _entry_id int;
begin
  _user_id := current_setting('myvars.appuser', true);
  
  -- calculate entry id
  _entry_id := null;
  if (tg_op = 'DELETE') or (tg_op = 'UPDATE') then
    if tg_table_name = 'entries' then
        _entry_id := old.id;
    elsif tg_table_name = 'lexemes' or tg_table_name = 'senses' or tg_table_name = 'source_links' then
        _entry_id := old.entry_id;
    elsif tg_table_name = 'examples' then
        if old.entry_id is not null then
            _entry_id := old.entry_id;
        else
            select entry_id from dict.senses where id = old.sense_id into _entry_id;
        end if;
    end if;
  elsif (tg_op = 'INSERT') then
    if tg_table_name = 'entries' then
        _entry_id := new.id;
    elsif tg_table_name = 'lexemes' or tg_table_name = 'senses' or tg_table_name = 'source_links' then
        _entry_id := new.entry_id;
    elsif tg_table_name = 'examples' then
        if old.entry_id is not null then
            _entry_id := new.entry_id;
        else
            select entry_id from dict.senses where id = new.sense_id into _entry_id;
        end if;
    end if;
  end if;
  
  -- insert into changes
  if (tg_op = 'DELETE') then
    insert into
      dict.changes(entry_id, entity_id, entity_type, operation, effective_on, db_user, user_id, transaction_id, data_before, data_after, data_diff)
    select
      _entry_id,
      old.id,
      tg_table_name,
      tg_op,
      now(),
      USER,
      _user_id,
      txid_current(),
      row_to_json(old.*)::jsonb,
      null,
      null
    ;
    return old;
  elsif (tg_op = 'UPDATE') then
    diff := dict.jsonb_diff(row_to_json(old.*)::jsonb, row_to_json(new.*)::jsonb) - 'created_at' - 'updated_at' - 'updated_by';
    if diff != '{}'::jsonb then
      insert into
        dict.changes(entry_id, entity_id, entity_type, operation, effective_on, db_user, user_id, transaction_id, data_before, data_after, data_diff)
      select
        _entry_id,
        old.id,
        tg_table_name,
        tg_op,
        now(),
        USER,
        _user_id,
        txid_current(),
        row_to_json(old.*)::jsonb,
        row_to_json(new.*)::jsonb,
        diff
      ;
    end if;
    return new;
  elsif (tg_op = 'INSERT') then
    insert into
      dict.changes(entry_id, entity_id, entity_type, operation, effective_on, db_user, user_id, transaction_id, data_before, data_after, data_diff)
    select
      _entry_id,
      new.id,
      tg_table_name,
      tg_op,
      now(),
      USER,
      _user_id,
      txid_current(),
      null,
      row_to_json(new.*)::jsonb,
      jsonb_strip_nulls(row_to_json(new.*)::jsonb)
    ;
    return new;
  end if;
  return null;
end;
$function$
;
