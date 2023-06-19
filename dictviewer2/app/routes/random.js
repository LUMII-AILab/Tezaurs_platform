const express = require('express');
const router = express.Router();
const debug = require('debug')('entry:random');

const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

const getRandomSlug = (entries) => {
  let n = getRandomInt(0, entries.length);
  let slug = entries[n].human_key;
  while (!slug) {
    n += 1;
    if (n >= entries.length) {
      n = 0;
    }
    slug = entries[n].human_key;
  }
  return slug;
}

router.get('/_/r', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const dbschema = req.app.get('dbschema');

    const filter = {
      type_id: [1],
    };

    let entryCount = await db[dbschema].entries.count(filter);
    let idx = getRandomInt(0, entryCount);
    let e = await db[dbschema].entries.find(
      filter,
      {
        offset: idx,
        limit: 1,
      }
    );

    if (e.length > 0) {
      const slug = e[0].human_key;
      debug('Metu monētu un sanāca %s', slug);
      res.redirect(`/${encodeURIComponent(slug).replace('%3A', ':')}`);
    } else {
      console.error('Neko neatradu');
      res.render('not-found');
    }

/*
    // let entries = req.app.locals.dbcache.entries;
    // let entries = await req.app.locals.dbcache.getEntries({ 'human_key IS NOT': null });
    let entries;
    if (config.app_mode === config.APP_MODE.PUBLIC) {
      entries = Array.from(req.app.locals.dbcache.entriesById.values());
      entries = entries.filter(x => [1,5].includes(x.type_id));
    } else {
      entries = await req.app.locals.dbcache.getEntries({ 'human_key IS NOT': null });
    }

    const randomSlug = getRandomSlug(entries);
    debug('Metu monētu un sanāca %s', randomSlug);
    // res.redirect(`/${encodeURIComponent(randomSlug)}`);
    res.redirect(`/${encodeURIComponent(randomSlug)}`);
*/
  } catch (err) {
    console.error(err);
    res.render('not-found', { error: err });
  }
});

module.exports = router;
