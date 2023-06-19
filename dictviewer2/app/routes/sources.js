const config = require('../config');
const debug = require('debug')('sources');
const express = require('express');
const router = express.Router();

let cached_sources = null;

const PRIMARY_SOURCES_THRESHOLD = 0.05;
const SECONDARY_SOURCES_THRESHOLD = 0.01;

/* GET sources */
router.get('/_avoti', async (req, res, next) => {
  let sources = cached_sources;
  if (!sources) {
    const db = req.app.get('db');
    const dbschema = req.app.get('dbschema');
    const dataconn = db[dbschema];

    const sql1 = `select abbr, title, url, (select count(distinct entry_id) from ${dbschema}.source_links where source_id = s.id) usages from ${dbschema}.sources s order by usages desc;`;
    const sql2 = `select count(*) from ${dbschema}.entries where type_id in (1, 5);`

    try {
      let r1 = await db.query(sql1);
      r1 = r1.filter(x => x.usages > 0);

      const r2 = await db.query(sql2);
      const total_count = r2[0].count;

      const primary_limit = total_count * PRIMARY_SOURCES_THRESHOLD;
      const secondary_limit = total_count * SECONDARY_SOURCES_THRESHOLD;

      r1.forEach(source => {
        if (source.usages >= primary_limit) {
          source.category = 'PRIMARY';
        } else if (source.usages >= secondary_limit) {
          source.category = 'SECONDARY';
        } else {
          source.category = 'TERTIARY';
        }
      })

      sources = r1;
      if (config.app_mode === config.APP_MODE.PUBLIC) {
        cached_sources = sources;
      }

    } catch(err) {
      console.error(err);
    }
  }

  res.render('sources', { sources });
});

module.exports = router;
