const debug = require('debug')('history');

const router = require('express').Router({ mergeParams: true });

const { syntaxHighlight } = require('../util/misc-utils');

const SHORTIFY_LIMIT = 36;

const shortify = s => {
  if (!s) return '';
  if (s.length <= SHORTIFY_LIMIT) return s;
  return s.slice(0, SHORTIFY_LIMIT) + '...';
}

const showEntryHistory = async (req, res, next) => {
  const app = req.app;
  const db = app.get('db');
  const dbschema = app.get('dbschema');
  const dataconn = db[dbschema];

  const entry_id = req.params.entry_id;

  const entry = await dataconn.entries.findOne(entry_id);
  if (!entry) {
    res.render('not-found',  { data: { query: entry_id }});
    return;
  }

  // SELECT *, to_char(effective_on, 'YYYY-MM-DD HH24:MI') changed_at FROM dict.changes c left join dict.users u on u.id = c.user_id ORDER BY effective_on DESC LIMIT 50

  const change_list = await db.query(
    `SELECT
      c.id, c.operation, c.entity_id, c.entity_type, c.entry_id,
      c.data_before, c.data_after, c.data_diff,
      to_char(effective_on, 'YYYY-MM-DD HH24:MI') changed_at,
      c.user_id, u.login, u.full_name
      FROM dict.changes c left join dict.users u on u.id = c.user_id
      WHERE entry_id = $1
      ORDER BY effective_on DESC`,
    [ entry_id ]);

  for (let c of change_list) {
    // let x = await dataconn[c.entity_type].findOne(c.entity_id);
    const x = c.operation === 'DELETE' ? c.data_before : c.data_after;

    switch (c.entity_type) {
      case 'entries':
        c.slug = shortify(x.heading);
        break;
      case 'senses':
        c.slug = shortify(x.gloss);
        break;
      case 'lexemes':
        c.slug = shortify(x.lemma);
        break;
      case 'examples':
        c.slug = shortify(x.content);
        break;
      case 'source_links':
        let x2 = await dataconn.sources.findOne(x.source_id);
        c.slug = x2.abbr;
        break;
      case 'sense_entry_relations':
        // TODO: varbūt formā "sense_slug rel_name entry_slug"
      case 'entry_relations':
        // TODO: varbūt formā "entry_slug rel_name entry_slug"
      case 'sense_relations':
        // TODO: varbūt formā "sense_slug rel_name sense_slug"
      default:
        c.slug = ''; // TODO
    }
  }

  res.render('change-history', { change_list, entry });
}

const isIgnoredKey = k => ['created_at', 'updated_at', 'updated_by', 'ts'].includes(k);

const removeEmpty = obj => (typeof obj !== 'object' || !obj) 
  ? obj 
  : Object.entries(obj)
    .map(([k,v])=>[k,v && typeof v === "object" ? removeEmpty(v) : v])
    .reduce((a,[k,v]) => ((v == null || isIgnoredKey(k)) ? a : (a[k]=v, a)), {});

const showChangeDetails = async (req, res, next) => {
  const app = req.app;
  const db = app.get('db');
  const dbschema = app.get('dbschema');
  const dataconn = db[dbschema];

  const entry_id = req.params.entry_id;
  const change_id = req.params.change_id;

  const change = await dataconn.changes.findOne(change_id);
  if (!change) {
    res.render('not-found',  { data: { query: change_id }});
    return;
  }

  res.render('change-details', {
    change,
    entry_id,
    // before: syntaxHighlight(change.data_before),
    // before: JSON.stringify(change.data_before, null, 2),
    before: JSON.stringify(removeEmpty(change.data_before), null, 2),
    // after: syntaxHighlight(change.data_after),
    // after: JSON.stringify(change.data_after, null, 2),
    after: JSON.stringify(removeEmpty(change.data_after), null, 2),
    // diff: syntaxHighlight(change.data_diff),
    // diff: JSON.stringify(change.data_diff, null, 2),
    diff: JSON.stringify(removeEmpty(change.data_diff), null, 2),
   });
}

router.get('/entry/:entry_id/change/:change_id', showChangeDetails);

router.get('/entry/:entry_id', showEntryHistory);

module.exports = router;
