const config = require('../config');
const debug = require('debug')('sources');
const express = require('express');
const router = express.Router();

const { APP_MODE, app_mode } = require('../config');

const PAGE_SIZE = 200;

router.get('/_entry-list', async (req, res, next) => {
  let cache = req.app.locals.dbcache;

  let db = req.app.get('db');
  let dbschema = req.app.get('dbschema');

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

  let letterStr = PARAMS.letter?.[0];
  try {
    let sql = `SELECT id, heading, human_key 
      FROM ${dbschema}.entries 
      WHERE type_id <> 4 
        AND heading ILIKE '${letterStr}%' 
      ORDER BY heading, human_key 
      -- LIMIT ${PAGE_SIZE} 
      -- OFFSET ${(pageNo - 1) * PAGE_SIZE}
      `;
    let entries = await db.query(sql);
  
    res.render('entry-list', { entries, letterStr });
  } catch(err) {
    console.error(err);
  }

});

module.exports = router;
