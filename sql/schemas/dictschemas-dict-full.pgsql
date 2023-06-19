--
-- PostgreSQL database dump
--

-- Dumped from database version 12.6 (Ubuntu 12.6-1.pgdg18.04+1)
-- Dumped by pg_dump version 12.6 (Ubuntu 12.6-1.pgdg18.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: dict; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA dict;


ALTER SCHEMA dict OWNER TO postgres;

--
-- Name: latviski; Type: COLLATION; Schema: dict; Owner: postgres
--

CREATE COLLATION dict.latviski (provider = icu, locale = 'lv-LV');


ALTER COLLATION dict.latviski OWNER TO postgres;

--
-- Name: disable_audit(); Type: FUNCTION; Schema: dict; Owner: postgres
--

CREATE FUNCTION dict.disable_audit() RETURNS void
    LANGUAGE plpgsql
    AS $$begin
	alter table dict.entries disable trigger log_entries;
	alter table dict.senses disable trigger log_senses;
	alter table dict.lexemes disable trigger log_lexemes;
	alter table dict.examples disable trigger log_examples;
	alter table dict.sense_relations disable trigger log_sense_relations;
	alter table dict.sense_entry_relations disable trigger log_sense_entry_relations;
	alter table dict.entry_relations disable trigger log_entry_relations;
	alter table dict.source_links disable trigger log_source_links;
end;$$;


ALTER FUNCTION dict.disable_audit() OWNER TO postgres;

--
-- Name: enable_audit(); Type: FUNCTION; Schema: dict; Owner: postgres
--

CREATE FUNCTION dict.enable_audit() RETURNS void
    LANGUAGE plpgsql
    AS $$begin
	alter table dict.entries enable trigger log_entries;
	alter table dict.senses enable trigger log_senses;
	alter table dict.lexemes enable trigger log_lexemes;
	alter table dict.examples enable trigger log_examples;
	alter table dict.sense_relations enable trigger log_sense_relations;
	alter table dict.sense_entry_relations enable trigger log_sense_entry_relations;
	alter table dict.entry_relations enable trigger log_entry_relations;
	alter table dict.source_links enable trigger log_source_links;
end;$$;


ALTER FUNCTION dict.enable_audit() OWNER TO postgres;

--
-- Name: jsonb_diff(jsonb, jsonb); Type: FUNCTION; Schema: dict; Owner: postgres
--

CREATE FUNCTION dict.jsonb_diff(val_old jsonb, val_new jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
declare
  result jsonb; v record;
begin
  result = val_new;
  for v in select * from jsonb_each(val_old)
    loop
      if result ? v.key and result -> v.key = v.value
      then
        result = result - v.key;
      elsif result ? v.key then
        continue;
      else
        result = result || jsonb_build_object(v.key, 'null');
      end if;
    end loop;
  return result;
end;
$$;


ALTER FUNCTION dict.jsonb_diff(val_old jsonb, val_new jsonb) OWNER TO postgres;

--
-- Name: jsonb_merge_lists(jsonb, jsonb); Type: FUNCTION; Schema: dict; Owner: postgres
--

CREATE FUNCTION dict.jsonb_merge_lists(l1 jsonb, l2 jsonb) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
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
$$;


ALTER FUNCTION dict.jsonb_merge_lists(l1 jsonb, l2 jsonb) OWNER TO postgres;

--
-- Name: log_changes(); Type: FUNCTION; Schema: dict; Owner: postgres
--

CREATE FUNCTION dict.log_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
            raise notice 'sarēķinātais entry id %', _entry_id;
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
$$;


ALTER FUNCTION dict.log_changes() OWNER TO postgres;

--
-- Name: merge_entries(integer, integer); Type: PROCEDURE; Schema: dict; Owner: postgres
--

CREATE PROCEDURE dict.merge_entries(r_id integer, d_id integer)
    LANGUAGE plpgsql
    AS $$
declare
  next_no int;
  ee_rel dict.entry_relations%rowtype;
  source_rel dict.source_links%rowtype;
  lex dict.lexemes%rowtype;
  sense dict.senses%rowtype;
  ex dict.examples%rowtype;
  r dict.entries%rowtype;
  d dict.entries%rowtype;
begin

  if d_id = r_id then
    raise exception 'nevar apvienot šķirkli pašu ar sevi';
  end if;

  select * from dict.entries where id = d_id into d;
  if not found then
    raise exception 'devējšķirklis neeksistē';
  end if;

  select * from dict.entries where id = r_id into r;
  if not found then
    raise exception 'saņēmējšķirklis neeksistē';
  end if;

  if r.type_id <> d.type_id then
    raise exception 'apvienojamo šķirkļu tipiem ir jāsakrīt';
  end if;

  -- pats entry
  -- notes
  if d.notes is not null then
  	if r.notes is null then
        update dict.entries set notes = d.notes where id = r_id;
  	else
        update dict.entries set notes = concat(r.notes, '; ', d.notes) where id = r_id;
        raise notice 'automātiski apvienotas šķirkļa piezīmes';
  	end if;
  end if;

  -- json data
  if d.data is not null then
    if r.data is null then
        update dict.entries set data = d.data where id = r_id;
    else
        update dict.entries set data = dict.merge_entry_jsondata(r.data, d.data) where id = r_id;
    end if;
  end if;

  -- entry-entry saites

  -- izmetam saites, kuras kļūtu par cilpu (+ziņojam)
  if exists (select 1 from dict.entry_relations where entry_1_id = d_id and entry_2_id = r_id) then
    delete from dict.entry_relations where entry_1_id = d_id and entry_2_id = r_id;
    raise notice 'izmetam saiti starp apvienojamajiem šķirkļiem';
  end if;
  if exists (select 1 from dict.entry_relations where entry_1_id = r_id and entry_2_id = d_id) then
    delete from dict.entry_relations where entry_1_id = r_id and entry_2_id = d_id;
    raise notice 'izmetam saiti starp apvienojamajiem šķirkļiem';
  end if;

  -- pārceļam saites, kam entry_1_id = d_id
  -- jāskatās, vai saite ar tādu pašu otru galu un tipu nav jau priekšā
  for ee_rel in
    select *
    from dict.entry_relations
    where entry_1_id = d_id
  loop

    if not exists (
      select 1
      from dict.entry_relations
      where entry_1_id = r_id
      and entry_2_id = ee_rel.entry_2_id
      and type_id = ee_rel.type_id
    ) then
      update dict.entry_relations
      set entry_1_id = r_id
      where id = ee_rel.id;
    else
      raise notice 'jau eksistē saite starp % un % ar tipu %', r_id, ee_rel.entry_2_id, ee_rel.type_id;
      delete from dict.entry_relations
        where id = ee_rel.id;
    end if;

  end loop;

  -- pārceļam saites, kam entry_2_id = d_id
  -- jāskatās, vai saite ar tādu pašu otru galu un tipu nav jau priekšā
  for ee_rel in
    select *
    from dict.entry_relations
    where entry_2_id = d_id
  loop

    if not exists (
      select 1
      from dict.entry_relations
      where entry_2_id = r_id
        and entry_1_id = ee_rel.entry_1_id
        and type_id = ee_rel.type_id
    ) then
      update dict.entry_relations
      set entry_2_id = r_id
      where id = ee_rel.id;
    else
      raise notice 'jau eksistē saite starp % un % ar tipu %', ee_rel.entry_1_id, r_id, ee_rel.type_id;
      delete from dict.entry_relations
        where id = ee_rel.id;
    end if;

  end loop;

  -- sense-entry saites
  update dict.sense_entry_relations
  -- set entry_id = r_id, hidden = true
  set entry_id = r_id
  where entry_id = d_id;

  -- source saites
  -- jāskatās, vai tāds source jau nav priekšā
  for source_rel in
    select *
    from dict.source_links
    where entry_id = d_id
  loop

    if not exists (
      select 1
      from dict.source_links
      where entry_id = r_id
        and source_id = source_rel.source_id
    ) then
      update dict.source_links
      set entry_id = r_id
      where id = source_rel.id;
    else
      raise notice 'šķirklim % jau ir avots %', r_id, source_rel.source_id;
      delete from dict.source_links
      where id = source_rel.id;
    end if;

  end loop;

  -- leksēmas
  select coalesce(max(order_no) + 1, 1)
  from dict.lexemes
  where entry_id = r_id
  into next_no;

  for lex in
    select *
    from dict.lexemes
    where entry_id = d_id
  loop

    update dict.lexemes
    set entry_id = r_id,
      hidden = true,
      order_no = next_no
    where id = lex.id;

    next_no := next_no + 1;

  end loop;

  -- nozīmes
  select coalesce(max(order_no) + 1, 1)
  from dict.senses
  where entry_id = r_id
  into next_no;

  for sense in
    select *
    from dict.senses
    where entry_id = d_id
  loop

    update dict.senses
    set entry_id = r_id,
      hidden = true,
      order_no = next_no
    where id = sense.id;

    next_no := next_no + 1;

  end loop;
  -- todo: sakārtot sense_tag

  -- piemēri pie entry
  select coalesce(max(order_no) + 1, 1)
  from dict.examples
  where entry_id = r_id
    and sense_id is null
  into next_no;

  for ex in
    select *
    from dict.examples
    where entry_id = d_id
      and sense_id is null
  loop

    update dict.examples
    set entry_id = r_id,
      hidden = true,
      order_no = next_no
    where id = ex.id;

    next_no := next_no + 1;

  end loop;

  -- piemēri pie sense, kam norādīts arī entry
  update dict.examples
  set entry_id = r_id
  where entry_id = d_id
    and sense_id is not null;

  -- beigās izmetam iztukšoto donoru
  delete from dict.entries where id = d_id;

  raise info 'entry % merged into %', d_id, r_id;

  -- ?? vai vajag commit, vai arī tas jau tāpat ir default ??
end
$$;


ALTER PROCEDURE dict.merge_entries(r_id integer, d_id integer) OWNER TO postgres;

--
-- Name: PROCEDURE merge_entries(r_id integer, d_id integer); Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON PROCEDURE dict.merge_entries(r_id integer, d_id integer) IS 'Apvieno 2 šķirkļus, devējšķirkļa saturu pievienojot saņēmējšķirklim';


--
-- Name: merge_entry_jsondata(jsonb, jsonb); Type: FUNCTION; Schema: dict; Owner: postgres
--

CREATE FUNCTION dict.merge_entry_jsondata(j1 jsonb, j2 jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION dict.merge_entry_jsondata(j1 jsonb, j2 jsonb) OWNER TO postgres;

--
-- Name: reset_sequence(text); Type: FUNCTION; Schema: dict; Owner: postgres
--

CREATE FUNCTION dict.reset_sequence(tablename text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
BEGIN
  EXECUTE 'SELECT setval( pg_get_serial_sequence(''' || tablename || ''', ''id''),
  (SELECT COALESCE(MAX(id)+1,1) FROM ' || tablename || '), false)';
END;
$$;


ALTER FUNCTION dict.reset_sequence(tablename text) OWNER TO postgres;

--
-- Name: update_modification_timestamp(); Type: FUNCTION; Schema: dict; Owner: postgres
--

CREATE FUNCTION dict.update_modification_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE
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
$$;


ALTER FUNCTION dict.update_modification_timestamp() OWNER TO postgres;

--
-- Name: upgrade_serial_to_identity(regclass, name); Type: FUNCTION; Schema: dict; Owner: postgres
--

CREATE FUNCTION dict.upgrade_serial_to_identity(tbl regclass, col name) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  colnum smallint;
  seqid oid;
  count int;
BEGIN
  -- find column number
  SELECT attnum INTO colnum FROM pg_attribute WHERE attrelid = tbl AND attname = col;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'column does not exist';
  END IF;

  -- find sequence
  SELECT INTO seqid objid
    FROM pg_depend
    WHERE (refclassid, refobjid, refobjsubid) = ('pg_class'::regclass, tbl, colnum)
      AND classid = 'pg_class'::regclass AND objsubid = 0
      AND deptype = 'a';

  GET DIAGNOSTICS count = ROW_COUNT;
  IF count < 1 THEN
    RAISE EXCEPTION 'no linked sequence found';
  ELSIF count > 1 THEN
    RAISE EXCEPTION 'more than one linked sequence found';
  END IF;

  -- drop the default
  EXECUTE 'ALTER TABLE ' || tbl || ' ALTER COLUMN ' || quote_ident(col) || ' DROP DEFAULT';

  -- change the dependency between column and sequence to internal
  UPDATE pg_depend
    SET deptype = 'i'
    WHERE (classid, objid, objsubid) = ('pg_class'::regclass, seqid, 0)
      AND deptype = 'a';

  -- mark the column as identity column
  UPDATE pg_attribute
    SET attidentity = 'd'
    WHERE attrelid = tbl
      AND attname = col;
END;
$$;


ALTER FUNCTION dict.upgrade_serial_to_identity(tbl regclass, col name) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_rights; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.access_rights (
    id integer NOT NULL,
    user_id integer NOT NULL,
    dictionary_id integer NOT NULL,
    rights jsonb
);


ALTER TABLE dict.access_rights OWNER TO postgres;

--
-- Name: COLUMN access_rights.user_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.access_rights.user_id IS 'lietotājs';


--
-- Name: COLUMN access_rights.dictionary_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.access_rights.dictionary_id IS 'vārdnīca';


--
-- Name: COLUMN access_rights.rights; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.access_rights.rights IS 'tiesību apraksts';


--
-- Name: access_rights_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.access_rights_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.access_rights_id_seq OWNER TO postgres;

--
-- Name: access_rights_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.access_rights_id_seq OWNED BY dict.access_rights.id;


--
-- Name: changes; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.changes (
    id integer NOT NULL,
    operation text,
    entity_type text,
    entity_id integer,
    effective_on timestamp without time zone,
    transaction_id integer,
    db_user text,
    user_id integer,
    data_after jsonb,
    data_before jsonb,
    data_diff jsonb,
    entry_id integer
);


ALTER TABLE dict.changes OWNER TO postgres;

--
-- Name: changes_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.changes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.changes_id_seq OWNER TO postgres;

--
-- Name: changes_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.changes_id_seq OWNED BY dict.changes.id;


--
-- Name: dict_releases; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.dict_releases (
    id integer NOT NULL,
    previous_release_id integer,
    dictionary_id integer,
    entry_schema jsonb,
    sense_schema jsonb,
    lexeme_schema jsonb,
    title text,
    subtitle text,
    release_date date DEFAULT CURRENT_DATE,
    is_editable boolean DEFAULT true,
    info jsonb
);


ALTER TABLE dict.dict_releases OWNER TO postgres;

--
-- Name: TABLE dict_releases; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.dict_releases IS 'vārdnīcas laidieni';


--
-- Name: COLUMN dict_releases.id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dict_releases.id IS 'id column';


--
-- Name: COLUMN dict_releases.previous_release_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dict_releases.previous_release_id IS 'saite uz iepriekšējo laidienu';


--
-- Name: COLUMN dict_releases.dictionary_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dict_releases.dictionary_id IS 'saite uz vārdnīcu';


--
-- Name: COLUMN dict_releases.entry_schema; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dict_releases.entry_schema IS 'shēma šķirklim';


--
-- Name: COLUMN dict_releases.sense_schema; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dict_releases.sense_schema IS 'shēma nozīmei';


--
-- Name: COLUMN dict_releases.lexeme_schema; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dict_releases.lexeme_schema IS 'shēma leksēmai';


--
-- Name: COLUMN dict_releases.title; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dict_releases.title IS 'laidiena virsraksts';


--
-- Name: COLUMN dict_releases.subtitle; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dict_releases.subtitle IS 'laidiena apakšvirsraksts';


--
-- Name: COLUMN dict_releases.release_date; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dict_releases.release_date IS 'laidiena datums';


--
-- Name: dictionaries; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.dictionaries (
    id integer NOT NULL,
    abbr text,
    title text,
    published_release_id integer,
    working_release_id integer
);


ALTER TABLE dict.dictionaries OWNER TO postgres;

--
-- Name: TABLE dictionaries; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.dictionaries IS 'vārdnīcas';


--
-- Name: COLUMN dictionaries.abbr; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dictionaries.abbr IS 'saīsinātais nosaukums';


--
-- Name: COLUMN dictionaries.title; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dictionaries.title IS 'pilnais nosaukums';


--
-- Name: COLUMN dictionaries.published_release_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dictionaries.published_release_id IS 'jaunākais publiskais laidiens';


--
-- Name: COLUMN dictionaries.working_release_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.dictionaries.working_release_id IS 'darba versija';


--
-- Name: dictionaries_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.dictionaries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.dictionaries_id_seq OWNER TO postgres;

--
-- Name: dictionaries_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.dictionaries_id_seq OWNED BY dict.dictionaries.id;


--
-- Name: dictionary_releases_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.dictionary_releases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.dictionary_releases_id_seq OWNER TO postgres;

--
-- Name: dictionary_releases_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.dictionary_releases_id_seq OWNED BY dict.dict_releases.id;


--
-- Name: entity_types; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.entity_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE dict.entity_types OWNER TO postgres;

--
-- Name: entity_types_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.entity_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.entity_types_id_seq OWNER TO postgres;

--
-- Name: entity_types_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.entity_types_id_seq OWNED BY dict.entity_types.id;


--
-- Name: entries; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.entries (
    id integer NOT NULL,
    release_id integer,
    type_id integer NOT NULL,
    homonym_no integer DEFAULT 0 NOT NULL,
    heading text NOT NULL COLLATE dict.latviski,
    data jsonb,
    primary_lexeme_id integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by integer DEFAULT 1,
    notes text,
    hidden boolean DEFAULT false NOT NULL,
    heading_is_primary_lexeme boolean DEFAULT true NOT NULL,
    human_key text GENERATED ALWAYS AS (
CASE
    WHEN (type_id = 4) THEN ('mwe:'::text || (id)::text)
    ELSE ((heading || ':'::text) || (homonym_no)::text)
END) STORED
);


ALTER TABLE dict.entries OWNER TO postgres;

--
-- Name: TABLE entries; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.entries IS 'šķirkļi';


--
-- Name: COLUMN entries.release_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.release_id IS 'vārdnīcas laidiens';


--
-- Name: COLUMN entries.type_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.type_id IS 'šķirkļa tips';


--
-- Name: COLUMN entries.homonym_no; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.homonym_no IS 'homonīma numurs';


--
-- Name: COLUMN entries.heading; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.heading IS 'šķirkļa teksts (primārās leksēmas lemma)';


--
-- Name: COLUMN entries.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.data IS 'JSON dati';


--
-- Name: COLUMN entries.primary_lexeme_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.primary_lexeme_id IS 'šķirkļa galvenā (pirmā) leksēma';


--
-- Name: COLUMN entries.created_at; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.created_at IS 'šķirkļa izveidošanas laiks';


--
-- Name: COLUMN entries.updated_at; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.updated_at IS 'šķirkļa pēdējo izmaiņu laiks';


--
-- Name: COLUMN entries.updated_by; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.updated_by IS 'Kurš veicis pēdējās izmaiņas ierakstā';


--
-- Name: COLUMN entries.notes; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.notes IS 'Autoru piezīmes (publiski nerādāmas)';


--
-- Name: COLUMN entries.hidden; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.hidden IS 'ja true, tad publiskajā skatā šis šķirklis netiek rādīts ';


--
-- Name: COLUMN entries.heading_is_primary_lexeme; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entries.heading_is_primary_lexeme IS 'Ja true, tad heading jāsinhronizē ar primary_lexeme.lemma';


--
-- Name: entries_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.entries_id_seq OWNER TO postgres;

--
-- Name: entries_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.entries_id_seq OWNED BY dict.entries.id;


--
-- Name: entry_notes; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.entry_notes (
    id integer NOT NULL,
    entry_id integer,
    sense_id integer,
    author_id integer,
    note text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE dict.entry_notes OWNER TO postgres;

--
-- Name: TABLE entry_notes; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.entry_notes IS '(nepubliskas) piezīmes par šķirkli (vai nozīmi) - izmaiņu motivācija utml; append-only';


--
-- Name: entry_rel_types; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.entry_rel_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE dict.entry_rel_types OWNER TO postgres;

--
-- Name: TABLE entry_rel_types; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.entry_rel_types IS 'šķirkļu saišu tipi';


--
-- Name: entry_rel_types_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.entry_rel_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.entry_rel_types_id_seq OWNER TO postgres;

--
-- Name: entry_rel_types_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.entry_rel_types_id_seq OWNED BY dict.entry_rel_types.id;


--
-- Name: entry_relations; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.entry_relations (
    id integer NOT NULL,
    entry_1_id integer,
    entry_2_id integer,
    type_id integer,
    data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    updated_by integer DEFAULT 1
);


ALTER TABLE dict.entry_relations OWNER TO postgres;

--
-- Name: TABLE entry_relations; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.entry_relations IS 'šķirkļu saites';


--
-- Name: COLUMN entry_relations.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.entry_relations.data IS 'saites papildinformācija';


--
-- Name: entry_relations_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.entry_relations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.entry_relations_id_seq OWNER TO postgres;

--
-- Name: entry_relations_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.entry_relations_id_seq OWNED BY dict.entry_relations.id;


--
-- Name: entry_types; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.entry_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE dict.entry_types OWNER TO postgres;

--
-- Name: TABLE entry_types; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.entry_types IS 'šķirkļu tipi';


--
-- Name: entry_types_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.entry_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.entry_types_id_seq OWNER TO postgres;

--
-- Name: entry_types_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.entry_types_id_seq OWNED BY dict.entry_types.id;


--
-- Name: examples; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.examples (
    id integer NOT NULL,
    sense_id integer,
    entry_id integer,
    content text NOT NULL COLLATE dict.latviski,
    data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by integer DEFAULT 1,
    order_no integer,
    hidden boolean DEFAULT false NOT NULL
);


ALTER TABLE dict.examples OWNER TO postgres;

--
-- Name: TABLE examples; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.examples IS 'teksta piemēri';


--
-- Name: COLUMN examples.sense_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.examples.sense_id IS 'nozīme, kurai piekārtots šis piemērs; var būt NULL, ja piemērs pagaidām ir piekārtots tikai visam šķirklim';


--
-- Name: COLUMN examples.entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.examples.entry_id IS 'šķirklis, kuram piekārtots piemērs, kamēr tas nav novadīts pie nozīmes';


--
-- Name: COLUMN examples.created_at; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.examples.created_at IS 'piemēra izveidošanas laiks';


--
-- Name: COLUMN examples.updated_at; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.examples.updated_at IS 'piemēra pēdējo izmaiņu laiks';


--
-- Name: COLUMN examples.updated_by; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.examples.updated_by IS 'Kurš veicis pēdējās izmaiņas ierakstā';


--
-- Name: COLUMN examples.order_no; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.examples.order_no IS 'rādīšanas secība; ar laiku var mainīties';


--
-- Name: COLUMN examples.hidden; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.examples.hidden IS 'ja true, tad publiskajā skatā šis piemērs netiek rādīts';


--
-- Name: examples_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.examples_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.examples_id_seq OWNER TO postgres;

--
-- Name: examples_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.examples_id_seq OWNED BY dict.examples.id;


--
-- Name: external_link_types; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.external_link_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE dict.external_link_types OWNER TO postgres;

--
-- Name: TABLE external_link_types; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.external_link_types IS 'ārējo saišu tipi';


--
-- Name: external_link_types_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.external_link_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.external_link_types_id_seq OWNER TO postgres;

--
-- Name: external_link_types_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.external_link_types_id_seq OWNED BY dict.external_link_types.id;


--
-- Name: feedbacks; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.feedbacks (
    id integer NOT NULL,
    entry_id integer NOT NULL,
    text text NOT NULL,
    status smallint DEFAULT 0 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fixed_by integer,
    fixed_at timestamp(6) with time zone
);


ALTER TABLE dict.feedbacks OWNER TO postgres;

--
-- Name: feedbacks_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.feedbacks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.feedbacks_id_seq OWNER TO postgres;

--
-- Name: feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.feedbacks_id_seq OWNED BY dict.feedbacks.id;


--
-- Name: full_entries; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.full_entries (
    id integer NOT NULL,
    entry_id integer NOT NULL,
    human_key text NOT NULL COLLATE dict.latviski,
    data jsonb,
    html text,
    heading text NOT NULL COLLATE dict.latviski,
    homonym_no integer NOT NULL
);


ALTER TABLE dict.full_entries OWNER TO postgres;

--
-- Name: TABLE full_entries; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.full_entries IS 'Pilni, denormalizēti šķirkļi';


--
-- Name: full_entries_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.full_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.full_entries_id_seq OWNER TO postgres;

--
-- Name: full_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.full_entries_id_seq OWNED BY dict.full_entries.id;


--
-- Name: gradsets; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.gradsets (
    id integer NOT NULL,
    synset_id integer,
    data jsonb
);


ALTER TABLE dict.gradsets OWNER TO postgres;

--
-- Name: TABLE gradsets; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.gradsets IS 'gradācijas jēdzienu kopas';


--
-- Name: COLUMN gradsets.synset_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.gradsets.synset_id IS 'kopu raksturojošais jēdziens';


--
-- Name: COLUMN gradsets.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.gradsets.data IS 'JSON dati';


--
-- Name: gradsets_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.gradsets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.gradsets_id_seq OWNER TO postgres;

--
-- Name: gradsets_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.gradsets_id_seq OWNED BY dict.gradsets.id;


--
-- Name: grammar_flag_values; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.grammar_flag_values (
    id integer NOT NULL,
    flag_id integer NOT NULL,
    value text NOT NULL,
    is_deprecated boolean DEFAULT false NOT NULL,
    order_no integer DEFAULT 0
);


ALTER TABLE dict.grammar_flag_values OWNER TO postgres;

--
-- Name: TABLE grammar_flag_values; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.grammar_flag_values IS 'gramatikas karodziņu atļautās vērtības';


--
-- Name: COLUMN grammar_flag_values.flag_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flag_values.flag_id IS 'karodziņš, kuram pieder šī vērtība';


--
-- Name: COLUMN grammar_flag_values.value; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flag_values.value IS 'viena no iespējamām karodziņa vērtībām';


--
-- Name: COLUMN grammar_flag_values.is_deprecated; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flag_values.is_deprecated IS 'ja true, tad neļaut no jauna ievadīt šo vērtību (bet vērtība var būt sastopama legacy datos)';


--
-- Name: COLUMN grammar_flag_values.order_no; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flag_values.order_no IS 'Vērtību secība izvēlnēs';


--
-- Name: grammar_flag_values_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.grammar_flag_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.grammar_flag_values_id_seq OWNER TO postgres;

--
-- Name: grammar_flag_values_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.grammar_flag_values_id_seq OWNED BY dict.grammar_flag_values.id;


--
-- Name: grammar_flags; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.grammar_flags (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    caption text,
    is_deprecated boolean DEFAULT false NOT NULL,
    is_multiple boolean DEFAULT false NOT NULL,
    permitted_values text DEFAULT 'E'::text NOT NULL,
    scope text DEFAULT 'ESL'::text,
    order_no integer
);


ALTER TABLE dict.grammar_flags OWNER TO postgres;

--
-- Name: COLUMN grammar_flags.name; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flags.name IS 'karodziņa formālais nosaukums';


--
-- Name: COLUMN grammar_flags.description; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flags.description IS 'karodziņa apraksts';


--
-- Name: COLUMN grammar_flags.caption; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flags.caption IS 'saskarnē rādāmais nosaukums, ja atšķiras no name';


--
-- Name: COLUMN grammar_flags.is_deprecated; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flags.is_deprecated IS 'ja true, tad neļaut veidot jaunus šī tipa karodziņus';


--
-- Name: COLUMN grammar_flags.is_multiple; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flags.is_multiple IS 'atļaut tikai 1 vērtību (false) vai 1..N (true)';


--
-- Name: COLUMN grammar_flags.permitted_values; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flags.permitted_values IS 'atļaut vērtības no enum (E), patvaļīgas vērtības (F), abu variantu apvienojums (M)';


--
-- Name: COLUMN grammar_flags.scope; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flags.scope IS 'atļautās atrašanās vietas, kombinācija no: E=entry, S=sense, L=lexeme, X=example';


--
-- Name: COLUMN grammar_flags.order_no; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.grammar_flags.order_no IS 'rādīšanas secība';


--
-- Name: grammar_flags_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.grammar_flags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.grammar_flags_id_seq OWNER TO postgres;

--
-- Name: grammar_flags_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.grammar_flags_id_seq OWNED BY dict.grammar_flags.id;


--
-- Name: grammar_restriction_frequencies; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.grammar_restriction_frequencies (
    id integer NOT NULL,
    name text,
    caption text,
    compare_value integer
);


ALTER TABLE dict.grammar_restriction_frequencies OWNER TO postgres;

--
-- Name: TABLE grammar_restriction_frequencies; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.grammar_restriction_frequencies IS 'Iespējamās StructuralRestrictions.Frequency vērtības';


--
-- Name: grammar_restriction_frequencies_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.grammar_restriction_frequencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.grammar_restriction_frequencies_id_seq OWNER TO postgres;

--
-- Name: grammar_restriction_frequencies_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.grammar_restriction_frequencies_id_seq OWNED BY dict.grammar_restriction_frequencies.id;


--
-- Name: grammar_restriction_types; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.grammar_restriction_types (
    id integer NOT NULL,
    name text,
    caption text
);


ALTER TABLE dict.grammar_restriction_types OWNER TO postgres;

--
-- Name: TABLE grammar_restriction_types; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.grammar_restriction_types IS 'Iespējamās vērtības StructuralRestrictions.Restriction laukam';


--
-- Name: grammar_restrictions_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.grammar_restrictions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.grammar_restrictions_id_seq OWNER TO postgres;

--
-- Name: grammar_restrictions_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.grammar_restrictions_id_seq OWNED BY dict.grammar_restriction_types.id;


--
-- Name: lexeme_types; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.lexeme_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE dict.lexeme_types OWNER TO postgres;

--
-- Name: TABLE lexeme_types; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.lexeme_types IS 'leksēmu tipi ("vārds", NE, MWE, ...)';


--
-- Name: lexeme_types_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.lexeme_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.lexeme_types_id_seq OWNER TO postgres;

--
-- Name: lexeme_types_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.lexeme_types_id_seq OWNED BY dict.lexeme_types.id;


--
-- Name: lexemes; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.lexemes (
    id integer NOT NULL,
    entry_id integer,
    type_id integer,
    lemma text COLLATE dict.latviski,
    paradigm_id integer,
    stem1 text,
    stem2 text,
    stem3 text,
    data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by integer DEFAULT 1,
    order_no integer,
    hidden boolean DEFAULT false NOT NULL
);


ALTER TABLE dict.lexemes OWNER TO postgres;

--
-- Name: TABLE lexemes; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.lexemes IS 'leksēmas';


--
-- Name: COLUMN lexemes.entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.lexemes.entry_id IS 'šķirklis';


--
-- Name: COLUMN lexemes.type_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.lexemes.type_id IS 'leksēmas tips ("vārds", NW, MWE, ...)';


--
-- Name: COLUMN lexemes.paradigm_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.lexemes.paradigm_id IS 'paradigma';


--
-- Name: COLUMN lexemes.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.lexemes.data IS 'JSON dati';


--
-- Name: COLUMN lexemes.created_at; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.lexemes.created_at IS 'leksēmas izveidošanas laiks';


--
-- Name: COLUMN lexemes.updated_at; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.lexemes.updated_at IS 'leksēmas pēdējo izmaiņu laiks';


--
-- Name: COLUMN lexemes.updated_by; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.lexemes.updated_by IS 'Kurš veicis pēdējās izmaiņas ierakstā';


--
-- Name: COLUMN lexemes.order_no; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.lexemes.order_no IS 'rādīšanas secība; ar laiku var mainīties';


--
-- Name: COLUMN lexemes.hidden; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.lexemes.hidden IS 'ja true, tad publiskajā skatā šī leksēma netiek rādīta';


--
-- Name: lexemes_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.lexemes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.lexemes_id_seq OWNER TO postgres;

--
-- Name: lexemes_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.lexemes_id_seq OWNED BY dict.lexemes.id;


--
-- Name: sense_entry_relations; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.sense_entry_relations (
    id integer NOT NULL,
    sense_id integer,
    entry_id integer,
    type_id integer,
    data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    updated_by integer DEFAULT 1
);


ALTER TABLE dict.sense_entry_relations OWNER TO postgres;

--
-- Name: TABLE sense_entry_relations; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.sense_entry_relations IS 'nozīmju-šķirkļu saites';


--
-- Name: senses; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.senses (
    id integer NOT NULL,
    entry_id integer NOT NULL,
    parent_sense_id integer,
    gloss text COLLATE dict.latviski,
    order_no integer,
    sense_tag text,
    data jsonb,
    synset_id integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by integer DEFAULT 1,
    hidden boolean DEFAULT false NOT NULL
);


ALTER TABLE dict.senses OWNER TO postgres;

--
-- Name: TABLE senses; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.senses IS 'nozīmes';


--
-- Name: COLUMN senses.entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.senses.entry_id IS 'nozīmes šķirklis';


--
-- Name: COLUMN senses.parent_sense_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.senses.parent_sense_id IS 'apakšnozīmes saite uz virsnozīmi';


--
-- Name: COLUMN senses.gloss; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.senses.gloss IS 'nozīmes skaidrojums';


--
-- Name: COLUMN senses.order_no; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.senses.order_no IS 'rādīšanas secība; ar laiku var mainīties';


--
-- Name: COLUMN senses.sense_tag; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.senses.sense_tag IS 'nemainīga birka atsaucēm uz nozīmi, parasti a, b, c, ... virsnozīmēm, a1, a2, ... nozīmes a apakšnozīmēm';


--
-- Name: COLUMN senses.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.senses.data IS 'JSON dati';


--
-- Name: COLUMN senses.synset_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.senses.synset_id IS 'nozīmes piederība synset-am';


--
-- Name: COLUMN senses.created_at; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.senses.created_at IS 'nozīmes izveidošanas laiks';


--
-- Name: COLUMN senses.updated_at; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.senses.updated_at IS 'nozīmes pēdējo izmaiņu laiks';


--
-- Name: COLUMN senses.updated_by; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.senses.updated_by IS 'Kurš veicis pēdējās izmaiņas ierakstā';


--
-- Name: COLUMN senses.hidden; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.senses.hidden IS 'ja true, tad publiskajā skatā šī nozīme netiek rādīta';


--
-- Name: loop_1; Type: VIEW; Schema: dict; Owner: mikus
--

CREATE VIEW dict.loop_1 AS
 SELECT e.human_key AS hk
   FROM ((dict.sense_entry_relations r
     JOIN dict.senses s ON ((s.id = r.sense_id)))
     JOIN dict.entries e ON ((e.id = r.entry_id)))
  WHERE (e.id = s.entry_id);


ALTER TABLE dict.loop_1 OWNER TO mikus;

--
-- Name: loop_2; Type: VIEW; Schema: dict; Owner: mikus
--

CREATE VIEW dict.loop_2 AS
 SELECT e.human_key AS hk1,
    s.id AS s_id1,
    s.gloss AS gloss1,
    e2.human_key AS hk2,
    s2.id AS s_id2,
    s2.gloss AS gloss2
   FROM (((((dict.sense_entry_relations r
     JOIN dict.senses s ON ((s.id = r.sense_id)))
     JOIN dict.entries e ON ((e.id = r.entry_id)))
     JOIN dict.senses s2 ON ((s2.entry_id = e.id)))
     JOIN dict.sense_entry_relations r2 ON ((r2.sense_id = s2.id)))
     JOIN dict.entries e2 ON ((r2.entry_id = e2.id)))
  WHERE (e2.id = s.entry_id);


ALTER TABLE dict.loop_2 OWNER TO mikus;

--
-- Name: notes_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.notes_id_seq OWNER TO postgres;

--
-- Name: notes_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.notes_id_seq OWNED BY dict.entry_notes.id;


--
-- Name: paradigms; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.paradigms (
    id integer NOT NULL,
    name text,
    data jsonb,
    human_key text,
    legacy_no integer,
    caption text,
    caption_en text
);


ALTER TABLE dict.paradigms OWNER TO postgres;

--
-- Name: TABLE paradigms; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.paradigms IS 'paradigmas';


--
-- Name: COLUMN paradigms.name; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.paradigms.name IS 'nosaukums';


--
-- Name: COLUMN paradigms.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.paradigms.data IS 'JSON dati';


--
-- Name: COLUMN paradigms.human_key; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.paradigms.human_key IS 'paradigmas mūsdienu kods (verb-2)';


--
-- Name: COLUMN paradigms.legacy_no; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.paradigms.legacy_no IS 'paradigmas vecā parauga numurs (16)';


--
-- Name: COLUMN paradigms.caption; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.paradigms.caption IS 'nosaukums rādīšanai saskarnē (lv)';


--
-- Name: COLUMN paradigms.caption_en; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.paradigms.caption_en IS 'nosaukums rādīšanai saskarnē (en)';


--
-- Name: paradigms_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.paradigms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.paradigms_id_seq OWNER TO postgres;

--
-- Name: paradigms_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.paradigms_id_seq OWNED BY dict.paradigms.id;


--
-- Name: search_word_types; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.search_word_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE dict.search_word_types OWNER TO postgres;

--
-- Name: TABLE search_word_types; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.search_word_types IS 'Ierakstu tipi tabulā search_words';


--
-- Name: search_word_types_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.search_word_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.search_word_types_id_seq OWNER TO postgres;

--
-- Name: search_word_types_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.search_word_types_id_seq OWNED BY dict.search_word_types.id;


--
-- Name: search_words; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.search_words (
    id integer NOT NULL,
    word text NOT NULL COLLATE dict.latviski,
    target_id integer NOT NULL,
    entry_id integer,
    target_subtype_id integer,
    word_type_id integer DEFAULT 1 NOT NULL,
    target_type_id integer NOT NULL,
    inflected boolean DEFAULT false NOT NULL,
    lvst_group integer,
    original text
);


ALTER TABLE dict.search_words OWNER TO postgres;

--
-- Name: TABLE search_words; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.search_words IS 'Tabula meklēšanai pa formām/locījumiem';


--
-- Name: COLUMN search_words.word; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.search_words.word IS 'meklējamvārds';


--
-- Name: COLUMN search_words.target_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.search_words.target_id IS 'adresāta id';


--
-- Name: COLUMN search_words.entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.search_words.entry_id IS 'tā šķirkļa id, kurā mīt adresāts (sakrīt ar target_id, ja target_type ir šķirklis)';


--
-- Name: COLUMN search_words.target_subtype_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.search_words.target_subtype_id IS 'adresāta apakštips (no attiecīgās entītes tipiem';


--
-- Name: COLUMN search_words.word_type_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.search_words.word_type_id IS 'meklējamvārda tips';


--
-- Name: COLUMN search_words.target_type_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.search_words.target_type_id IS 'adresāta tips (entry, lexeme, ...)';


--
-- Name: search_words_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.search_words_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.search_words_id_seq OWNER TO postgres;

--
-- Name: search_words_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.search_words_id_seq OWNED BY dict.search_words.id;


--
-- Name: sense_entry_rel_types; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.sense_entry_rel_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE dict.sense_entry_rel_types OWNER TO postgres;

--
-- Name: TABLE sense_entry_rel_types; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.sense_entry_rel_types IS 'nozīmju-šķirkļu saišu tipi';


--
-- Name: sense_rel_types; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.sense_rel_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE dict.sense_rel_types OWNER TO postgres;

--
-- Name: TABLE sense_rel_types; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.sense_rel_types IS 'nozīmju saišu tipi';


--
-- Name: sense_rel_types_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.sense_rel_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.sense_rel_types_id_seq OWNER TO postgres;

--
-- Name: sense_rel_types_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.sense_rel_types_id_seq OWNED BY dict.sense_rel_types.id;


--
-- Name: sense_relations; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.sense_relations (
    id integer NOT NULL,
    sense_1_id integer,
    sense_2_id integer,
    type_id integer,
    data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    updated_by integer DEFAULT 1
);


ALTER TABLE dict.sense_relations OWNER TO postgres;

--
-- Name: TABLE sense_relations; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.sense_relations IS 'nozīmju saites';


--
-- Name: COLUMN sense_relations.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.sense_relations.data IS 'saites papildinformācija';


--
-- Name: sense_relations_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.sense_relations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.sense_relations_id_seq OWNER TO postgres;

--
-- Name: sense_relations_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.sense_relations_id_seq OWNED BY dict.sense_relations.id;


--
-- Name: senses_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.senses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.senses_id_seq OWNER TO postgres;

--
-- Name: senses_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.senses_id_seq OWNED BY dict.senses.id;


--
-- Name: sentry_rel_types_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.sentry_rel_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.sentry_rel_types_id_seq OWNER TO postgres;

--
-- Name: sentry_rel_types_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.sentry_rel_types_id_seq OWNED BY dict.sense_entry_rel_types.id;


--
-- Name: sentry_relations_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.sentry_relations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.sentry_relations_id_seq OWNER TO postgres;

--
-- Name: sentry_relations_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.sentry_relations_id_seq OWNED BY dict.sense_entry_relations.id;


--
-- Name: sketch_engine_errors; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.sketch_engine_errors (
    id integer NOT NULL,
    sentence text,
    instance_found text,
    query text,
    token_num integer NOT NULL,
    corpname text
);


ALTER TABLE dict.sketch_engine_errors OWNER TO postgres;

--
-- Name: sketch_engine_errors_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.sketch_engine_errors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.sketch_engine_errors_id_seq OWNER TO postgres;

--
-- Name: sketch_engine_errors_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.sketch_engine_errors_id_seq OWNED BY dict.sketch_engine_errors.id;


--
-- Name: source_links; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.source_links (
    id integer NOT NULL,
    source_id integer,
    entry_id integer,
    data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    updated_by integer DEFAULT 1
);


ALTER TABLE dict.source_links OWNER TO postgres;

--
-- Name: TABLE source_links; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.source_links IS 'avotu piesaiste šķirklim';


--
-- Name: COLUMN source_links.source_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.source_links.source_id IS 'avots';


--
-- Name: COLUMN source_links.entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.source_links.entry_id IS 'šķirklis';


--
-- Name: COLUMN source_links.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.source_links.data IS 'saites papildinformācija (piemēram, periodiska izdevuma numurs)';


--
-- Name: source_links_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.source_links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.source_links_id_seq OWNER TO postgres;

--
-- Name: source_links_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.source_links_id_seq OWNED BY dict.source_links.id;


--
-- Name: sources; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.sources (
    id integer NOT NULL,
    abbr text,
    title text,
    bib text,
    url text
);


ALTER TABLE dict.sources OWNER TO postgres;

--
-- Name: TABLE sources; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.sources IS 'iespējamie avoti';


--
-- Name: COLUMN sources.abbr; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.sources.abbr IS 'avota saīsinātais apzīmējums';


--
-- Name: COLUMN sources.title; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.sources.title IS 'avota pilnais nosaukums';


--
-- Name: COLUMN sources.bib; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.sources.bib IS 'bibliogrāfiskā atsauce';


--
-- Name: COLUMN sources.url; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.sources.url IS 'avota ārēja resursa URL (ja eksistē)';


--
-- Name: sources_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.sources_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.sources_id_seq OWNER TO postgres;

--
-- Name: sources_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.sources_id_seq OWNED BY dict.sources.id;


--
-- Name: suffixes; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.suffixes (
    id integer NOT NULL,
    data jsonb,
    paradigm_id integer
);


ALTER TABLE dict.suffixes OWNER TO postgres;

--
-- Name: TABLE suffixes; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.suffixes IS 'galotnes';


--
-- Name: COLUMN suffixes.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.suffixes.data IS 'pazīmes';


--
-- Name: suffixes_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.suffixes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.suffixes_id_seq OWNER TO postgres;

--
-- Name: suffixes_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.suffixes_id_seq OWNED BY dict.suffixes.id;


--
-- Name: swt; Type: VIEW; Schema: dict; Owner: mikus
--

CREATE VIEW dict.swt AS
 SELECT count(*) AS count,
    search_words.target_type_id,
    search_words.target_subtype_id,
    search_words.word_type_id,
    search_words.inflected
   FROM dict.search_words
  GROUP BY search_words.target_type_id, search_words.target_subtype_id, search_words.word_type_id, search_words.inflected
  ORDER BY search_words.target_type_id, search_words.target_subtype_id, search_words.word_type_id, search_words.inflected;


ALTER TABLE dict.swt OWNER TO mikus;

--
-- Name: synset_external_links; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.synset_external_links (
    id integer NOT NULL,
    link_type_id integer,
    synset_id integer,
    url text,
    data jsonb
);


ALTER TABLE dict.synset_external_links OWNER TO postgres;

--
-- Name: TABLE synset_external_links; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.synset_external_links IS 'synset-u ārējās saites';


--
-- Name: COLUMN synset_external_links.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.synset_external_links.data IS 'saites papildinformācija';


--
-- Name: synset_external_links_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.synset_external_links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.synset_external_links_id_seq OWNER TO postgres;

--
-- Name: synset_external_links_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.synset_external_links_id_seq OWNED BY dict.synset_external_links.id;


--
-- Name: synset_rel_types; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.synset_rel_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    name_inverse text,
    description_inverse text,
    is_symmetric boolean DEFAULT false NOT NULL,
    relation_name text
);


ALTER TABLE dict.synset_rel_types OWNER TO postgres;

--
-- Name: TABLE synset_rel_types; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.synset_rel_types IS 'synset-u saišu tipi';


--
-- Name: COLUMN synset_rel_types.name; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.synset_rel_types.name IS 'saites tehniskais nosaukums (tiešajā virzienā)';


--
-- Name: COLUMN synset_rel_types.description; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.synset_rel_types.description IS 'saites apraksts (tiešajā virzienā)';


--
-- Name: COLUMN synset_rel_types.name_inverse; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.synset_rel_types.name_inverse IS 'saites tehniskais nosaukums (pretējā virzienā)';


--
-- Name: COLUMN synset_rel_types.description_inverse; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.synset_rel_types.description_inverse IS 'saites apraksts (pretējā virzienā)';


--
-- Name: COLUMN synset_rel_types.is_symmetric; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.synset_rel_types.is_symmetric IS 'vai salte ir simetriska';


--
-- Name: COLUMN synset_rel_types.relation_name; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.synset_rel_types.relation_name IS 'Saites vispārīgais nosaukums (kopīgs abiem virzieniem)';


--
-- Name: synset_rel_types_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.synset_rel_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.synset_rel_types_id_seq OWNER TO postgres;

--
-- Name: synset_rel_types_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.synset_rel_types_id_seq OWNED BY dict.synset_rel_types.id;


--
-- Name: synset_relations; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.synset_relations (
    id integer NOT NULL,
    synset_1_id integer,
    synset_2_id integer,
    type_id integer,
    data jsonb
);


ALTER TABLE dict.synset_relations OWNER TO postgres;

--
-- Name: TABLE synset_relations; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.synset_relations IS 'synset-u saites';


--
-- Name: COLUMN synset_relations.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.synset_relations.data IS 'saites papildinformācija';


--
-- Name: synset_relations_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.synset_relations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.synset_relations_id_seq OWNER TO postgres;

--
-- Name: synset_relations_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.synset_relations_id_seq OWNED BY dict.synset_relations.id;


--
-- Name: synsets; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.synsets (
    id integer NOT NULL,
    release_id integer,
    data jsonb,
    gradset_id integer
);


ALTER TABLE dict.synsets OWNER TO postgres;

--
-- Name: TABLE synsets; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.synsets IS 'synset-i';


--
-- Name: COLUMN synsets.release_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.synsets.release_id IS 'vārdnīcas laidiens';


--
-- Name: COLUMN synsets.data; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.synsets.data IS 'JSON dati';


--
-- Name: COLUMN synsets.gradset_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON COLUMN dict.synsets.gradset_id IS 'gradācijas grupa, kurai pieder sinonīmu kopa';


--
-- Name: synsets_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.synsets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.synsets_id_seq OWNER TO postgres;

--
-- Name: synsets_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.synsets_id_seq OWNED BY dict.synsets.id;


--
-- Name: users; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.users (
    id integer NOT NULL,
    login text NOT NULL,
    full_name text COLLATE dict.latviski,
    password text,
    organization text COLLATE dict.latviski,
    data jsonb
);


ALTER TABLE dict.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.users_id_seq OWNED BY dict.users.id;


--
-- Name: v1; Type: VIEW; Schema: dict; Owner: mikus
--

CREATE VIEW dict.v1 AS
 SELECT changes.entity_type,
    changes.operation,
    count(*) AS count
   FROM dict.changes
  GROUP BY changes.entity_type, changes.operation
  ORDER BY changes.entity_type, changes.operation;


ALTER TABLE dict.v1 OWNER TO mikus;

--
-- Name: v2; Type: VIEW; Schema: dict; Owner: mikus
--

CREATE VIEW dict.v2 AS
 SELECT l.lemma
   FROM ((dict.changes c
     JOIN dict.entries e ON ((c.entity_id = e.id)))
     JOIN dict.lexemes l ON ((e.primary_lexeme_id = l.id)))
  WHERE ((c.operation = 'INSERT'::text) AND (c.entity_type = 'entries'::text))
  ORDER BY l.lemma;


ALTER TABLE dict.v2 OWNER TO mikus;

--
-- Name: v3; Type: VIEW; Schema: dict; Owner: mikus
--

CREATE VIEW dict.v3 AS
 SELECT c.db_user,
    u.login,
    count(*) AS count
   FROM (dict.changes c
     JOIN dict.users u ON ((u.id = c.user_id)))
  GROUP BY c.db_user, u.login;


ALTER TABLE dict.v3 OWNER TO mikus;

--
-- Name: v_deleted_entries; Type: VIEW; Schema: dict; Owner: mikus
--

CREATE VIEW dict.v_deleted_entries AS
 SELECT (changes.data_before -> 'human_key'::text)
   FROM dict.changes
  WHERE ((changes.entity_type = 'entries'::text) AND (changes.operation = 'DELETE'::text));


ALTER TABLE dict.v_deleted_entries OWNER TO mikus;

--
-- Name: v_last_updates; Type: VIEW; Schema: dict; Owner: mikus
--

CREATE VIEW dict.v_last_updates AS
 SELECT entries.updated_at,
    entries.updated_by,
    entries.human_key AS row_new_value,
    'entries'::text AS table_name,
    entries.id AS row_id
   FROM dict.entries
UNION
 SELECT lexemes.updated_at,
    lexemes.updated_by,
    lexemes.lemma AS row_new_value,
    'lexemes'::text AS table_name,
    lexemes.id AS row_id
   FROM dict.lexemes
UNION
 SELECT senses.updated_at,
    senses.updated_by,
    senses.gloss AS row_new_value,
    'senses'::text AS table_name,
    senses.id AS row_id
   FROM dict.senses
UNION
 SELECT examples.updated_at,
    examples.updated_by,
    examples.content AS row_new_value,
    'examples'::text AS table_name,
    examples.id AS row_id
   FROM dict.examples
  ORDER BY 1 DESC;


ALTER TABLE dict.v_last_updates OWNER TO mikus;

--
-- Name: wordnet_entries; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.wordnet_entries (
    id integer NOT NULL,
    no integer,
    entry text,
    senses_done boolean DEFAULT false,
    examples_done boolean DEFAULT false,
    inner_links_done boolean DEFAULT false,
    outer_links_done boolean DEFAULT false,
    assignee text,
    comments text,
    in_top boolean DEFAULT true,
    visible_examples_done boolean DEFAULT false
);


ALTER TABLE dict.wordnet_entries OWNER TO postgres;

--
-- Name: wordnet_entries_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.wordnet_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.wordnet_entries_id_seq OWNER TO postgres;

--
-- Name: wordnet_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.wordnet_entries_id_seq OWNED BY dict.wordnet_entries.id;


--
-- Name: access_rights id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.access_rights ALTER COLUMN id SET DEFAULT nextval('dict.access_rights_id_seq'::regclass);


--
-- Name: changes id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.changes ALTER COLUMN id SET DEFAULT nextval('dict.changes_id_seq'::regclass);


--
-- Name: dict_releases id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.dict_releases ALTER COLUMN id SET DEFAULT nextval('dict.dictionary_releases_id_seq'::regclass);


--
-- Name: dictionaries id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.dictionaries ALTER COLUMN id SET DEFAULT nextval('dict.dictionaries_id_seq'::regclass);


--
-- Name: entity_types id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entity_types ALTER COLUMN id SET DEFAULT nextval('dict.entity_types_id_seq'::regclass);


--
-- Name: entries id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entries ALTER COLUMN id SET DEFAULT nextval('dict.entries_id_seq'::regclass);


--
-- Name: entry_notes id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_notes ALTER COLUMN id SET DEFAULT nextval('dict.notes_id_seq'::regclass);


--
-- Name: entry_rel_types id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_rel_types ALTER COLUMN id SET DEFAULT nextval('dict.entry_rel_types_id_seq'::regclass);


--
-- Name: entry_relations id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_relations ALTER COLUMN id SET DEFAULT nextval('dict.entry_relations_id_seq'::regclass);


--
-- Name: entry_types id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_types ALTER COLUMN id SET DEFAULT nextval('dict.entry_types_id_seq'::regclass);


--
-- Name: examples id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.examples ALTER COLUMN id SET DEFAULT nextval('dict.examples_id_seq'::regclass);


--
-- Name: external_link_types id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.external_link_types ALTER COLUMN id SET DEFAULT nextval('dict.external_link_types_id_seq'::regclass);


--
-- Name: feedbacks id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.feedbacks ALTER COLUMN id SET DEFAULT nextval('dict.feedbacks_id_seq'::regclass);


--
-- Name: full_entries id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.full_entries ALTER COLUMN id SET DEFAULT nextval('dict.full_entries_id_seq'::regclass);


--
-- Name: gradsets id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.gradsets ALTER COLUMN id SET DEFAULT nextval('dict.gradsets_id_seq'::regclass);


--
-- Name: grammar_flag_values id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.grammar_flag_values ALTER COLUMN id SET DEFAULT nextval('dict.grammar_flag_values_id_seq'::regclass);


--
-- Name: grammar_flags id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.grammar_flags ALTER COLUMN id SET DEFAULT nextval('dict.grammar_flags_id_seq'::regclass);


--
-- Name: grammar_restriction_frequencies id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.grammar_restriction_frequencies ALTER COLUMN id SET DEFAULT nextval('dict.grammar_restriction_frequencies_id_seq'::regclass);


--
-- Name: grammar_restriction_types id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.grammar_restriction_types ALTER COLUMN id SET DEFAULT nextval('dict.grammar_restrictions_id_seq'::regclass);


--
-- Name: lexeme_types id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.lexeme_types ALTER COLUMN id SET DEFAULT nextval('dict.lexeme_types_id_seq'::regclass);


--
-- Name: lexemes id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.lexemes ALTER COLUMN id SET DEFAULT nextval('dict.lexemes_id_seq'::regclass);


--
-- Name: paradigms id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.paradigms ALTER COLUMN id SET DEFAULT nextval('dict.paradigms_id_seq'::regclass);


--
-- Name: search_word_types id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.search_word_types ALTER COLUMN id SET DEFAULT nextval('dict.search_word_types_id_seq'::regclass);


--
-- Name: search_words id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.search_words ALTER COLUMN id SET DEFAULT nextval('dict.search_words_id_seq'::regclass);


--
-- Name: sense_entry_rel_types id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_entry_rel_types ALTER COLUMN id SET DEFAULT nextval('dict.sentry_rel_types_id_seq'::regclass);


--
-- Name: sense_entry_relations id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_entry_relations ALTER COLUMN id SET DEFAULT nextval('dict.sentry_relations_id_seq'::regclass);


--
-- Name: sense_rel_types id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_rel_types ALTER COLUMN id SET DEFAULT nextval('dict.sense_rel_types_id_seq'::regclass);


--
-- Name: sense_relations id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_relations ALTER COLUMN id SET DEFAULT nextval('dict.sense_relations_id_seq'::regclass);


--
-- Name: senses id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.senses ALTER COLUMN id SET DEFAULT nextval('dict.senses_id_seq'::regclass);


--
-- Name: sketch_engine_errors id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sketch_engine_errors ALTER COLUMN id SET DEFAULT nextval('dict.sketch_engine_errors_id_seq'::regclass);


--
-- Name: source_links id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.source_links ALTER COLUMN id SET DEFAULT nextval('dict.source_links_id_seq'::regclass);


--
-- Name: sources id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sources ALTER COLUMN id SET DEFAULT nextval('dict.sources_id_seq'::regclass);


--
-- Name: suffixes id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.suffixes ALTER COLUMN id SET DEFAULT nextval('dict.suffixes_id_seq'::regclass);


--
-- Name: synset_external_links id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synset_external_links ALTER COLUMN id SET DEFAULT nextval('dict.synset_external_links_id_seq'::regclass);


--
-- Name: synset_rel_types id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synset_rel_types ALTER COLUMN id SET DEFAULT nextval('dict.synset_rel_types_id_seq'::regclass);


--
-- Name: synset_relations id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synset_relations ALTER COLUMN id SET DEFAULT nextval('dict.synset_relations_id_seq'::regclass);


--
-- Name: synsets id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synsets ALTER COLUMN id SET DEFAULT nextval('dict.synsets_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.users ALTER COLUMN id SET DEFAULT nextval('dict.users_id_seq'::regclass);


--
-- Name: wordnet_entries id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.wordnet_entries ALTER COLUMN id SET DEFAULT nextval('dict.wordnet_entries_id_seq'::regclass);


--
-- Name: access_rights access_rights_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.access_rights
    ADD CONSTRAINT access_rights_pk PRIMARY KEY (id);


--
-- Name: changes changes_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.changes
    ADD CONSTRAINT changes_pkey PRIMARY KEY (id);


--
-- Name: dictionaries dictionaries_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.dictionaries
    ADD CONSTRAINT dictionaries_pk PRIMARY KEY (id);


--
-- Name: entity_types entity_types_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entity_types
    ADD CONSTRAINT entity_types_pkey PRIMARY KEY (id);


--
-- Name: entries entries_heading_homonym_no_key; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entries
    ADD CONSTRAINT entries_heading_homonym_no_key UNIQUE (heading, homonym_no);


--
-- Name: entries entries_human_key; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entries
    ADD CONSTRAINT entries_human_key UNIQUE (human_key);


--
-- Name: entries entries_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entries
    ADD CONSTRAINT entries_pk PRIMARY KEY (id);


--
-- Name: CONSTRAINT entries_pk ON entries; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON CONSTRAINT entries_pk ON dict.entries IS 'primary key';


--
-- Name: entry_rel_types entry_rel_types_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_rel_types
    ADD CONSTRAINT entry_rel_types_pk PRIMARY KEY (id);


--
-- Name: entry_relations entry_relations_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_relations
    ADD CONSTRAINT entry_relations_pk PRIMARY KEY (id);


--
-- Name: entry_types entry_types_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_types
    ADD CONSTRAINT entry_types_pkey PRIMARY KEY (id);


--
-- Name: examples examples_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.examples
    ADD CONSTRAINT examples_pkey PRIMARY KEY (id);


--
-- Name: external_link_types external_link_types_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.external_link_types
    ADD CONSTRAINT external_link_types_pk PRIMARY KEY (id);


--
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- Name: full_entries full_entries_heading_homonym_no_key; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.full_entries
    ADD CONSTRAINT full_entries_heading_homonym_no_key UNIQUE (heading, homonym_no);


--
-- Name: full_entries full_entries_human_key; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.full_entries
    ADD CONSTRAINT full_entries_human_key UNIQUE (human_key);


--
-- Name: full_entries full_entries_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.full_entries
    ADD CONSTRAINT full_entries_pk PRIMARY KEY (id);


--
-- Name: gradsets gradsets_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.gradsets
    ADD CONSTRAINT gradsets_pkey PRIMARY KEY (id);


--
-- Name: grammar_flag_values grammar_flag_values_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.grammar_flag_values
    ADD CONSTRAINT grammar_flag_values_pkey PRIMARY KEY (id);


--
-- Name: grammar_flags grammar_flags_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.grammar_flags
    ADD CONSTRAINT grammar_flags_pkey PRIMARY KEY (id);


--
-- Name: grammar_restriction_frequencies grammar_restriction_frequencies_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.grammar_restriction_frequencies
    ADD CONSTRAINT grammar_restriction_frequencies_pkey PRIMARY KEY (id);


--
-- Name: grammar_restriction_types grammar_restrictions_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.grammar_restriction_types
    ADD CONSTRAINT grammar_restrictions_pkey PRIMARY KEY (id);


--
-- Name: lexeme_types lexeme_types_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.lexeme_types
    ADD CONSTRAINT lexeme_types_pk PRIMARY KEY (id);


--
-- Name: lexemes lexemes_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.lexemes
    ADD CONSTRAINT lexemes_pk PRIMARY KEY (id);


--
-- Name: entry_notes notes_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: paradigms paradigms_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.paradigms
    ADD CONSTRAINT paradigms_pk PRIMARY KEY (id);


--
-- Name: dict_releases releases_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.dict_releases
    ADD CONSTRAINT releases_pk PRIMARY KEY (id);


--
-- Name: CONSTRAINT releases_pk ON dict_releases; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON CONSTRAINT releases_pk ON dict.dict_releases IS 'primary key';


--
-- Name: search_word_types search_word_types_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.search_word_types
    ADD CONSTRAINT search_word_types_pkey PRIMARY KEY (id);


--
-- Name: search_words search_words_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.search_words
    ADD CONSTRAINT search_words_pkey PRIMARY KEY (id);


--
-- Name: sense_rel_types sense_rel_types_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_rel_types
    ADD CONSTRAINT sense_rel_types_pk PRIMARY KEY (id);


--
-- Name: sense_relations sense_relations_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_relations
    ADD CONSTRAINT sense_relations_pk PRIMARY KEY (id);


--
-- Name: senses senses_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.senses
    ADD CONSTRAINT senses_pk PRIMARY KEY (id);


--
-- Name: sense_entry_rel_types sentry_rel_types_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_entry_rel_types
    ADD CONSTRAINT sentry_rel_types_pk PRIMARY KEY (id);


--
-- Name: sense_entry_relations sentry_relations_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_entry_relations
    ADD CONSTRAINT sentry_relations_pk PRIMARY KEY (id);


--
-- Name: sketch_engine_errors sketch_engine_errors_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sketch_engine_errors
    ADD CONSTRAINT sketch_engine_errors_pkey PRIMARY KEY (id);


--
-- Name: source_links source_links_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.source_links
    ADD CONSTRAINT source_links_pk PRIMARY KEY (id);


--
-- Name: sources sources_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sources
    ADD CONSTRAINT sources_pk PRIMARY KEY (id);


--
-- Name: suffixes suffixes_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.suffixes
    ADD CONSTRAINT suffixes_pk PRIMARY KEY (id);


--
-- Name: synset_external_links synset_external_links_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synset_external_links
    ADD CONSTRAINT synset_external_links_pk PRIMARY KEY (id);


--
-- Name: synset_rel_types synset_rel_types_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synset_rel_types
    ADD CONSTRAINT synset_rel_types_pk PRIMARY KEY (id);


--
-- Name: synset_relations synset_relations_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synset_relations
    ADD CONSTRAINT synset_relations_pk PRIMARY KEY (id);


--
-- Name: synsets synsets_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synsets
    ADD CONSTRAINT synsets_pk PRIMARY KEY (id);


--
-- Name: users users_login_unique; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.users
    ADD CONSTRAINT users_login_unique UNIQUE (login);


--
-- Name: users users_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.users
    ADD CONSTRAINT users_pk PRIMARY KEY (id);


--
-- Name: wordnet_entries wordnet_entries_pkey; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.wordnet_entries
    ADD CONSTRAINT wordnet_entries_pkey PRIMARY KEY (id);


--
-- Name: fki_feedbacks_entries_fk; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX fki_feedbacks_entries_fk ON dict.feedbacks USING btree (entry_id);


--
-- Name: fki_search_words_target_type_fk; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX fki_search_words_target_type_fk ON dict.search_words USING btree (target_type_id);


--
-- Name: fki_search_words_word_type_fk; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX fki_search_words_word_type_fk ON dict.search_words USING btree (word_type_id);


--
-- Name: idx_changes_effective_on; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_changes_effective_on ON dict.changes USING btree (effective_on);


--
-- Name: idx_changes_entity; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_changes_entity ON dict.changes USING btree (entity_type, entity_id);


--
-- Name: idx_changes_entry_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_changes_entry_id ON dict.changes USING btree (entry_id);


--
-- Name: idx_entries_data; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_entries_data ON dict.entries USING gin (data);


--
-- Name: idx_entries_heading; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_entries_heading ON dict.entries USING btree (heading text_pattern_ops);


--
-- Name: INDEX idx_entries_heading; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_entries_heading IS 'indekss pēc heading';


--
-- Name: idx_entries_human_key; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE UNIQUE INDEX idx_entries_human_key ON dict.entries USING btree (human_key COLLATE dict.latviski text_pattern_ops);


--
-- Name: idx_entries_release_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_entries_release_id ON dict.entries USING btree (release_id);


--
-- Name: INDEX idx_entries_release_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_entries_release_id IS 'Indekss pēc release_id';


--
-- Name: idx_entry_relations_entry_1_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_entry_relations_entry_1_id ON dict.entry_relations USING btree (entry_1_id);


--
-- Name: INDEX idx_entry_relations_entry_1_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_entry_relations_entry_1_id IS 'Indekss pēc entry_1_id';


--
-- Name: idx_entry_relations_entry_2_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_entry_relations_entry_2_id ON dict.entry_relations USING btree (entry_2_id);


--
-- Name: INDEX idx_entry_relations_entry_2_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_entry_relations_entry_2_id IS 'Indekss pēc entry_2_id';


--
-- Name: idx_examples_content; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_examples_content ON dict.examples USING btree (content text_pattern_ops);


--
-- Name: INDEX idx_examples_content; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_examples_content IS 'Indekss pēc content';


--
-- Name: idx_examples_data; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_examples_data ON dict.examples USING gin (data);


--
-- Name: idx_examples_entry_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_examples_entry_id ON dict.examples USING btree (entry_id);


--
-- Name: INDEX idx_examples_entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_examples_entry_id IS 'Indekss pēc entry_id';


--
-- Name: idx_examples_sense_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_examples_sense_id ON dict.examples USING btree (sense_id);


--
-- Name: INDEX idx_examples_sense_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_examples_sense_id IS 'indekss pēc sense_id';


--
-- Name: idx_full_entries_entry_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_full_entries_entry_id ON dict.full_entries USING btree (entry_id);


--
-- Name: INDEX idx_full_entries_entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_full_entries_entry_id IS 'Indekss pēc entry_id';


--
-- Name: idx_full_entries_heading; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_full_entries_heading ON dict.full_entries USING btree (heading text_pattern_ops);


--
-- Name: idx_full_entries_human_key; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_full_entries_human_key ON dict.full_entries USING btree (human_key text_pattern_ops);


--
-- Name: INDEX idx_full_entries_human_key; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_full_entries_human_key IS 'Indekss pēc human_key';


--
-- Name: idx_lexemes_data; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_lexemes_data ON dict.lexemes USING gin (data);


--
-- Name: idx_lexemes_entry_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_lexemes_entry_id ON dict.lexemes USING btree (entry_id);


--
-- Name: INDEX idx_lexemes_entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_lexemes_entry_id IS 'Indekss pēc entry_id';


--
-- Name: idx_lexemes_lemma; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_lexemes_lemma ON dict.lexemes USING btree (lemma text_pattern_ops);


--
-- Name: idx_lexemes_lemma_entry_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_lexemes_lemma_entry_id ON dict.lexemes USING btree (lemma, entry_id);


--
-- Name: idx_search_words_word; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_search_words_word ON dict.search_words USING btree (word text_pattern_ops);


--
-- Name: idx_search_words_word_entry_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_search_words_word_entry_id ON dict.search_words USING btree (word, entry_id);


--
-- Name: idx_search_words_word_word_type_entry_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_search_words_word_word_type_entry_id ON dict.search_words USING btree (word, word_type_id, entry_id);


--
-- Name: idx_sense_entry_relations_entry_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_sense_entry_relations_entry_id ON dict.sense_entry_relations USING btree (entry_id);


--
-- Name: INDEX idx_sense_entry_relations_entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_sense_entry_relations_entry_id IS 'Indekss pēc entry_id';


--
-- Name: idx_sense_entry_relations_sense_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_sense_entry_relations_sense_id ON dict.sense_entry_relations USING btree (sense_id);


--
-- Name: INDEX idx_sense_entry_relations_sense_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_sense_entry_relations_sense_id IS 'Indekss pēc sense_id';


--
-- Name: idx_sense_relations_sense_1_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_sense_relations_sense_1_id ON dict.sense_relations USING btree (sense_1_id);


--
-- Name: INDEX idx_sense_relations_sense_1_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_sense_relations_sense_1_id IS 'Indekss pēc sense_1_id';


--
-- Name: idx_sense_relations_sense_2_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_sense_relations_sense_2_id ON dict.sense_relations USING btree (sense_2_id);


--
-- Name: INDEX idx_sense_relations_sense_2_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_sense_relations_sense_2_id IS 'Indekss pēc sense_2_id';


--
-- Name: idx_senses_data; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_senses_data ON dict.senses USING gin (data);


--
-- Name: idx_senses_entry_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_senses_entry_id ON dict.senses USING btree (entry_id);


--
-- Name: INDEX idx_senses_entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_senses_entry_id IS 'indekss pēc entry_id';


--
-- Name: idx_senses_parent_sense_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_senses_parent_sense_id ON dict.senses USING btree (parent_sense_id);


--
-- Name: INDEX idx_senses_parent_sense_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_senses_parent_sense_id IS 'Indekss pēc parent_sense_id';


--
-- Name: idx_senses_synset_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_senses_synset_id ON dict.senses USING btree (synset_id);


--
-- Name: INDEX idx_senses_synset_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_senses_synset_id IS 'Indekss pēc synset_id';


--
-- Name: idx_source_links_entry_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_source_links_entry_id ON dict.source_links USING btree (entry_id);


--
-- Name: INDEX idx_source_links_entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_source_links_entry_id IS 'Indekss pēc entry_id';


--
-- Name: idx_source_links_source_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_source_links_source_id ON dict.source_links USING btree (source_id);


--
-- Name: INDEX idx_source_links_source_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_source_links_source_id IS 'Indekss pēc source_id';


--
-- Name: idx_synset_relations_synset_1_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_synset_relations_synset_1_id ON dict.synset_relations USING btree (synset_1_id);


--
-- Name: INDEX idx_synset_relations_synset_1_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_synset_relations_synset_1_id IS 'Indekss pēc synset_1_id';


--
-- Name: idx_synset_relations_synset_2_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_synset_relations_synset_2_id ON dict.synset_relations USING btree (synset_2_id);


--
-- Name: INDEX idx_synset_relations_synset_2_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_synset_relations_synset_2_id IS 'Indekss pēc synset_2_id';


--
-- Name: entries log_entries; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER log_entries AFTER INSERT OR DELETE OR UPDATE ON dict.entries FOR EACH ROW EXECUTE FUNCTION dict.log_changes();


--
-- Name: entry_relations log_entry_relations; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER log_entry_relations AFTER INSERT OR DELETE OR UPDATE ON dict.entry_relations FOR EACH ROW EXECUTE FUNCTION dict.log_changes();


--
-- Name: examples log_examples; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER log_examples AFTER INSERT OR DELETE OR UPDATE ON dict.examples FOR EACH ROW EXECUTE FUNCTION dict.log_changes();


--
-- Name: lexemes log_lexemes; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER log_lexemes AFTER INSERT OR DELETE OR UPDATE ON dict.lexemes FOR EACH ROW EXECUTE FUNCTION dict.log_changes();


--
-- Name: sense_entry_relations log_sense_entry_relations; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER log_sense_entry_relations AFTER INSERT OR DELETE OR UPDATE ON dict.sense_entry_relations FOR EACH ROW EXECUTE FUNCTION dict.log_changes();


--
-- Name: sense_relations log_sense_relations; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER log_sense_relations AFTER INSERT OR DELETE OR UPDATE ON dict.sense_relations FOR EACH ROW EXECUTE FUNCTION dict.log_changes();


--
-- Name: senses log_senses; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER log_senses AFTER INSERT OR DELETE OR UPDATE ON dict.senses FOR EACH ROW EXECUTE FUNCTION dict.log_changes();


--
-- Name: source_links log_source_links; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER log_source_links AFTER INSERT OR DELETE OR UPDATE ON dict.source_links FOR EACH ROW EXECUTE FUNCTION dict.log_changes();


--
-- Name: entries update_entries_changetimestamp; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER update_entries_changetimestamp BEFORE UPDATE ON dict.entries FOR EACH ROW EXECUTE FUNCTION dict.update_modification_timestamp();


--
-- Name: examples update_examples_changetimestamp; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER update_examples_changetimestamp BEFORE UPDATE ON dict.examples FOR EACH ROW EXECUTE FUNCTION dict.update_modification_timestamp();


--
-- Name: lexemes update_lexemes_changetimestamp; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER update_lexemes_changetimestamp BEFORE UPDATE ON dict.lexemes FOR EACH ROW EXECUTE FUNCTION dict.update_modification_timestamp();


--
-- Name: sense_entry_relations update_se_en_rel_changetimestamp; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER update_se_en_rel_changetimestamp BEFORE UPDATE ON dict.sense_entry_relations FOR EACH ROW EXECUTE FUNCTION dict.update_modification_timestamp();


--
-- Name: sense_relations update_se_rel_changetimestamp; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER update_se_rel_changetimestamp BEFORE UPDATE ON dict.sense_relations FOR EACH ROW EXECUTE FUNCTION dict.update_modification_timestamp();


--
-- Name: senses update_senses_changetimestamp; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER update_senses_changetimestamp BEFORE UPDATE ON dict.senses FOR EACH ROW EXECUTE FUNCTION dict.update_modification_timestamp();


--
-- Name: source_links update_source_links_changetimestamp; Type: TRIGGER; Schema: dict; Owner: postgres
--

CREATE TRIGGER update_source_links_changetimestamp BEFORE UPDATE ON dict.source_links FOR EACH ROW EXECUTE FUNCTION dict.update_modification_timestamp();


--
-- Name: dictionaries dictionary_published_release_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.dictionaries
    ADD CONSTRAINT dictionary_published_release_fk FOREIGN KEY (published_release_id) REFERENCES dict.dict_releases(id);


--
-- Name: dictionaries dictionary_working_release_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.dictionaries
    ADD CONSTRAINT dictionary_working_release_fk FOREIGN KEY (working_release_id) REFERENCES dict.dict_releases(id);


--
-- Name: entries entries_entry_types_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entries
    ADD CONSTRAINT entries_entry_types_fk FOREIGN KEY (type_id) REFERENCES dict.entry_types(id);


--
-- Name: entries entries_primary_lexeme_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entries
    ADD CONSTRAINT entries_primary_lexeme_fk FOREIGN KEY (primary_lexeme_id) REFERENCES dict.lexemes(id);


--
-- Name: entries entries_releases_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entries
    ADD CONSTRAINT entries_releases_fk FOREIGN KEY (release_id) REFERENCES dict.dict_releases(id) ON DELETE CASCADE;


--
-- Name: entry_relations entry_relations_entry_1_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_relations
    ADD CONSTRAINT entry_relations_entry_1_fk FOREIGN KEY (entry_1_id) REFERENCES dict.entries(id) ON DELETE CASCADE;


--
-- Name: entry_relations entry_relations_entry_2_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_relations
    ADD CONSTRAINT entry_relations_entry_2_fk FOREIGN KEY (entry_2_id) REFERENCES dict.entries(id) ON DELETE CASCADE;


--
-- Name: entry_relations entry_relations_type_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_relations
    ADD CONSTRAINT entry_relations_type_fk FOREIGN KEY (type_id) REFERENCES dict.entry_rel_types(id);


--
-- Name: examples example_entry_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.examples
    ADD CONSTRAINT example_entry_fk FOREIGN KEY (entry_id) REFERENCES dict.entries(id) ON DELETE CASCADE;


--
-- Name: examples example_sense_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.examples
    ADD CONSTRAINT example_sense_fk FOREIGN KEY (sense_id) REFERENCES dict.senses(id) ON DELETE CASCADE;


--
-- Name: feedbacks feedbacks_entries_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.feedbacks
    ADD CONSTRAINT feedbacks_entries_fk FOREIGN KEY (entry_id) REFERENCES dict.entries(id) ON DELETE CASCADE;


--
-- Name: grammar_flag_values flag_value_flag_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.grammar_flag_values
    ADD CONSTRAINT flag_value_flag_fk FOREIGN KEY (flag_id) REFERENCES dict.grammar_flags(id) ON DELETE CASCADE;


--
-- Name: full_entries full_entries_entry_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.full_entries
    ADD CONSTRAINT full_entries_entry_fk FOREIGN KEY (entry_id) REFERENCES dict.entries(id) ON DELETE CASCADE;


--
-- Name: lexemes lexemes_entries_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.lexemes
    ADD CONSTRAINT lexemes_entries_fk FOREIGN KEY (entry_id) REFERENCES dict.entries(id) ON DELETE CASCADE;


--
-- Name: lexemes lexemes_lexeme_types_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.lexemes
    ADD CONSTRAINT lexemes_lexeme_types_fk FOREIGN KEY (type_id) REFERENCES dict.lexeme_types(id);


--
-- Name: lexemes lexemes_paradigms_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.lexemes
    ADD CONSTRAINT lexemes_paradigms_fk FOREIGN KEY (paradigm_id) REFERENCES dict.paradigms(id);


--
-- Name: entry_notes notes_entries_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.entry_notes
    ADD CONSTRAINT notes_entries_fk FOREIGN KEY (entry_id) REFERENCES dict.entries(id) ON DELETE CASCADE;


--
-- Name: dict_releases releases_dictionaries_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.dict_releases
    ADD CONSTRAINT releases_dictionaries_fk FOREIGN KEY (dictionary_id) REFERENCES dict.dictionaries(id);


--
-- Name: access_rights rights_dictionary_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.access_rights
    ADD CONSTRAINT rights_dictionary_fk FOREIGN KEY (dictionary_id) REFERENCES dict.dictionaries(id) ON DELETE CASCADE;


--
-- Name: access_rights rights_user_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.access_rights
    ADD CONSTRAINT rights_user_fk FOREIGN KEY (user_id) REFERENCES dict.users(id) ON DELETE CASCADE;


--
-- Name: search_words search_words_target_type_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.search_words
    ADD CONSTRAINT search_words_target_type_fk FOREIGN KEY (target_type_id) REFERENCES dict.entity_types(id);


--
-- Name: search_words search_words_word_type_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.search_words
    ADD CONSTRAINT search_words_word_type_fk FOREIGN KEY (word_type_id) REFERENCES dict.search_word_types(id);


--
-- Name: sense_relations sense_relations_sense_1_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_relations
    ADD CONSTRAINT sense_relations_sense_1_fk FOREIGN KEY (sense_1_id) REFERENCES dict.senses(id) ON DELETE CASCADE;


--
-- Name: sense_relations sense_relations_sense_2_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_relations
    ADD CONSTRAINT sense_relations_sense_2_fk FOREIGN KEY (sense_2_id) REFERENCES dict.senses(id) ON DELETE CASCADE;


--
-- Name: sense_relations sense_relations_type_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_relations
    ADD CONSTRAINT sense_relations_type_fk FOREIGN KEY (type_id) REFERENCES dict.sense_rel_types(id);


--
-- Name: senses senses_entries_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.senses
    ADD CONSTRAINT senses_entries_fk FOREIGN KEY (entry_id) REFERENCES dict.entries(id) ON DELETE CASCADE;


--
-- Name: senses senses_synsets_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.senses
    ADD CONSTRAINT senses_synsets_fk FOREIGN KEY (synset_id) REFERENCES dict.synsets(id) ON DELETE SET NULL;


--
-- Name: sense_entry_relations sentry_relations_entry_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_entry_relations
    ADD CONSTRAINT sentry_relations_entry_fk FOREIGN KEY (entry_id) REFERENCES dict.entries(id) ON DELETE CASCADE;


--
-- Name: sense_entry_relations sentry_relations_sense_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_entry_relations
    ADD CONSTRAINT sentry_relations_sense_fk FOREIGN KEY (sense_id) REFERENCES dict.senses(id) ON DELETE CASCADE;


--
-- Name: sense_entry_relations sentry_relations_type_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.sense_entry_relations
    ADD CONSTRAINT sentry_relations_type_fk FOREIGN KEY (type_id) REFERENCES dict.sense_entry_rel_types(id);


--
-- Name: source_links source_links_entries_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.source_links
    ADD CONSTRAINT source_links_entries_fk FOREIGN KEY (entry_id) REFERENCES dict.entries(id) ON DELETE CASCADE;


--
-- Name: source_links sources_links_sources_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.source_links
    ADD CONSTRAINT sources_links_sources_fk FOREIGN KEY (source_id) REFERENCES dict.sources(id) ON DELETE CASCADE;


--
-- Name: senses subsense_sense_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.senses
    ADD CONSTRAINT subsense_sense_fk FOREIGN KEY (parent_sense_id) REFERENCES dict.senses(id) ON DELETE CASCADE;


--
-- Name: suffixes suffixes_paradigm_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.suffixes
    ADD CONSTRAINT suffixes_paradigm_fk FOREIGN KEY (paradigm_id) REFERENCES dict.paradigms(id);


--
-- Name: synset_external_links synset_external_links_owner_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synset_external_links
    ADD CONSTRAINT synset_external_links_owner_fk FOREIGN KEY (synset_id) REFERENCES dict.synsets(id) ON DELETE CASCADE;


--
-- Name: synset_external_links synset_external_links_type_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synset_external_links
    ADD CONSTRAINT synset_external_links_type_fk FOREIGN KEY (link_type_id) REFERENCES dict.external_link_types(id);


--
-- Name: synset_relations synset_relations_synset_1_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synset_relations
    ADD CONSTRAINT synset_relations_synset_1_fk FOREIGN KEY (synset_1_id) REFERENCES dict.synsets(id) ON DELETE CASCADE;


--
-- Name: synset_relations synset_relations_synset_2_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synset_relations
    ADD CONSTRAINT synset_relations_synset_2_fk FOREIGN KEY (synset_2_id) REFERENCES dict.synsets(id) ON DELETE CASCADE;


--
-- Name: synset_relations synset_relations_type_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synset_relations
    ADD CONSTRAINT synset_relations_type_fk FOREIGN KEY (type_id) REFERENCES dict.synset_rel_types(id);


--
-- Name: synsets synsets_releases_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.synsets
    ADD CONSTRAINT synsets_releases_fk FOREIGN KEY (release_id) REFERENCES dict.dict_releases(id) ON DELETE CASCADE;


--
-- Name: SCHEMA dict; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA dict TO tezaurs_public;


--
-- Name: TABLE access_rights; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.access_rights TO tezaurs_public;


--
-- Name: TABLE changes; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.changes TO tezaurs_public;


--
-- Name: TABLE dict_releases; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.dict_releases TO tezaurs_public;


--
-- Name: TABLE dictionaries; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.dictionaries TO tezaurs_public;


--
-- Name: TABLE entity_types; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.entity_types TO tezaurs_public;


--
-- Name: TABLE entries; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.entries TO tezaurs_public;


--
-- Name: TABLE entry_notes; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.entry_notes TO tezaurs_public;


--
-- Name: TABLE entry_rel_types; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.entry_rel_types TO tezaurs_public;


--
-- Name: TABLE entry_relations; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.entry_relations TO tezaurs_public;


--
-- Name: TABLE entry_types; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.entry_types TO tezaurs_public;


--
-- Name: TABLE examples; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.examples TO tezaurs_public;


--
-- Name: TABLE external_link_types; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.external_link_types TO tezaurs_public;


--
-- Name: TABLE feedbacks; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.feedbacks TO tezaurs_public;


--
-- Name: TABLE full_entries; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.full_entries TO tezaurs_public;


--
-- Name: TABLE grammar_flag_values; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.grammar_flag_values TO tezaurs_public;


--
-- Name: TABLE grammar_flags; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.grammar_flags TO tezaurs_public;


--
-- Name: TABLE grammar_restriction_frequencies; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.grammar_restriction_frequencies TO tezaurs_public;


--
-- Name: TABLE grammar_restriction_types; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.grammar_restriction_types TO tezaurs_public;


--
-- Name: TABLE lexeme_types; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.lexeme_types TO tezaurs_public;


--
-- Name: TABLE lexemes; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.lexemes TO tezaurs_public;


--
-- Name: TABLE sense_entry_relations; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.sense_entry_relations TO tezaurs_public;


--
-- Name: TABLE senses; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.senses TO tezaurs_public;


--
-- Name: TABLE paradigms; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.paradigms TO tezaurs_public;


--
-- Name: TABLE search_word_types; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.search_word_types TO tezaurs_public;


--
-- Name: TABLE search_words; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.search_words TO tezaurs_public;


--
-- Name: TABLE sense_entry_rel_types; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.sense_entry_rel_types TO tezaurs_public;


--
-- Name: TABLE sense_rel_types; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.sense_rel_types TO tezaurs_public;


--
-- Name: TABLE sense_relations; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.sense_relations TO tezaurs_public;


--
-- Name: TABLE source_links; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.source_links TO tezaurs_public;


--
-- Name: TABLE sources; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.sources TO tezaurs_public;


--
-- Name: TABLE suffixes; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.suffixes TO tezaurs_public;


--
-- Name: TABLE synset_external_links; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.synset_external_links TO tezaurs_public;


--
-- Name: TABLE synset_rel_types; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.synset_rel_types TO tezaurs_public;


--
-- Name: TABLE synset_relations; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.synset_relations TO tezaurs_public;


--
-- Name: TABLE synsets; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.synsets TO tezaurs_public;


--
-- Name: TABLE users; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.users TO tezaurs_public;


--
-- Name: TABLE v1; Type: ACL; Schema: dict; Owner: mikus
--

GRANT SELECT ON TABLE dict.v1 TO tezaurs_public;


--
-- Name: TABLE v2; Type: ACL; Schema: dict; Owner: mikus
--

GRANT SELECT ON TABLE dict.v2 TO tezaurs_public;


--
-- Name: TABLE v3; Type: ACL; Schema: dict; Owner: mikus
--

GRANT SELECT ON TABLE dict.v3 TO tezaurs_public;


--
-- Name: TABLE v_deleted_entries; Type: ACL; Schema: dict; Owner: mikus
--

GRANT SELECT ON TABLE dict.v_deleted_entries TO tezaurs_public;


--
-- Name: TABLE v_last_updates; Type: ACL; Schema: dict; Owner: mikus
--

GRANT SELECT ON TABLE dict.v_last_updates TO tezaurs_public;


--
-- Name: TABLE wordnet_entries; Type: ACL; Schema: dict; Owner: postgres
--

GRANT SELECT ON TABLE dict.wordnet_entries TO tezaurs_public;


--
-- PostgreSQL database dump complete
--

