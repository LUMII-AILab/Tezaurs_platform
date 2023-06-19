const debug = require('debug')('entry:for-editor');
// const express = require('express');
// const router = express.Router();

// var app = express();

// const { fetchCorporaExamples, fetchInflections } = require('../util/api-utils');

const { loadFullEntry } = require('../util/entrybuilder');
const { 
  syntaxHighlight, 
  markdownDecoder, 
  preparePronunciations, 
  prepareInflection,
  soundex, 
  asciify, 
  levenshtein_distance 
} = require('../util/misc-utils');

const { 
  relationForLexemeType, 
  isPrimaryEntry, 
  prepareSimilars, 
  relationForSearchWordType 
} = require('./entry-common');

const verbalizer = require('../util/flag-verbalizer');
const { lookupWordInOtherDictionaries } = require('../util/inOtherDictionaries');


const CORPORA_EXAMPLES_LIMIT = 7;
const PREV_NEXT_ENTRIES_COUNT = 7;

const lookupPrevNextEntries = async (req, baseEntry) => {
  const db = req.app.get('db');
  const dbschema = req.app.get('dbschema');
  const dataconn = db[dbschema];

  // const typesToInspect = baseEntry.type_id === 4 ? 4 : [1, 5];
  const typesToInspect = baseEntry.type_id;

  // TODO: tekošā vārda homonīmi paliek ārpus prev/next

  let prev = await dataconn.entries.find(
    {
      type_id: typesToInspect,
      'heading <': baseEntry.heading,
      // hidden: false,
    },
    {
      order: [{
        field: 'heading',
        direction: 'desc',
      }, {
        field: 'human_key',
        direction: 'desc',
      }],
      limit: PREV_NEXT_ENTRIES_COUNT * 3,
    }
  );
  if (typesToInspect !== 4) {
    let temp = [];
    let lastHeading = null;
    for (let e of prev) {
      if (e.heading !== lastHeading) {
        temp.push(e);
        lastHeading = e.heading;
      }
    }
    // console.log(prev.length, temp.length);
    prev = temp;
  }
  prev = prev.slice(0, PREV_NEXT_ENTRIES_COUNT);
  prev.reverse();

  let next = await dataconn.entries.find(
    {
      type_id: typesToInspect,
      'heading >': baseEntry.heading,
    },
    {
      order: [{
        field: 'heading',
        direction: 'asc',
      }, {
        field: 'human_key',
        direction: 'asc',
      }],
      limit: PREV_NEXT_ENTRIES_COUNT * 3,
    }
  );
  if (typesToInspect !== 4) {
    let temp = [];
    let lastHeading = null;
    for (let e of next) {
      if (e.heading !== lastHeading) {
        temp.push(e);
        lastHeading = e.heading;
      }
    }
    // console.log(next.length, temp.length);
    next = temp;
  }
  next = next.slice(0, PREV_NEXT_ENTRIES_COUNT);

  return [ prev, next ];
}

