const debug = require('debug')('entry:for-viewer');
const col = require('ansi-colors');

// const { fetchCorporaExamples, fetchInflections } = require('../util/api-utils');

// const { loadFullEntry } = require('../util/entrybuilder');
const { 
  syntaxHighlight, 
  markdownDecoder, 
  preparePronunciations, 
  prepareInflection,
  prettifyString, 
  soundex, 
  asciify, 
  levenshtein_distance 
} = require('../util/misc-utils');

const { 
  relationForLexemeType, 
  isPrimaryEntry, 
  prepareSimilars, 
  relationForSearchWordType, 
  relationForLDHit 
} = require('./entry-common');

// const { buildMorphoTable } = require('../util/morpho-utils');
const { linkifyGloss } = require('../util/linkifier');
const { reportHit } = require('../util/stats');
const { lookupWordInOtherDictionaries } = require('../util/inOtherDictionaries');

const verbalizer = require('../util/flag-verbalizer');

const findSimilarsImpl = async (dataconn, cache, baseWord, keysAdded, includeHeuristics) => {
  let similarEntries = [];

  debug(`Meklējam līdzīgos ar ${baseWord}, heuristics = ${includeHeuristics}`);

  // let differentCase = await dataconn.entries.find({
  //   'heading ilike': `${baseWord.toLowerCase()}`,
  // });
  // for (let e of differentCase) {
  //   if (keysAdded.has(e.human_key)) continue;
  //   similarEntries.push({ entry: e, relation: 'cits burtu lielums:'});
  //   keysAdded.add(e.human_key);
  // }

  // let inOtherLexemes = await dataconn.lexemes.join({
  //   'dict.entries': {
  //     type: 'INNER',
  //     on: { id: 'entry_id' }
  //   }
  // }).find({
  //   lemma: baseWord,
  // });
  // for (let r of inOtherLexemes) {
  //   if (!keysAdded.has(r.entries[0].human_key)) {
  //     similarEntries.push({ entry: r.entries[0], relation: relationForLexemeType(r.type_id)});
  //     keysAdded.add(r.entries[0].human_key);
  //   }
  // }

  let baseWordLowerCase = baseWord.toLowerCase();
/*
  for (let e of cache.entriesById.values()) {
    if (e.heading.toLowerCase() === baseWordLowerCase) {
      if (keysAdded.has(e.human_key)) continue;
      similarEntries.push({ entry: e, relation: 'cits burtu lielums:'});
      keysAdded.add(e.human_key);
    }
    for (let l of e.lexemes) {
      if (l.lemma === baseWord) {
        if (!keysAdded.has(e.human_key)) {
          similarEntries.push({
            entry: e,
            relation_type: l.type_id,
            relation: relationForLexemeType(l.type_id),
          });
          keysAdded.add(e.human_key);
        }
      }
    }
  }
  debug(`  atrasti ${keysAdded.size} ar citu burtu lielumu un leksēmās`);
*/
  let inOtherLexemes = cache.lexemesByLemma.get(baseWord) || [];
  debug(`  atrasti ${inOtherLexemes.length} citās leksēmās: ${inOtherLexemes.map(x => x.lemma)}`);
  for (let l of inOtherLexemes) {
    let e = cache.entriesById.get(l.entry_id);
    if (keysAdded.has(e.human_key)) continue;
    similarEntries.push({
      entry: e,
      relation_type: l.type_id,
      relation: relationForLexemeType(l.type_id),
    });
    keysAdded.add(e.human_key);
  }

  // let differentCase = cache.entriesByHeading.get(baseWordLowerCase) || [];
  let differentCase = [].concat(
    cache.entriesByHeading.get(baseWordLowerCase) || [],
    cache.entriesByHeadingInLowerCase.get(baseWordLowerCase) || [],
  );
  debug(`  atrasti ${differentCase.length} ar citu burtu lielumu: ${differentCase.map(x => x.human_key)}`);
  for (let e of differentCase) {
    if (baseWord === e.heading) continue;
    if (keysAdded.has(e.human_key)) continue;
    similarEntries.push({ entry: e, relation: 'cits burtu lielums:'});
    keysAdded.add(e.human_key);
  }

  let inInflections = await dataconn.search_words.join({
    'dict.entries': {
      type: 'INNER',
      on: { id: 'entry_id' }
    }
  }).find({
    // word: `'${baseWord}'`,
    word: baseWord,
    inflected: true,
  });
  debug(`  atrasti ${inInflections.length}, meklējot ${baseWord}: ${inInflections.map(x => x.entries[0].human_key)}`);
  for (let r of inInflections) {
    if (keysAdded.has(r.entries[0].human_key)) continue;
    // similarEntries.push({ entry: r.entries[0], relation: 'vārdforma no' });
    similarEntries.push({ entry: r.entries[0], relation: relationForSearchWordType(r) });
    keysAdded.add(r.entries[0].human_key);
  }

  if (similarEntries.length > 0) return similarEntries;
  if (!includeHeuristics) {
    debug('heiristiski nemeklējam');
    return [];
  }

  if (baseWord !== asciify(baseWord)) {
    let inAsciify = await dataconn.search_words.join({
      'dict.entries': {
        type: 'INNER',
        on: { id: 'entry_id' }
      }
    }).find({
      // word: `'${asciify(baseWord)}'`,
      word: asciify(baseWord),
      word_type_id: 6,
    });
    debug(`  atrasti ${inAsciify.length}, meklējot ${asciify(baseWord)}: ${inAsciify.map(x => x.entries[0].human_key)}`);
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
    // word: `'${baseWord}'`,
    word: baseWord,
    word_type_id: 5,
  });
  debug(`  atrasti ${inGuessedDerivatives.length}, meklējot ${baseWord} atvasinājumus: ${inGuessedDerivatives.map(x => x.entries[0].human_key)}`);
  for (let r of inGuessedDerivatives) {
    if (keysAdded.has(r.entries[0].human_key)) continue;
    similarEntries.push({ entry: r.entries[0], relation: relationForSearchWordType(r) });
    keysAdded.add(r.entries[0].human_key);
  }

  let ld_words = cache.ws.get_similar_words(baseWord);
  debug(`  atrasti ${ld_words.length}, meklējot LD1 no ${baseWord}: ${ld_words.map(x => x[0])}`);
  for (let x of ld_words) {
    let [word, ldCode] = x;
    for (let e of cache.entriesByHeading.get(word) || []) {
      if (keysAdded.has(e.human_key)) continue;
      similarEntries.push({ entry: e, relation: relationForLDHit(ldCode) });
      keysAdded.add(e.human_key);
    }
    for (let lex of cache.lexemesByLemma.get(word) || []) {
      let e = cache.entriesById.get(lex.entry_id);
      if (keysAdded.has(e.human_key)) continue;
      similarEntries.push({ entry: e, relation: relationForLDHit(ldCode) });
      keysAdded.add(e.human_key);
    }
  }

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

  // TODO: pielikt vēl kādu citu veidu līdzīgos

  return similarEntries;
}

