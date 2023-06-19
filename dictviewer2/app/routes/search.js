const config = require('../config');
const debug = require('debug')('search');
const express = require('express');
const router = express.Router();

const { syntaxHighlight, markdownDecoder } = require('../util/misc-utils');
const { reportMissingSlug } = require('../util/stats');
const { lookupWordInOtherDictionaries } = require('../util/inOtherDictionaries');

const WORD_QUERY_LIMIT = 500;
const WORD_RESULT_LIMIT = 1000;

const MWE_QUERY_LIMIT = 200;
const MWE_RESULT_LIMIT = 500;

const SENSE_QUERY_LIMIT = 10000;
// const SENSE_RESULT_LIMIT = 500;

// const WORD_TYPES = [1, 5, 7, 8];
const WORD_TYPES = [1, 5];
// const MWE_TYPES = [2, 3, 4, 6];
const MWE_TYPES = [4];

const ENTRY_RESULT_FIELD_LIST = ['id', 'type_id', 'human_key', 'heading', 'hidden'];
const ENTRY_RESULT_ORDERING = [{
  field: 'heading',
}];

const SENSE_RESULT_FIELD_LIST = ['gloss', ...ENTRY_RESULT_FIELD_LIST];
const SENSE_RESULT_ORDERING = [{
  field: 'gloss',
}];

const SearchMode = {
  auto: 'auto',
  prefix: 'prefix',
  suffix: 'suffix',
  infix: 'infix',
};