const findSimilarsImpl = async (req, baseWord, keysAdded, includeSoundex = false) => {
  const db = req.app.get('db');
  const dbschema = req.app.get('dbschema');
  const dataconn = db[dbschema];

  let similarEntries = [];

  debug(`Meklējam līdzīgos ar ${baseWord}`);
/*
  let slugList = [
    baseWord,
    baseWord.toLowerCase(),
    asciify(baseWord),
    soundex(baseWord),
  ];
  let allHits = await dataconn.search_words.join({
    'dict.entries': {
      type: 'INNER',
      on: { id: 'entry_id' }
    }
  }).find({
    word: slugList,
  });
  debug(`found ${allHits.length} hits in search_words`);
*/

  let inOtherLexemes = await dataconn.lexemes.join({
    'dict.entries': {
      type: 'INNER',
      on: { id: 'entry_id' }
    }
  }).find({
    lemma: baseWord,
  });
  debug(`  atrasti ${inOtherLexemes.length} citās leksēmās: ${inOtherLexemes.map(x => x.entries[0].human_key)}`);
  for (let r of inOtherLexemes) {
    if (keysAdded.has(r.entries[0].human_key)) continue;
    similarEntries.push({
      entry: r.entries[0],
      relation_type: r.type_id,
      relation: relationForLexemeType(r.type_id),
    });
    keysAdded.add(r.entries[0].human_key);
  }

  let inInflections = await dataconn.search_words.join({
    'dict.entries': {
      type: 'INNER',
      on: { id: 'entry_id' }
    }
  }).find({
    word: baseWord,
    inflected: true,
  });
  debug(`  atrasti ${inInflections.length} locījumos: ${inInflections.map(x => x.entries[0].human_key)}`);
  for (let r of inInflections) {
    if (keysAdded.has(r.entries[0].human_key)) continue;
    // similarEntries.push({ entry: r.entries[0], relation: 'vārdforma no' });
    similarEntries.push({ entry: r.entries[0], relation: relationForSearchWordType(r) });
    keysAdded.add(r.entries[0].human_key);
  }

  // let differentCase = await dataconn.entries.find({
  //   'heading ilike': `${baseWord.toLowerCase()}`,
  // });
  // for (let e of differentCase) {
  //   if (keysAdded.has(e.human_key)) continue;
  //   similarEntries.push({ entry: e, relation: 'cits burtu lielums:'});
  //   keysAdded.add(e.human_key);
  // }

  let differentCase = await dataconn.search_words.join({
    'dict.entries': {
      type: 'INNER',
      on: { id: 'entry_id' }
    }
  }).find({
    word: baseWord.toLowerCase(),
    word_type_id: 7,
  });
  for (let r of differentCase) {
    if (keysAdded.has(r.entries[0].human_key)) continue;
    if (baseWord === r.original) continue;
    similarEntries.push({ entry: r.entries[0], relation: relationForSearchWordType(r) });
    keysAdded.add(r.entries[0].human_key);
  }
  debug(`  atrasti ${differentCase.length} diff.case, meklējot ${baseWord.toLowerCase()}: ${differentCase.map(x => x.entries[0].human_key)}`);

  if (baseWord !== asciify(baseWord)) {
    let inAsciify = await dataconn.search_words.join({
      'dict.entries': {
        type: 'INNER',
        on: { id: 'entry_id' }
      }
    }).find({
      word: asciify(baseWord),
      word_type_id: 6,
    });
    debug(`  atrasti ${inAsciify.length} asciify, meklējot ${asciify(baseWord)}: ${inAsciify.map(x => x.entries[0].human_key)}`);
    for (let r of inAsciify) {
      if (keysAdded.has(r.entries[0].human_key)) continue;
      // similarEntries.push({ entry: r.entries[0], relation: 'līdzīgi rakstīts kā ' });
      similarEntries.push({ entry: r.entries[0], relation: relationForSearchWordType(r) });
      keysAdded.add(r.entries[0].human_key);
    }
  }

  let inGuessedDerivatives = await dataconn.search_words.join({
    'dict.entries': {
      type: 'INNER',
      on: { id: 'entry_id' }
    }
  }).find({
    word: baseWord,
    word_type_id: 5,
  });
  debug(`  atrasti ${inGuessedDerivatives.length} "atvasinājumi", meklējot ${baseWord} atvasinājumus: ${inGuessedDerivatives.map(x => x.entries[0].human_key)}`);
  for (let r of inGuessedDerivatives) {
    if (keysAdded.has(r.entries[0].human_key)) continue;
    similarEntries.push({ entry: r.entries[0], relation: relationForSearchWordType(r) });
    keysAdded.add(r.entries[0].human_key);
  }

  // if (similarEntries.length > 0) return similarEntries;

  if (!includeSoundex) return similarEntries;
  // if (!includeSoundex) return [];

  debug('meklējam pa soundex');
  let inSoundex = await dataconn.search_words.join({
    'dict.entries': {
      type: 'INNER',
      on: { id: 'entry_id' }
    }
  }).find({
    // word: `'${soundex(baseWord)}'`,
    word: soundex(baseWord),
    word_type_id: 4,
  });
  debug(`  atrasti ${inSoundex.length} ar soundex: ${inSoundex.map(x => x.entries[0].human_key)}`);
  for (let r of inSoundex) {
    if (keysAdded.has(r.entries[0].human_key)) continue;
    if (levenshtein_distance(baseWord, r.original) > 2) continue;
    // similarEntries.push({ entry: r.entries[0], relation: 'līdzīgi skanošs kā ' });
    similarEntries.push({ entry: r.entries[0], relation: relationForSearchWordType(r) });
    keysAdded.add(r.entries[0].human_key);
  }

  // TODO: pielikt vēl citu veidu līdzīgos (levenshtein, etc.)

  return similarEntries;
}