const findSimilars = async (dataconn, cache, baseWord, keysAdded, includeHeuristics = false) => {
  debug(`Looking for similars for ${baseWord}`);
  let similars = await findSimilarsImpl(dataconn, cache, baseWord, keysAdded, includeHeuristics);
  prepareSimilars(similars);
  debug(`  ${similars.length} similars found and prepared`);
  return similars;
}

const lookupEntriesCacheImpl = async (app, entrySlug) => {
  const db = app.get('db');
  const dbschema = app.get('dbschema');
  const dataconn = db[dbschema];
  const cache = app.locals.dbcache;

  let entries = [];
  let homonymEntries = [];
  let similarEntries = [];

  let baseWord;

  let keysAdded = new Set();

  // let human_key_hit = await dataconn.entries.findOne({
  //   human_key: entrySlug
  // });
  let human_key_hit = cache.entriesByHK.get(entrySlug);

  if (human_key_hit) {

    entries = [ human_key_hit ];

    if (!isPrimaryEntry(human_key_hit)) {
      return [entries, [], []];
    }

    baseWord = human_key_hit.heading;
    keysAdded.add(human_key_hit.human_key);

    // homonymEntries = await dataconn.entries.find({
    //   heading : baseWord,
    // });
    homonymEntries = cache.entriesByHeading.get(baseWord) || [];
    homonymEntries.forEach(x => keysAdded.add(x.human_key));

    similarEntries = await findSimilars(dataconn, cache, baseWord, keysAdded);

    return [entries, homonymEntries, similarEntries];
  }

  // entrySlug nav human_key
  // homonymEntries = await dataconn.entries.find({
  //   heading: entrySlug,
  // });
  homonymEntries = cache.entriesByHeading.get(entrySlug) || [];

  if (homonymEntries.length > 0) {
    entries = [ homonymEntries[0] ];
    homonymEntries.forEach(x => keysAdded.add(x.human_key));
  }

  similarEntries = await findSimilars(dataconn, cache, entrySlug, keysAdded);
  return [entries, homonymEntries, similarEntries];
}

