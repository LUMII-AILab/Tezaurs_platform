
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
  if exists (
    select 1 
	  from sense_entry_relations ser 
	  join senses s on ser.sense_id = s.id 
	  where ser.entry_id = r_id 
	  and s.entry_id = d_id
  ) then
    raise exception 'donora nozīmei ir saite ar saņēmēju';
  end if;
  
  if exists (
    select 1 
	  from sense_entry_relations ser 
	  join senses s on ser.sense_id = s.id 
	  where ser.entry_id = d_id 
	  and s.entry_id = r_id
  ) then
    raise exception 'saņēmēja nozīmei ir saite ar donoru';
  end if;
  
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
end
