const config = require('../../config');
const debug = require('debug')('talka');
const col = require('ansi-colors');
const _ = require('lodash');

// const PAGE_SIZE = 50;
const PAGE_SIZE = 6000;

const list_talka_1 = async (req, res, next) => {

  // console.log(` get from ${req.ip}`);
  const db = req.app.get('db');

  let PARAMS = {};
  if (req.query && typeof req.query === 'object') {
    PARAMS = Object.assign(PARAMS, req.query);
  }
  if (req.body && typeof req.body === 'object') {
    PARAMS = Object.assign(PARAMS, req.body);
  }
  debug({ PARAMS });
  
  const pageStr = PARAMS.page;
  let pageNo = 1;
  let pageSize = PAGE_SIZE;

  if (pageStr) {
    try {
      pageNo = Number.parseInt(pageStr, 10);
    } catch {
      pageNo = 1;
    }
  }

  let letterStr = PARAMS.letter;
  if (letterStr === '(') letterStr = '\\(';

  const sqlFull = `SELECT 
      e.id id,
      heading,
      human_key,
      lemma,
      l.id lexeme_id
    FROM temp.talka1 t 
    JOIN lexemes l ON t.lexeme_id = l.id
    JOIN entries e ON e.id = l.entry_id 
    WHERE e.type_id = 4 
      AND lemma ~ '^\\(?[A-ZĀĒĪŌŪČŠŽĢĶĻŅŖ]' 
      AND (l.data->'Gram'->'Flags'->>'Lietvārda tips' IS DISTINCT FROM 'Īpašvārds') 
      AND t.status IS NULL
    ORDER BY lemma, heading, human_key 
    `;

  const sqlLetter = `SELECT 
      e.id id,
      heading,
      human_key,
      lemma,
      l.id lexeme_id,
      (select array_to_string(array_agg(gloss), '<br>') from senses where entry_id = e.id and parent_sense_id is null) as ss
    FROM temp.talka1 t 
    JOIN lexemes l ON t.lexeme_id = l.id
    JOIN entries e ON e.id = l.entry_id 
    WHERE e.type_id = 4 
      AND lemma ~ '^${letterStr}' 
      AND (l.data->'Gram'->'Flags'->>'Lietvārda tips' IS DISTINCT FROM 'Īpašvārds') 
      AND t.status IS NULL
    ORDER BY lemma, heading, human_key 
    `;

  let sql = letterStr ? sqlLetter : sqlFull;

  let queryResults;

  try {
    queryResults = await db.query(sql);
  
    for (let r of queryResults) {
      r.lemma_new = decapitalizeStr(r.lemma);
    }

    let letterCounts;
    if (!letterStr) {
      letterCounts = _.groupBy(queryResults, x => x.lemma[0]);
      Object.keys(letterCounts).forEach(k => { letterCounts[k] = letterCounts[k].length });
    } 

    const totalPages = 1 + Math.floor((queryResults.length - 1) / pageSize);
    pageNo = Math.max(Math.min(totalPages, pageNo), 1);
  
    let paginationInfo = {
      currentPage: pageNo,
      totalPages,
      totalRows: queryResults.length,
      pageSize,
    }
  
    debug('pirms slice')
    let resultsToShow = queryResults.slice((pageNo - 1) * pageSize, pageNo * pageSize);
    debug('pēc slice')
  
    res.render('talka', { letterStr, letterCounts, paginationInfo, titlePrefix: 'Talka', results: resultsToShow });

  } catch(err) {
    console.error(err);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const isLetter = c => {
  const LETTERS = 'AĀBCČDEĒFGĢHIĪJKĶLĻMNŅOŌPQRŖSŠTUŪVWXYZŽaābcčdeēfgģhiījkķlļmnņoōpqrŗsštuūvwxyzž';
  return LETTERS.includes(c);
}

const decapitalizeStr = str => {
  if (!str) return str;
  for (let i = 0; i < str.length; i += 1) {
    if (!isLetter(str[i])) continue;
    return str.slice(0, i) + str[i].toLowerCase() + str.slice(i+1);
  }
  return str;
}

const doAction = async (db, lexeme_id, decapitalize, properNounType, user_id) => {
  try {
    await db.withTransaction(async tx => {
      if (user_id) await tx.query(`set local myvars.appuser=${user_id}`);

      let talkaRow = await tx.temp.talka1.findOne({ lexeme_id });
      if (!talkaRow) {
        throw new Error(`Talka row not found for lexeme ${lexeme_id}`);
      }
      // console.log({talkaRow});
      if (talkaRow.status !== null) {
        throw new Error(`Lexeme ${lexeme_id} already done`);
        return;
      }
      console.log({ lexeme_id, decapitalize, properNounType, user_id });
      if (decapitalize) {
        if (properNounType) throw new Error(`cannot decapitalize proper nouns, lexeme ${lexeme_id}`);

        let lexemeRow = await tx.dict.lexemes.findOne({ id: lexeme_id });
        if (!lexemeRow) {
          throw new Error(`lexeme row not found for id ${lexeme_id}`);
        }

        // console.log(lexemeRow);
        let entryRow = await tx.dict.entries.findOne({ id: lexemeRow.entry_id });
        if (!entryRow) {
          throw new Error(`entry row not found for id ${lexemeRow.entry_id}`);
        }

        const newLemma = decapitalizeStr(lexemeRow.lemma);
        await tx.query(`update dict.lexemes set lemma = $1 where id = $2`, [ newLemma, lexeme_id ])
        await tx.query(`update temp.talka1 set status = true, user_id = $2, proper_noun_type = $3 where lexeme_id = $1`, [ lexeme_id, user_id, properNounType ]);
        if (entryRow.heading_is_primary_lexeme && entryRow.primary_lexeme_id === lexeme_id) {
          await tx.query(`update dict.entries set heading = $1 where id = $2`, [ newLemma, entryRow.id]);
        }

      } else {
        await tx.query(`update temp.talka1 set status = false, user_id = $2, proper_noun_type = $3 where lexeme_id = $1`, [ lexeme_id, user_id, properNounType ]);
        if (properNounType) {
          let lexemeRow = await tx.dict.lexemes.findOne({ id: lexeme_id });
          if (!lexemeRow) {
            throw new Error(`lexeme row not found for id ${lexeme_id}`);
          }

          if (properNounType === 'taxon') {
            // pievienot karogu { 'Taksona kandidāts': 'Jā' }
            // console.log({ oldData: JSON.stringify(lexemeRow.data) })
            let newData = Object.assign({ Gram: { Flags: {} } }, lexemeRow.data);
            newData.Gram.Flags['Taksona kandidāts'] = 'Jā';
            // console.log({ newData: JSON.stringify(newData) })

            await tx.query(`update dict.lexemes set data = $1 where id = $2`, [ newData, lexeme_id ]);
          }

          if (properNounType === 'vietvārds') {
            // pievienot karogus { 'Lietvārda tips': 'Īpašvārds', 'Īpašvārda veids': 'Vietvārds' }            
            // console.log({ oldData: JSON.stringify(lexemeRow.data) })
            let newData = Object.assign({ Gram: { Flags: {} } }, lexemeRow.data);
            newData.Gram.Flags['Lietvārda tips'] = 'Īpašvārds';
            newData.Gram.Flags['Īpašvārda veids'] = 'Vietvārds';
            // console.log({ newData: JSON.stringify(newData) })

            await tx.query(`update dict.lexemes set data = $1 where id = $2`, [ newData, lexeme_id ]);
          }
  
        }
      }
    });
    return null;
  } catch (err) {
    console.error(err);
    console.log(err.message);
    return err;
  }
}

const action_talka_1 = async (req, res, next) => {
  // console.log(` patch from ${req.ip}`);
  const db = req.app.get('db');
  const userId = req.user && req.user.id;
  let err = await doAction(db, req.body.lexeme_id, req.body.decapitalize, req.body.properNounType, userId);
  if (!err) {
    res.status(200).send({ message: 'OK' });
  } else {
    res.status(400).send({ message: err.message });
  }
}

module.exports = {
  list: list_talka_1,
  action: action_talka_1,
}