const lookupEntriesPrecalculatedImpl = async (app, entrySlug) => {
  const db = app.get('db');
  const dbschema = app.get('dbschema');
  const dataconn = db[dbschema];
  const cache = app.locals.dbcache;

  let entries = [];
  let homonymEntries = [];
  let similarEntries = [];

  let baseWord;

  let keysAdded = new Set();

  let human_key_from_cache = cache.entriesByHK.get(entrySlug);
  if (human_key_from_cache) {
    debug('atradu atbilstošu human_key', entrySlug, human_key_from_cache.id);
    let entry_hit = await dataconn.full_entries.findOne({ entry_id: human_key_from_cache.id });
    if (entry_hit) {
      debug('atradu atbilstošo pilno šķirkli');
      entry_hit = entry_hit.data;
      // await reportHit(app, entry_hit.id);
      reportHit(app, entry_hit.id);

      entries = [ entry_hit ];

      if (!isPrimaryEntry(entry_hit)) {
        return [entries, [], []];
      }

      baseWord = entry_hit.heading;
      keysAdded.add(entry_hit.human_key);

      // homonymEntries = await dataconn.entries.find({
      //   heading : baseWord,
      // });
      homonymEntries = cache.entriesByHeading.get(baseWord) || [];
      homonymEntries.sort((a, b) => a.human_key.localeCompare(b.human_key, 'lv'));
      homonymEntries.forEach(x => keysAdded.add(x.human_key));

      similarEntries = await findSimilars(dataconn, cache, baseWord, keysAdded);

      return [ entries, homonymEntries, similarEntries ];
    } else {
      // te nevajadzētu nonākt
    }
  } else {
    debug('neatradu atbilstošu human_key', entrySlug);
  }

  // entrySlug nav human_key

  // -- aprisinājums sliktiem MWE --
  if (entrySlug.includes(' ')) {
    let mwe_hits_from_cache = cache.entriesByHeading.get(entrySlug);
    if (!mwe_hits_from_cache) {
      mwe_hits_from_cache = cache.entriesByHeadingInLowerCase.get(entrySlug.toLowerCase());
    }
    if (mwe_hits_from_cache) {
      let mwe_hit = await dataconn.full_entries.findOne({ entry_id: mwe_hits_from_cache[0].id });
      if (mwe_hit) {
        mwe_hit = mwe_hit.data;
        // await reportHit(app, mwe_hit.id);
        reportHit(app, mwe_hit.id);

        entries = [ mwe_hit ];
        if (mwe_hits_from_cache.length > 1) {
          homonymEntries = mwe_hits_from_cache;
          homonymEntries.sort((a, b) => a.human_key.localeCompare(b.human_key, 'lv'));
        }
        return [ entries, homonymEntries, [] ];
      }
    }
  }
  // -- aprisinājuma sliktiem MWE beigas --

  homonymEntries = cache.entriesByHeading.get(entrySlug) || [];
  // homonymEntries = homonymEntries.map(x => x.data);

  if (homonymEntries.length > 0) {
    debug(`atradu ${homonymEntries.length} ${entrySlug} homonīmus`);
    let firstEntry = await dataconn.full_entries.findOne({ entry_id: homonymEntries[0].id });
    entries = [ firstEntry.data ];
    // await reportHit(app, firstEntry.data.id);
    reportHit(app, firstEntry.data.id);

    homonymEntries.forEach(x => keysAdded.add(x.human_key));
  }

  similarEntries = await findSimilars(dataconn, cache, entrySlug, keysAdded, homonymEntries.length === 0);
  return [entries, homonymEntries, similarEntries];
}