const lookupCandidateEntries = async (app, slug, mode) => {
  // const hits = {
  //   words: ['aita', 'koks:2', 'suns'],
  //   mwes: ['Līst kā pa J.', 'Kā vējš skrien, kā miets atduras'],
  // };
  // return hits;

  const db = app.get('db');
  const dbschema = app.get('dbschema');

  let slugToSearch = slug.includes(':')
    ? slug.slice(0, slug.indexOf(':'))
    : slug;

  debug(`looking up for slug "${slugToSearch}" in mode "${mode}"`);

  let wordEntries = [];
  let keySet = new Set();
  try {
    if ([SearchMode.auto, SearchMode.prefix].includes(mode)) {
      wordEntries = await db[dbschema].entries.find(
        {
          'heading LIKE': `${slugToSearch}%`,
          type_id: WORD_TYPES,
        },
        {
          limit: WORD_QUERY_LIMIT,
          fields: ENTRY_RESULT_FIELD_LIST,
          order: ENTRY_RESULT_ORDERING,
        });

      for (let w of wordEntries) {
        keySet.add(w.human_key);
      }
    }
  } catch (error) {
    debug('error in LIKE%', error);
  }

  try {
    if ([SearchMode.auto, SearchMode.suffix].includes(mode)) {
      if (keySet.size < WORD_RESULT_LIMIT) {
        let tempEntries = await db[dbschema].entries.find(
          {
            'heading LIKE': `%${slugToSearch}`,
            type_id: WORD_TYPES,
          },
          {
            limit: WORD_QUERY_LIMIT,
            fields: ENTRY_RESULT_FIELD_LIST,
            order: ENTRY_RESULT_ORDERING,
          });

        for (let w of tempEntries) {
          if (wordEntries.length >= WORD_RESULT_LIMIT) break;
          if (!keySet.has(w.human_key)) {
            keySet.add(w.human_key);
            wordEntries.push(w);
          }
        }
      }
    }
  } catch (error) {
    debug('error in %LIKE', error);
  }

  try {
    if ([SearchMode.auto, SearchMode.infix].includes(mode)) {
      if (keySet.size < WORD_RESULT_LIMIT) {
        let tempEntries = await db[dbschema].entries.find(
          {
            'heading LIKE': `%${slugToSearch}%`,
            type_id: WORD_TYPES,
          },
          {
            limit: WORD_QUERY_LIMIT,
            fields: ENTRY_RESULT_FIELD_LIST,
            order: ENTRY_RESULT_ORDERING,
          });

        for (let w of tempEntries) {
          if (wordEntries.length >= WORD_RESULT_LIMIT) break;
          if (!keySet.has(w.human_key)) {
            keySet.add(w.human_key);
            wordEntries.push(w);
          }
        }
      }
    }
  } catch (error) {
    debug('error in %LIKE%', error);
  }

  // sakārtojot no īsākā uz garāko, īsākie būs tuvāk ievadītajai apakšvirknei
  wordEntries = wordEntries.sort((x1, x2) => x1.heading.length - x2.heading.length);
  if (config.app_mode === config.APP_MODE.PUBLIC) {
    debug('public version – filtering out the hidden entires')
    wordEntries = wordEntries.filter(x => !x.hidden);
  }
  wordEntries = wordEntries.slice(0, WORD_RESULT_LIMIT);

  debug(`word hits: ${wordEntries.length}`, wordEntries);

  // -------------------

  let mweEntries = [];
  let mweKeySet = new Set();

  // let searchTerm = entrySlug.includes(' ') ? `"${entrySlug}"` : entrySlug;
  let searchTerm = slugToSearch;

  try {
    mweEntries = await db[dbschema].entries.search(
      {
        fields: ['heading'],
        term: searchTerm,
        // parser: 'websearch',
        where: {
          type_id: MWE_TYPES,
        },
      },
      {
        limit: MWE_QUERY_LIMIT,
        fields: ENTRY_RESULT_FIELD_LIST,
        order: ENTRY_RESULT_ORDERING,
      });

      for (let w of mweEntries) {
        mweKeySet.add(w.human_key);
      }
  } catch (error) {
    debug('error in full text search', error);
  }

  try {
    if (mweKeySet.size < MWE_RESULT_LIMIT) {
      let tempEntries = await db[dbschema].entries.search(
        {
          fields: ['heading'],
          term: searchTerm,
          parser: 'websearch',
          where: {
            type_id: MWE_TYPES,
          },
        },
        {
          limit: MWE_QUERY_LIMIT,
          fields: ENTRY_RESULT_FIELD_LIST,
          order: ENTRY_RESULT_ORDERING,
        });
  
      for (let w of tempEntries) {
        if (mweEntries.length >= MWE_RESULT_LIMIT) break;
        if (!mweKeySet.has(w.human_key)) {
          mweKeySet.add(w.human_key);
          mweEntries.push(w);
        }
      }
    }

  } catch (error) {
    debug('error in full text search', error);
  }

  try {
    if (mweKeySet.size < MWE_RESULT_LIMIT) {
      let tempEntries = await db[dbschema].entries.search(
        {
          fields: ['heading'],
          term: searchTerm,
          parser: 'plain',
          where: {
            type_id: MWE_TYPES,
          },
        },
        {
          limit: MWE_QUERY_LIMIT,
          fields: ENTRY_RESULT_FIELD_LIST,
          order: ENTRY_RESULT_ORDERING,
        });
  
      for (let w of tempEntries) {
        if (mweEntries.length >= MWE_RESULT_LIMIT) break;
        if (!mweKeySet.has(w.human_key)) {
          mweKeySet.add(w.human_key);
          mweEntries.push(w);
        }
      }
    }

  } catch (error) {
    debug('error in full text search', error);
  }

  if (config.app_mode === config.APP_MODE.PUBLIC) {
    debug('public version – filtering out the hidden mwe entires')
    mweEntries = mweEntries.filter(x => !x.hidden);
  }
  debug(`fuzzy hits: ${mweEntries.length}`, mweEntries);

  mweEntries = mweEntries.sort((x1, x2) => x1.heading.localeCompare(x2.heading));

  let senseEntries = [];
  /*
  let sensesWithEntries = db[dbschema].senses.join({
    'dict.entries': {
      type: 'INNER',
      on: { id: 'entry_id' }
    }
  });

  try {
    senseEntries = await sensesWithEntries.search(
      {
        fields: ['gloss'],
        term: searchTerm,
      },
      {
        limit: SENSE_QUERY_LIMIT,
        // fields: SENSE_RESULT_FIELD_LIST,
        fields: ['gloss'],
        order: SENSE_RESULT_ORDERING,
      }
    );

  } catch(error) {
    debug('error in sense FTS', error);
  }
  */
  
  try {
    senseEntries = await db.query(
      `SELECT e.id, e.human_key, e.heading, e.hidden e_hidden,
          s.gloss, s.hidden s_hidden
        FROM dict.senses s join dict.entries e on s.entry_id = e.id
        WHERE gloss ~ $1
        ORDER BY gloss, human_key
        LIMIT $2
    `,[
      searchTerm,
      SENSE_QUERY_LIMIT,
    ]);
  } catch (error) {
    debug('error in sense FTS', error);
  }

  if (config.app_mode === config.APP_MODE.PUBLIC) {
    debug('public version – filtering out the hidden sense entires')
    senseEntries = senseEntries.filter(x => !x.e_hidden && !x.s_hidden);
  }
  debug(`sense hits: ${senseEntries.length}`, senseEntries);

  // TODO: šķērsmeklēšana citās vārdnīcās
  let inOtherDictionaries;
  if (!slugToSearch.includes(' ')) {
    inOtherDictionaries = await lookupWordInOtherDictionaries(slugToSearch);
  }

  return { words: wordEntries, mwes: mweEntries, senses: senseEntries, inOtherDictionaries };
}

