const debug = require('debug')('stats');

const HITS_TABLE = 'entry_hits'
const MISSES_TABLE = 'miss_hits'
const MISSES_SUMMARY_TABLE = 'missing'

const reportHit = async (app, entry_id) => {
  if (!process.env.REPORT_STATS) return;

  const db = app.get('db');
  const statsschema = app.get('statsschema');
  const statsconn = db[statsschema];

  debug(`reporting hit for "${entry_id}"`);
  const sql = `INSERT INTO ${statsschema}.entry_hits (entry_id) VALUES ($1)`;
  await db.query(sql, [entry_id])

  // await statsconn.entry_hits.insert({ entry_id });
}

const isSpam = slug => {
  if (slug.endsWith('.php')) return true;
  if (slug.endsWith('.png')) return true;
  if (slug.endsWith('.jpg')) return true;
  if (slug.endsWith('.css')) return true;
  if (slug.endsWith('.js')) return true;
  if (slug.endsWith('.env')) return true;
  if (slug.endsWith('.txt')) return true;
  if (slug.endsWith('.zip')) return true;
  if (slug.endsWith('.gz')) return true;
  if (slug.endsWith('.tgz')) return true;
  if (slug.endsWith('.tar')) return true;
  if (slug.endsWith('.rar')) return true;
  if (slug.endsWith('.sql')) return true;
  if (slug.endsWith('.bz2')) return true;
  if (slug.endsWith('.asp')) return true;
}

const reportMissingSlug = async (app, slugToSearch) => {
  if (!process.env.REPORT_STATS) return;

  const db = app.get('db');
  const statsschema = app.get('statsschema');
  const statsconn = db[statsschema];

  if (!slugToSearch) return;
  let slug = slugToSearch.trim();

  if (isSpam(slug.toLowerCase())) return;

  debug(`reporting missing slug "${slugToSearch}"`);
/*
  // FIXME: vajag labāku, atomic skaitīšanas veidu
  const exists = await statsconn.missing.findOne({ slug });
  if (exists) {
    await db.query(`update ${statsschema}.missing set hits = hits + 1 where slug = $1`, [ slug ]);
  } else {
    await statsconn.missing.insert({ slug });
  }
*/
  const sql1 = `INSERT INTO ${statsschema}.missing (slug) VALUES ($1) ON CONFLICT ON CONSTRAINT missing_slug_key DO UPDATE SET hits = missing.hits + 1`;
  await db.query(sql1, [slug])

  const sql2 = `INSERT INTO ${statsschema}.miss_hits (slug) VALUES ($1)`;
  await db.query(sql2, [slug])


}


module.exports = {
  reportHit,
  reportMissingSlug,
}