const lookupEntries = async (app, entrySlug) => {

  if (!entrySlug) {
    return [[], [], []];
  }

  const start = new Date();
  debug(`looking up for slug "${entrySlug}"`);

  // let result = await lookupEntriesCacheImpl(app, entrySlug);
  let result = await lookupEntriesPrecalculatedImpl(app, entrySlug);

  debug(`direct hits:  ${result[0].length}`, result[0].map(x => x.human_key));
  debug(`homonym hits: ${result[1].length}`, result[1].map(x => x.human_key));
  debug(`similar hits: ${result[2].length}`, result[2].map(x => x.entry.human_key));

  debug(`lookupEntries: ${new Date() - start} ms`);

  return result;
}

const getForViewer = async (req, res, next) => {
  try {
    const entry_slug = req.params.entry_slug;
    const sense_tag = req.params.sense_tag; // TODO: kur šo izmantojam?

    console.log(col.yellow(entry_slug), sense_tag || '');
    debug('getForViewer entry slug "%s" sense_tag "%s"', entry_slug, sense_tag);

    if (!entry_slug || entry_slug.trim() === '') {
      res.render('not-found', {data: {query: entry_slug}})
      return;
    }

    const startTime = new Date();

    let cache = req.app.locals.dbcache;

    let [ entriesFound, homonymEntries, similarEntries ] = await lookupEntries(req.app, entry_slug);

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

    const time2 = new Date();
    const duration = time2 - startTime;

    let entryWord = entriesFound.length > 0 ? entriesFound[0].primaryLexeme.lemma : '';

    if (entriesFound.length > 0) {
      for (let e of entriesFound) {
        if (!e.senses) continue;
        for (let s of e.senses) {
          if (s.gloss) {
            s.gloss = prettifyString(s.gloss);
            s.linkifiedGloss = linkifyGloss(cache, s.gloss);
          }
          if (s.subSenses) {
            for (let ss of s.subSenses) {
              if (!ss.gloss) continue;
              ss.gloss = prettifyString(ss.gloss);
              ss.linkifiedGloss = linkifyGloss(cache, ss.gloss);
            }
          }
        }
      }
    }

    let titlePrefix = entry_slug;
    let entryDescription = null;
    if (entriesFound.length > 0) {
      titlePrefix = entriesFound[0].heading;
      if (entriesFound[0].senses.length > 0) {
        entryDescription = entriesFound[0].senses[0].gloss;
      }
    }

    const r = {
      pattern: entry_slug,
      // entry: fullEntry,
      // entry: fullEntries[0],
      entriesToShow: entriesFound,
      homonymEntries,
      numSimilarEntries: similarEntries.length, //MM//
      similarEntries: similarEntries.slice(0, 100), //MM//
      // previousEntries,
      // nextEntries,
      entryWord,
      // titlePrefix: fullEntry.human_key,
      // titlePrefix: entry_slug,
      titlePrefix,
      entryDescription,
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
      has_siblings: heading => cache.entryHasSiblings(heading),
      inOtherDictionaries: await lookupWordInOtherDictionaries(entry_slug),
    }

    // debug(`Entry build time: ${duration} ms; cache size: ${req.app.locals.dbcache.entryMap.size}`);
    debug(`Entry build time: ${duration} ms`);
    // console.log(JSON.stringify(fullEntry, null, 2));

    r.msEntry = duration;

    // console.log('entry for rendering:', JSON.stringify(fullEntry));

    // let json = JSON.stringify(r, null, 2).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace('\n', '<br/>');

    // let jsonColored = syntaxHighlight(JSON.stringify(r, null, 2), false);

    // let entryExamples = await fetchCorporaExamples(entryWord);
    // r.corporaExamples = entryExamples.slice(0, CORPORA_EXAMPLES_LIMIT);

    r.msExtras = (new Date()) - time2;

    res.status(200).render('entry', r);
    return;

  } catch (err) {
    console.error(err);
  }

  // next();
}

module.exports = getForViewer