const findSimilars = async (req, baseWord, keysAdded) => {
  debug(`Looking for similars for ${baseWord}`);
  let similars = await findSimilarsImpl(req, baseWord, keysAdded, true);
  prepareSimilars(similars);
  debug(`  ${similars.length} similars found and prepared`);
  return similars;
}

const lookupEntriesColdImpl = async (req, entrySlug) => {
  const db = req.app.get('db');
  const dbschema = req.app.get('dbschema');
  const dataconn = db[dbschema];

  let entries = [];
  let homonymEntries = [];
  let similarEntries = [];

  let baseWord;

  let keysAdded = new Set();

  let human_key_hit = await dataconn.entries.findOne({
    human_key: entrySlug
  });

  if (human_key_hit) {

    entries = [ human_key_hit ];

    if (!isPrimaryEntry(human_key_hit)) {
      return [entries, [], []];
    }

    baseWord = human_key_hit.heading;
    keysAdded.add(human_key_hit.human_key);

    homonymEntries = await dataconn.entries.find({
      heading : baseWord,
    }, {
      order: [
        { field: 'human_key', direction: 'asc' },
      ],
    });
    homonymEntries.forEach(x => keysAdded.add(x.human_key));

    similarEntries = await findSimilars(req, baseWord, keysAdded);

    return [entries, homonymEntries, similarEntries];
  }

  // entrySlug nav human_key
  homonymEntries = await dataconn.entries.find({
    heading: entrySlug,
  }, {
      order: [
        { field: 'human_key', direction: 'asc' },
      ],
  });

  if (homonymEntries.length > 0) {
    entries = [ homonymEntries[0] ];
    homonymEntries.forEach(x => keysAdded.add(x.human_key));
  }

  similarEntries = await findSimilars(req, entrySlug, keysAdded, true);
  return [entries, homonymEntries, similarEntries];
}

const lookupEntriesCold = async (req, entrySlug) => {

  if (!entrySlug) {
    return [[], [], []];
  }

  debug(`looking up for slug "${entrySlug}"`);

  let result = await lookupEntriesColdImpl(req, entrySlug);

  debug(`direct hits:  ${result[0].length}`, result[0].map(x => x.human_key));
  debug(`homonym hits: ${result[1].length}`, result[1].map(x => x.human_key));
  debug(`similar hits: ${result[2].length}`, result[2].map(x => x.entry.human_key));

  return result;
}

const getWordnetData = async (app, heading, senses) => {
  let db = app.get('db');
  let dbschema = app.get('dbschema');

  let in_list = (await db[dbschema].wordnet_entries.count({entry: heading, in_top: true})) === '1';
  let in_synsets = senses
    .concat(senses.flatMap(s => s.subSenses || []))
    .filter(s => s.synset_id)
    .map(s => (s.parent_order_no ? `${s.parent_order_no}.`: '') + `${s.order_no}`);

  return in_list || in_synsets.length > 0 ? {in_list, in_synsets} : null;
};

