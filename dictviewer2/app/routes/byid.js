const express = require('express');
const router = express.Router();
const debug = require('debug')('entry:random');
const c = require('ansi-colors');

router.get('/_byid/:entity_type/:entity_id', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const dbschema = req.app.get('dbschema');

    let entity_type = req.params.entity_type;
    if (entity_type) entity_type = entity_type.toLowerCase();

    if (!entity_type || !['entry', 'sense', 'lexeme', 'example'].includes(entity_type)) throw new Error('Nenorādīts vai nepareizs entītijas tips ');

    let entity_idStr = req.params.entity_id;
    if (!entity_idStr) throw new Error('Nav norādīts entītijas id');

    let entity_id;
    try {
      entity_id = Number.parseInt(entity_idStr);
    } catch (err) {
      throw new Error('Slikts entītijas id');
    }

    console.log(c.red('by id:'), entity_type, entity_id);

    // if (entity_type === 'entry') {
    //   let row = await db[dbschema].entries.find(entity_id);
    //   if (row) {
    //     res.redirect(`/${encodeURIComponent(row.human_key)}`);
    //   }
    // }

    let sql;
    let hilite = '';
    switch(entity_type) {
      case 'entry':
        sql = `SELECT id, heading, human_key FROM dict.entries WHERE id = $1`;
        break;
      case 'lexeme':
        sql = `SELECT e.id id, heading, human_key FROM dict.lexemes x JOIN dict.entries e ON e.id = x.entry_id WHERE x.id = $1`;
        hilite = `?hilite=l:${entity_id}`
        break;
      case 'sense':
        sql = `SELECT e.id id, heading, human_key FROM dict.senses x JOIN dict.entries e ON e.id = x.entry_id WHERE x.id = $1`;
        hilite = `?hilite=s:${entity_id}`
        break;
      case 'example':
        sql = `SELECT e.id id, heading, human_key FROM dict.examples x JOIN dict.entries e ON e.id = x.entry_id WHERE x.id = $1`;
        hilite = `?hilite=x:${entity_id}`
        break;
      case 'synset':
        // TODO
        break;
      default:
        throw new Error('Nezināms entītijas tips');
    }

    // console.log(db)
    const row = await db.instance.any(sql, [entity_id]);
    console.log(row);
    if (row) {
      res.redirect(`/${encodeURIComponent(row[0].human_key)}${hilite}`);
    }

  } catch (err) {
    console.error(err);
    res.render('not-found', { error: err });
  }
});

module.exports = router;