const searchForEditor = async (req, res, next) => {

  try {
    const startTime = new Date();

    let cache = req.app.locals.dbcache;
    cache.dropRelease();

    const entrySlug = (req.params.entryslug || '').trim();
    debug('searchForEditor entry slug=%s', entrySlug);
    if (!entrySlug) {
      res.render('not-found', {data: {query: entrySlug}})
      return;
    }

    if (config.app_mode === config.APP_MODE.PUBLIC) {
      // await reportMissingSlug(req.app, entrySlug);
      reportMissingSlug(req.app, entrySlug);
    }

    let slugToSearch = entrySlug.includes(':') ? entrySlug.slice(0, entrySlug.indexOf(':')) : entrySlug;
    let mode = SearchMode.auto;

    if (entrySlug.startsWith('*')) {
      if (entrySlug.endsWith('*')) {
        mode = SearchMode.infix;
        slugToSearch = entrySlug.slice(1, entrySlug.length - 1);
      } else {
        mode = SearchMode.suffix;
        slugToSearch = entrySlug.slice(1);
      }
    } else if (entrySlug.endsWith('*')) {
      mode = SearchMode.prefix;
      slugToSearch = entrySlug.slice(0, entrySlug.length - 1);
    }

    const hits = await lookupCandidateEntries(req.app, slugToSearch, mode);
    // res.render('search', { hits, entrySlug });

    const r = {
      entrySlug: slugToSearch,
      hits,
      titlePrefix: entrySlug,
      beforeRender: markdownDecoder,
    }

    const time2 = new Date();
    const duration = time2 - startTime;

    // debug(`Search list build time: ${duration} ms; cache size: ${req.app.locals.dbcache.entryMap.size}`);
    debug(`Search list build time: ${duration} ms`);

    r.msExtras = duration;

    res.render('search', r);
    return;

  } catch (err) {
    console.error(err);
  }
}

const searchForSense = async (req, res, next) => {
  const entrySlug = req.params.entryslug;
  const senseNo = req.params.sense_no;

  const db = req.app.get('db');
  // FIXME string senseNo te nokauj sistēmu
  let sense = await db.query(`
    select * from dict.senses s
    join dict.entries e on e.id=s.entry_id
    where s.order_no=$1
    and s.parent_sense_id is null
    and e.heading=$2
    and e.homonym_no=1
  `,[
    senseNo,
    entrySlug
  ]);

  sense = sense.length === 1 ? sense[0] : null;

  res.render('info', {sense, error: sense === null});
};

router.get('/_search/:entryslug', searchForEditor);
router.get('/_search/:entryslug/:sense_no', searchForSense);

module.exports = router;