const getForEditor = async (req, res, next) => {

  try {
    const entry_slug = req.params.entry_slug;
    const sense_tag = req.params.sense_tag; // TODO: kur šo izmantojam?

    let hilite = req.query.hilite;
    // if (hilite) {
    //   console.log('hilite detected:', hilite);
    //   if (/^\w:\d+/.test(hilite)) {
    //     hilite = { what: hilite.slice(0,1), id: Number.parseInt(hilite.slice(2)) }
    //   } else {
    //     hilite = undefined;
    //   }
    // }

    console.log(entry_slug, sense_tag ? `(sense tag: ${sense_tag})` : '');
    debug('getForEditor entry slug "%s" sense_tag "%s"', entry_slug, sense_tag);

    if (!entry_slug || entry_slug.trim() === '') {
      res.render('not-found', {data: {query: entry_slug}})
      return;
    }

    const startTime = new Date();

    let cache = req.app.locals.dbcache;
    cache.dropRelease();

    let [ entriesFound, homonymEntries, similarEntries ] = await lookupEntriesCold(req, entry_slug);

    // debug('will show: ', entriesFound, homonymEntries, similarEntries);

    if (entriesFound.length === 0 && similarEntries.length === 0) {
      // res.send('nekas nav atrasts ...')
      // res.render('not-found', {data: {query: entryslug}});
      res.redirect(`/_search/${encodeURIComponent(entry_slug).replace('%3A', ':')}`);
      return;
    }

    // ja tiešu trāpījumu nav, bet ir tieši 1 līdzīgs, tad atveram to
    if (entriesFound.length === 0 && similarEntries.length === 1) {
      // entriesFound = [ similarEntries[0].entry ];
      // similarEntries = [];

      if (similarEntries[0].relation_type === 4) {
        // automātiski pārejam tikai no atvasinājuma uz atvasināto
        res.redirect(`/${encodeURIComponent(similarEntries[0].entry.human_key).replace('%3A', ':')}`);
        return;
      }
    }

    let previousEntries, nextEntries;
    if (entriesFound.length > 0) {
      [ previousEntries, nextEntries ] = await lookupPrevNextEntries(req, entriesFound[0]);
    }

    let fullEntries = [];
    for (let e of entriesFound) {
      let fullEntry = await loadFullEntry(req, e.id, true);

      if (previousEntries) fullEntry.prev = previousEntries;
      if (nextEntries) fullEntry.next = nextEntries;

      fullEntry.wordnet_data = await getWordnetData(req.app, fullEntry.heading, fullEntry.senses);

      fullEntries.push(fullEntry);
    }

    let entryWord = fullEntries.length > 0 ? fullEntries[0].primaryLexeme.lemma : '';

    const r = {
      pattern: entry_slug,
      // entry: fullEntry,
      // entry: fullEntries[0],
      entriesToShow: fullEntries,
      homonymEntries,
      numSimilarEntries: similarEntries.length, //MM//
      similarEntries: similarEntries.slice(0, 100), //MM//
      // previousEntries,
      // nextEntries,
      entryWord,
      // titlePrefix: fullEntry.human_key,
      titlePrefix: entry_slug,
      beforeRender: markdownDecoder,
      preparePronunciations,
      prepareInflection,
      // entry: e1,
      // primary_lexeme,
      // senses,
      // lexemes,
      // source_links,
      // outgoing_entry_relations,
      // incoming_entry_relations,
      v: verbalizer,
      has_siblings: () => true,
      inOtherDictionaries: await lookupWordInOtherDictionaries(entry_slug),
      hilite,
    }

    const time2 = new Date();
    const duration = time2 - startTime;

    // debug(`Entry build time: ${duration} ms; cache size: ${req.app.locals.dbcache.entryMap.size}`);
    debug(`Entry build time: ${duration} ms`);
    // console.log(JSON.stringify(fullEntry, null, 2));

    r.msEntry = duration;

    // console.log('entry for rendering:', JSON.stringify(fullEntry));

    // let json = JSON.stringify(r, null, 2).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace('\n', '<br/>');

    // let jsonColored = syntaxHighlight(JSON.stringify(r, null, 2), false);

    // redaktorrīkā nav jārāda korpusa piemēri
/*
    let entryExamples = await fetchCorporaExamples(entryWord);
    r.corporaExamples = entryExamples.slice(0, CORPORA_EXAMPLES_LIMIT);
*/
    r.msExtras = (new Date()) - time2;

    // const editorUrl = config.EDITOR_URL + fullEntries[0].id;  // deprecated

    // res.send(`<pre>${json}</pre>`);
    // res.render('entry', {data: r, json})
    // res.render('entry', {...r, jsonColored, editorUrl });
    // res.render('entry', {...r, jsonColored });
    if (req.query.content) {
      res.render('includes/entry-content', r, (err, html) => {
        res.send({
          body: err || html,
          entry: fullEntries.length > 0 ? fullEntries[0] : null
        })
      });
    } else {
      res.status(200).render('entry', r);
    }
    return;

  } catch (err) {
    console.error(err);
  }

  // res.render('model', {title: `Modelis ${model}`, model: model, tweetCounts: tweetCountsPerTopic, topWords: topWordsInTopics});
  // res.send(JSON.stringify(topWordsInTopics));

  // next();
}

/* GET entry */
// router.get('/w/:entryslug', async (req, res, next) => {
// router.get('/mlvv/:entryslug', async (req, res, next) => { 
// router.get('/:entryslug', getForEditor);
//
// module.exports = router;
module.exports = getForEditor
