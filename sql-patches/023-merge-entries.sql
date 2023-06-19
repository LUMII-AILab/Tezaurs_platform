--
-- Pagaidām šo izmantos MWE šķirkļu apvienošanai
--
-- Apvieno divus šķirkļus, pārceļot visu uz saņēmējšķirkli, un pēc tam izmetot devējšķirkli
-- r_id saņēmējšķirklis (id)
-- d_id devējšķirklis (id)
--
CREATE OR REPLACE PROCEDURE dict.merge_entries(IN r_id int, IN d_id int)
LANGUAGE plpgsql
AS
$$
DECLARE
  next_no int;
  ee_rel dict.entry_relations%ROWTYPE;
  source_rel dict.source_links%ROWTYPE;
  lex dict.lexemes%ROWTYPE;
  sense dict.senses%ROWTYPE;
  ex dict.examples%ROWTYPE;
BEGIN

  IF d_id = r_id THEN
    RAISE EXCEPTION 'nevar apvienot šķirkli pašu ar sevi';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM dict.entries WHERE id = r_id) THEN
    RAISE EXCEPTION 'saņēmējšķirklis neeksistē';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM dict.entries WHERE id = d_id) THEN
    RAISE EXCEPTION 'devējšķirklis neeksistē';
    RETURN;
  END IF;

  IF (SELECT type_id FROM dict.entries WHERE id = r_id)!=(SELECT type_id FROM dict.entries WHERE id = d_id) THEN
    RAISE EXCEPTION 'nevar apvienot šķirkļus ar dažādiem tipiem';
    RETURN;
  END IF;

  -- entry-entry saites

  -- izmetam saites, kuras kļūtu par cilpu (+ziņojam)
  IF EXISTS (SELECT 1 FROM dict.entry_relations WHERE entry_1_id = d_id AND entry_2_id = r_id) THEN
    DELETE FROM dict.entry_relations WHERE entry_1_id = d_id AND entry_2_id = r_id;
    RAISE NOTICE 'izmetam saiti starp apvienojamajiem šķirkļiem';
  END IF;
  IF EXISTS (SELECT 1 FROM dict.entry_relations WHERE entry_1_id = r_id AND entry_2_id = d_id) THEN
    DELETE FROM dict.entry_relations WHERE entry_1_id = r_id AND entry_2_id = d_id;
    RAISE NOTICE 'izmetam saiti starp apvienojamajiem šķirkļiem';
  END IF;

  -- pārceļam saites, kam entry_1_id = d_id
  -- jāskatās, vai saite ar tādu pašu otru galu un tipu nav jau priekšā
  FOR ee_rel IN
    SELECT *
    FROM dict.entry_relations
    WHERE entry_1_id = d_id
  LOOP

    IF NOT EXISTS (
      SELECT 1
      FROM dict.entry_relations
      WHERE entry_1_id = r_id
      AND entry_2_id = ee_rel.entry_2_id
      AND type_id = ee_rel.type_id
    ) THEN
      UPDATE dict.entry_relations
      SET entry_1_id = r_id
      WHERE id = ee_rel.id;
    ELSE
      RAISE NOTICE 'jau eksistē saite starp % un % ar tipu %', r_id, ee_rel.entry_2_id, ee_rel.type_id;
      DELETE FROM dict.entry_relations
        WHERE id = ee_rel.id;
    END IF;

  END LOOP;

  -- pārceļam saites, kam entry_2_id = d_id
  -- jāskatās, vai saite ar tādu pašu otru galu un tipu nav jau priekšā
  FOR ee_rel IN
    SELECT *
    FROM dict.entry_relations
    WHERE entry_2_id = d_id
  LOOP

    IF NOT EXISTS (
      SELECT 1
      FROM dict.entry_relations
      WHERE entry_2_id = r_id
        AND entry_1_id = ee_rel.entry_1_id
        AND type_id = ee_rel.type_id
    ) THEN
      UPDATE dict.entry_relations
      SET entry_2_id = r_id
      WHERE id = ee_rel.id;
    ELSE
      RAISE NOTICE 'jau eksistē saite starp % un % ar tipu %', ee_rel.entry_1_id, r_id, ee_rel.type_id;
      DELETE FROM dict.entry_relations
        WHERE id = ee_rel.id;
    END IF;

  END LOOP;

  -- sense-entry saites
  UPDATE dict.sense_entry_relations
  -- SET entry_id = r_id, hidden = true
  SET entry_id = r_id
  WHERE entry_id = d_id;

  -- source saites
  -- jāskatās, vai tāds source jau nav priekšā
  FOR source_rel IN
    SELECT *
    FROM dict.source_links
    WHERE entry_id = d_id
  LOOP

    IF NOT EXISTS (
      SELECT 1
      FROM dict.source_links
      WHERE entry_id = r_id
        AND source_id = source_rel.source_id
    ) THEN
      UPDATE dict.source_links
      SET entry_id = r_id
      WHERE id = source_rel.id;
    ELSE
      RAISE NOTICE 'šķirklim % jau ir avots %', r_id, source_rel.source_id;
      DELETE FROM dict.source_links
      WHERE id = source_rel.id;
    END IF;

  END LOOP;

  -- leksēmas
  SELECT coalesce(max(order_no) + 1, 1)
  FROM dict.lexemes
  WHERE entry_id = r_id
  INTO next_no;

  FOR lex IN
    SELECT *
    FROM dict.lexemes
    WHERE entry_id = d_id
  LOOP

    UPDATE dict.lexemes
    SET entry_id = r_id,
      hidden = true,
      order_no = next_no
    WHERE id = lex.id;

    next_no := next_no + 1;

  END LOOP;

  -- nozīmes
  SELECT coalesce(max(order_no) + 1, 1)
  FROM dict.senses
  WHERE entry_id = r_id
  INTO next_no;

  FOR sense IN
    SELECT *
    FROM dict.senses
    WHERE entry_id = d_id
  LOOP

    UPDATE dict.senses
    SET entry_id = r_id,
      hidden = true,
      order_no = next_no
    WHERE id = lex.id;

    next_no := next_no + 1;

  END LOOP;
  -- TODO: sakārtot sense_tag

  -- piemēri pie entry
  SELECT coalesce(max(order_no) + 1, 1)
  FROM dict.examples
  WHERE entry_id = r_id
    AND sense_id IS NULL
  INTO next_no;

  FOR ex IN
    SELECT *
    FROM dict.examples
    WHERE entry_id = d_id
      AND sense_id IS NULL
  LOOP

    UPDATE dict.examples
    SET entry_id = r_id,
      hidden = true,
      order_no = next_no
    WHERE id = lex.id;

    next_no := next_no + 1;

  END LOOP;

  -- piemēri pie sense, kam norādīts arī entry
  UPDATE dict.examples
  SET entry_id = r_id
  WHERE entry_id = d_id
    AND sense_id IS NOT NULL;

  -- beigās izmetam iztukšoto donoru
  DELETE FROM dict.entries WHERE id = d_id;

  RAISE INFO 'entry % merged into %', d_id, r_id;

  -- ?? vai vajag COMMIT, vai arī tas jau tāpat ir default ??
END
$$;

COMMENT ON PROCEDURE dict.merge_entries IS 'Apvieno 2 šķirkļus, devējšķirkļa saturu pievienojot saņēmējšķirklim';
