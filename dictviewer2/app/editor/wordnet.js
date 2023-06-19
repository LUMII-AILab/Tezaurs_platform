const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');
const jsdom = require('jsdom');
const config = require('../config');
const { getUpdate } = require('./model');
const debug = require('debug')('wordnet');
const verbalizer = require('../util/flag-verbalizer');
const WordPOS = require('wordpos'),
  wordpos = new WordPOS({dictPath: require('path').join(__dirname, 'data/dict_3.0')});
const generated_links = require('./data/generated_links.json');

const schema = config.DB_SCHEMA;
const dbconn = config.dbconn;

const KORPUSS_SKETCH_ENGINE_API = 'http://nosketch.korpuss.lv/bonito/run.cgi';
const LNB_SKETCH_ENGINE_API = 'https://nosketch.lnb.lv/bonito/run.cgi';

const OMW_LINK = 'http://compling.hss.ntu.edu.sg/omw/cgi-bin/wn-gridx.cgi?synset=';

const pos_map = {
  'n': 'n',
  'v': 'v',
  'a': 'adj',
  's': 'adj',
  'r': 'adv',
};

const pwn_relation_map = {
  'eq_has_hyperonym': 'LV šāuraka nozīme',
  'eq_has_hyponym': 'LV plašāka nozīme',
};

function getServerUrlForCorpus(corpname) {
  switch(corpname) {
    case 'karogs':
    case 'sieviesu_isproza':
      return LNB_SKETCH_ENGINE_API;
    default:
      return KORPUSS_SKETCH_ENGINE_API;
    }
}

/**
 * Get concordance examples from corpora
 * @param params
 * @returns {Promise<*>}
 */
async function getExamplesFromSketchEngine(params) {
  const corpname = params.corpname;
  const url = getServerUrlForCorpus(corpname) + '/view?';

  return axios
    .get(url, {params: params})
    .then((r) => r.data)
    .catch((e) => console.log(e))
}

/**
 * Update an entry (change fields that are provided).
 * @param withTx
 * @param wordnet_entry_id
 * @param changed_data
 * @returns {Promise<*>}
 */
async function updateEntry(withTx, wordnet_entry_id, changed_data) {
  return await withTx(async tx => {
    let wordnet_entry = await tx[schema].wordnet_entries.findOne({id: wordnet_entry_id});
    for (const [k, v] of Object.entries(changed_data)) {
      wordnet_entry[k] = v;
    }
    return await tx[schema].wordnet_entries.save(wordnet_entry);
  });
}

/**
 * Create a wordnet comment for non-wordnet words
 * Consequence: also creates a new wordnet_entry
 * @param withTx
 * @param entry_id
 * @param comments
 * @returns {Promise<*>}
 */
async function addWordnetComments(withTx, entry_id, comments) {
  return await withTx(async tx => {
    let entry = await tx[schema].entries.findOne({id: entry_id});
    return await tx[schema].wordnet_entries.insert({
      entry: entry.heading,
      comments: comments,
      in_top: false
    });
  });
}

/**
 * Create a wordnet entry for a word that was not in the top X most popular words.
 * This wordnet_entry won't have a number (no).
 * @param withTx
 * @param entry
 * @returns {Promise<*>}
 */
async function createWordnetEntry(withTx, entry) {
  return await withTx(async tx => {
    return await tx[schema].wordnet_entries.insert({
      entry: entry,
      in_top: true
    });
  });
}

/**
 * Save sentence with a wrongly tagged word in sketch engine data.
 * Later these mistakes are used in training.
 * @param withTx
 * @param data
 * @returns {Promise<*>}
 */
async function saveSketchEngineError(withTx, data) {
  return await withTx(async tx => {
    let error = await tx[schema].sketch_engine_errors.findOne({token_num: data.token_num});
    if (!error) {
      return await tx[schema].sketch_engine_errors.save(data);
    } else { // not an error: a mistake
      await tx[schema].sketch_engine_errors.destroy({id: error.id});
    }
  });
}

/**
 * Get a list of wrongly tagged sentences.
 * @param withTx
 * @param tokenNums
 * @returns {Promise<*>}
 */
async function getSketchEngineErrors(withTx, tokenNums) {
  return await withTx(async tx => {
    let errors = await tx[schema].sketch_engine_errors.find({token_num: tokenNums});
    return {errors: errors ? errors.map(e => e.token_num) : []};
  });
}

/**
 * Get a list of synsets and their senses
 * @param synset_ids
 * @returns {Promise<Array>}
 */
async function getSynsets(synset_ids) {
  if (synset_ids.length === 0) return [];
  let synset_senses = await (await dbconn).query(`
    SELECT s.id AS sense_id,
           e.id AS entry_id,
           e.heading AS text,
           ps.order_no AS parent_order_no,
           s.order_no,
           s.gloss,
           s.synset_id,
           s.data
    FROM dict.senses s
    JOIN dict.entries e ON e.id = s.entry_id
    LEFT JOIN dict.senses ps ON ps.id = s.parent_sense_id
    WHERE s.synset_id in (${synset_ids})
  `);
  return _(synset_senses).groupBy('synset_id').map((senses, synset_id) => {
    return {synset_id, senses: processSenses(senses), sense_id: senses[0].sense_id}
  }).value();
}

async function getSynsetRelationIds(synset_id) {
  let relations =  await (await dbconn).query(`
    SELECT synset_1_id AS synset_id
    FROM dict.synset_relations
    WHERE synset_2_id = ${synset_id}
    UNION 
    SELECT synset_2_id AS synset_id
    FROM dict.synset_relations
    WHERE synset_1_id = ${synset_id}
  `);
  return relations.map(s => s.synset_id)
}

/**
 * Suggest a sense (without synset) or existsing synset that matches the input query string
 * @param q
 * @param filter
 * @returns {Promise<{senses: *, synsets: Array}>}
 */
async function suggestSynset(q, filter) {
  let wheres = [];
  if (!filter.subsenses) wheres.push('s.parent_sense_id is NULL');
  if (filter.ignore.sense_id) wheres.push(`s.id != ${filter.ignore.sense_id}`);
  if (filter.ignore.entry_id) wheres.push(`e.id != ${filter.ignore.entry_id}`);
  if (filter.ignore.synset_id) wheres.push(`(s.synset_id != ${filter.ignore.synset_id} or s.synset_id is null)`);
  let ignore_relations = (await getSynsetRelationIds(filter.ignore.synset_id)).join();
  if (ignore_relations.length) wheres.push(`(s.synset_id not in (${ignore_relations}) or s.synset_id is null)`);
  let where_query = wheres.length > 0 ? `where ${wheres.join(' and ')}` : '';

  let senses = await (await dbconn).query(`
    SELECT s.id AS sense_id,
       s.gloss,
       s.synset_id,
       s.order_no,
       s.parent_sense_id,
       s.data,
       ps.order_no AS parent_order_no,
       ps.gloss AS parent_gloss,
       e.id AS entry_id,
       e.text,
       e.primary_lexeme_id,
       min(w) AS w
    FROM
      (SELECT * FROM (SELECT id, 1 AS w, heading || CASE WHEN homonym_no > 1 THEN ':' || homonym_no ELSE '' END AS text, primary_lexeme_id FROM dict.entries WHERE heading || CASE WHEN homonym_no > 1 THEN ':' || homonym_no ELSE '' END like $1 || '%' AND type_id in (1,4) LIMIT 200) a
       UNION
       SELECT * FROM (SELECT id, 2 AS w, heading || CASE WHEN homonym_no > 1 THEN ':' || homonym_no ELSE '' END AS text, primary_lexeme_id FROM dict.entries WHERE heading || CASE WHEN homonym_no > 1 THEN ':' || homonym_no ELSE '' END ilike $1 || '%' AND type_id in (1, 4) LIMIT 200) b
       UNION 
       SELECT * FROM (SELECT id, 3 AS w, heading || CASE WHEN homonym_no > 1 THEN ':' || homonym_no ELSE '' END AS text, primary_lexeme_id FROM dict.entries WHERE heading || CASE WHEN homonym_no > 1 THEN ':' || homonym_no ELSE '' END ilike '%' || $1 || '%' AND type_id in (1, 4) LIMIT 200) c) e
    JOIN dict.senses s ON s.entry_id = e.id
    LEFT JOIN dict.senses ps ON ps.id = s.parent_sense_id ${where_query}
    GROUP BY s.id,
             s.gloss,
             s.synset_id,
             s.parent_sense_id,
             ps.order_no,
             ps.gloss,
             s.order_no,
             e.id,
             e.text,
             e.primary_lexeme_id
    ORDER BY min(w),
             min(char_length(text)),
             CASE
                 WHEN (s.parent_sense_id IS NULL) THEN s.order_no
                 WHEN (s.parent_sense_id IS NOT NULL) THEN ps.order_no
             END,
             CASE
                 WHEN (s.parent_sense_id IS NULL) THEN 0
                 WHEN (s.parent_sense_id IS NOT NULL) THEN s.order_no
             END
    LIMIT 100
  `, [q]);

  senses = processSenses(senses);
  let synset_ids = _(senses).map('synset_id').uniq().without(null).value().join(',');
  let synsets = await getSynsets(synset_ids);
  senses = senses.filter(s => !s.synset_id);

  return {senses, synsets};
}

const formatPWN = (s) => ({
  pwn: true,
  pos: s.pos,
  display_pos: pos_map[s.pos],
  remote_id: `${s.synsetOffset}-${s.pos}`,
  gloss: s.gloss,
  def: s.def,
  senses: s.synonyms.map(syn => ({text: syn}))
});

/**
 * Get a list of PWN 3.0 synsets
 * @param q - query
 * @param filter
 * @returns {Promise<{synsets: *}>}
 */
async function suggestPWNSynset(q, filter) {
  if (q === '?') {
    return {synsets: await getGeneratedLinks(filter.ignore.sense_id)};
  }

  let links = await (await dbconn)[schema].synset_external_links.find({synset_id: filter.ignore.synset_id, link_type_id: 1});
  let added_remote_ids = links.map(l => l.remote_id);

  let match = q.match(/(?<word>[^.]*)(\.(?<pos>n|adj|adv|v))?/);
  let synsets = [];
  if (match && match.groups) {
    let data = !filter.prefix
      ? await wordposLookup(match.groups.word.trim(), match.groups.pos)
      : (await Promise.all((await wordposLookupPrefix(match.groups.word.trim(), match.groups.pos))
        .map(w => wordposLookup(w, match.groups.pos)))).flat();
    synsets = data
      .map(s => formatPWN(s))
      .filter(s => !added_remote_ids.includes(s.remote_id));
  }
  return {synsets};
}

async function wordposLookup(word, pos) {
  switch (pos) {
    case 'n': return wordpos.lookupNoun(word);
    case 'v': return wordpos.lookupVerb(word);
    case 'adj': return wordpos.lookupAdjective(word);
    case 'adv': return wordpos.lookupAdverb(word);
    default: return wordpos.lookup(word);
  }
}

async function wordposLookupPrefix(prefix, pos) {
  switch (pos) {
    case 'n': return wordpos.randNoun({startsWith: prefix, count: 100});
    case 'v': return wordpos.randVerb({startsWith: prefix, count: 100});
    case 'adj': return wordpos.randAdjective({startsWith: prefix, count: 100});
    case 'adv': return wordpos.randAdverb({startsWith: prefix, count: 100});
    default: return wordpos.rand({startsWith: prefix, count: 100});
  }
}

/**
 * Get lv synonyms for a list of words OR
 * Get en translations for a list of words
 * @param words
 * @param filename
 * @returns {null}
 */
function getFromFile(words, filename) {
  let result = {};
  let data = fs.readFileSync(__dirname + filename, 'utf-8');
  if (data) {
    words.forEach(w => {
      const regex = new RegExp(`\n${w} (I* )?- .*`, 'g');
      let match = data.match(regex);
      if (match)
        result[w] = match.map((m) => {
          let split = m.split(' - ');
          return {left: split[0], right: split[1].split(', ')}
        });
    });
  }
  return _.isEmpty(result) ? null : result;
}

const verbalizeSense = (s) => {
  if (!s.data || !s.data.Gram) return null;
  if (s.data.Gram.Leftovers && s.data.Gram.FreeText) return s.data.Gram.FreeText;
  if (s.data.Gram.Leftovers && s.data.Gram.FlagText) return s.data.Gram.FlagText;
  else return verbalizer.verbalize_entity('sense', s.data.Gram.Flags, s.data.Gram.StructuralRestrictions);
};

const processSenses = (senses) =>
  senses.map(s => ({...s, verbalization: s.data ? verbalizeSense(s) : null}));

/**
 * Get a collection of all senses in the synset
 * @param sense_id
 * @param synset_id
 * @param with_synonyms
 * @returns {Promise<*>}
 */
async function getSynset(sense_id, synset_id=null, with_synonyms=true) {
  let result = null;

  if (!synset_id) {
    let sense = await (await dbconn)[schema].senses.findOne({id: sense_id});
    synset_id = sense.synset_id;
  }
  if (synset_id) {
    result = _.head(await getSynsets([synset_id]));
  } else { // this sense is not in a synset yet
    let senses = await (await dbconn).query(`
      SELECT s.id AS sense_id,
             e.id AS entry_id,
             e.heading AS text,
             ps.order_no AS parent_order_no,
             s.order_no,
             s.gloss,
             s.data
      FROM dict.senses s
      JOIN dict.entries e ON e.id = s.entry_id
      LEFT JOIN dict.senses ps ON ps.id = s.parent_sense_id
      WHERE s.id=$1
  `, [sense_id]);
    result = {synset_id: null, senses: processSenses(senses), sense_id: senses[0].sense_id};
  }

  if (with_synonyms) {
    result.synonyms = getFromFile(_.map(result.senses, 'text'), '/data/synonym-dict-old.txt');
    result.translations = getFromFile(_.map(result.senses, 'text'), '/data/translations_lv2en.txt');
  }

  result.entry_synsets = await getEntrySynsets(result.senses.find(s => s.sense_id === sense_id).entry_id, sense_id);

  return result;
}

async function getGeneratedLinks(sense_id) {
  if (generated_links[sense_id]) {
    return Promise.all(generated_links[sense_id].map(async l => {
      let [offset, pos] = l.id.split('-');
      return Object.assign({score: l.score}, await wordpos.seek(parseInt(offset), pos).then(s => formatPWN(s)));
    }));
  }
  return null;
}

async function getEntrySynsets(entry_id, ignore_sense_id=null) {
  if (entry_id) {
    let synset_ids = (await (await dbconn)[schema].senses.where(`entry_id = ${entry_id} AND synset_id IS NOT NULL AND id != ${ignore_sense_id}`))
      .map(s => s.synset_id);
    return await getSynsets(synset_ids);
  }
  return [];
}

/**
 * Result: a and b are in the same synset
 * @param tx
 * @param a
 * @param b
 * @returns {Promise<*>}
 */
async function createOrUpdateSynset(tx, a, b) {
  if (!a.synset_id && !b.synset_id) { // create
    // const synset = await tx[schema].synsets.insert({release_id: config.RELEASE});
    // const synset = await tx[schema].synsets.insert();
    const synset = await tx[schema].synsets.insert({ data: null });
    return await tx[schema].senses.update({id: [a.sense_id, b.sense_id]}, {synset_id: synset.id});
  } else if (!(a.synset_id && b.synset_id)) { // add
    return await tx[schema].senses.update({id: [a.sense_id, b.sense_id]}, {synset_id: a.synset_id || b.synset_id});
  } else {
    // Transfer everything from b to a and then delete b
    await tx[schema].senses.update({synset_id: b.synset_id}, {synset_id: a.synset_id});
    await tx[schema].synset_relations.update({synset_1_id: b.synset_id}, {synset_1_id: a.synset_id});
    await tx[schema].synset_relations.update({synset_2_id: b.synset_id}, {synset_2_id: a.synset_id});
    await tx[schema].synset_relations.destroy({synset_1_id: a.synset_id, synset_2_id: a.synset_id}); // had other links between a and b
    await tx[schema].synset_external_links.update({synset_id: b.synset_id}, {synset_id: a.synset_id}); // PWN links
    return await tx[schema].synsets.destroy({id: b.synset_id});
  }
}

/**
 * Create a synset for a sense
 * @param tx
 * @param sense_id
 * @returns {Promise<*>}
 */
async function createSynsetForSense(tx, sense_id) {
  // const synset = await tx[schema].synsets.insert({release_id: config.RELEASE});
  // const synset = await tx[schema].synsets.insert();
  const synset = await tx[schema].synsets.insert({ data: null });
  await tx[schema].senses.update({id: sense_id}, {synset_id: synset.id});
  return synset.id;
}

async function createSynsetsIfNeeded(tx, a, b) {
  if (!a.synset_id) {
    a.synset_id = await createSynsetForSense(tx, a.sense_id);
  }
  if (!b.synset_id) {
    b.synset_id = await createSynsetForSense(tx, b.sense_id);
  }
  return [a, b];
}

/**
 * Create relation between synsets a and b.
 * a -> b normal
 * b -> a inverse
 * @param tx
 * @param a
 * @param b
 * @param relation_name
 * @returns {Promise<*>}
 */
async function addRelationBetweenSynsets(tx, a, b, relation_name) {
  [a, b] = await createSynsetsIfNeeded(tx, a, b);
  const relation_type = await tx[schema].synset_rel_types.findOne({relation_name});
  let relation = {
    synset_1_id: a.synset_id,
    synset_2_id: b.synset_id,
    type_id: relation_type.id,
  };
  return await tx[schema].synset_relations.insert(relation);
}

/**
 * Put synsets of a and b in one gradset
 * @param tx
 * @param a
 * @param b
 * @returns {Promise<*>}
 */
async function createOrUpdateGradset(tx, a, b) {
  [a, b] = await createSynsetsIfNeeded(tx, a, b);
  a.synset = await tx[schema].synsets.findOne({id: a.synset_id});
  b.synset = await tx[schema].synsets.findOne({id: b.synset_id});
  a.gradset_id = a.synset ? a.synset.gradset_id : null;
  b.gradset_id = b.synset ? b.synset.gradset_id : null;

  if (!a.gradset_id && !b.gradset_id) { // create
    const gradset = await tx[schema].gradsets.insert({data: null});
    return await tx[schema].synsets.update({id: [a.synset_id, b.synset_id]}, {gradset_id: gradset.id});
  } else if (!(a.gradset_id && b.gradset_id)) { // add
    return await tx[schema].synsets.update({id: [a.synset_id, b.synset_id]}, {gradset_id: a.gradset_id || b.gradset_id});
  } else {
    // todo: what if one of gradsets has the attribute (should keep that one)
    // todo: what if both gradsets have the attribute (warning?)
    await tx[schema].synsets.update({gradset_id: b.gradset_id}, {gradset_id: a.gradset_id});
    return await tx[schema].gradsets.destroy({id: b.gradset_id});
  }
}

/**
 * Link our synset with entry in an external resource
 * @param tx
 * @param a - our synset
 * @param id - external id
 * @param name - external link type
 * @param data - extra data to save in the new entry
 * @returns {Promise<*>}
 */
async function linkExternalDataToSynset(tx, a, id, name, data=null) {
  const type = await tx[schema].external_link_types.findOne({name: name});
  if (type) {
    if (!a.synset_id) {
      a.synset_id = await createSynsetForSense(tx, a.sense_id);
    }
    return await tx[schema].synset_external_links.insert({
      link_type_id: type.id,
      synset_id: a.synset_id,
      url: OMW_LINK + id,
      remote_id: id,
      data: data
    });
  }
}

async function processSynsetRelation(withTx, a, b, type) {
  return await withTx(async tx => {
    switch (type) {
      case 'synset':
        return createOrUpdateSynset(tx, a, b);
      case 'hyponymy':
      case 'meronymy':
      case 'similarity':
      case 'antonymy':
      case 'see also':
        return addRelationBetweenSynsets(tx, b, a, type);
      case 'holonymy':
        return addRelationBetweenSynsets(tx, a, b, 'meronymy');
      case 'hypernymy':
        return addRelationBetweenSynsets(tx, a, b, 'hyponymy');
      case 'gradset':
        return createOrUpdateGradset(tx, a, b);
      case 'gradset_attribute': // The name of the gradset, e.g. {temperature} for gradset {{hot}, {cold}, {warm}}
        if (!b.synset_id && b.sense_id)
          b.synset_id = await createSynsetForSense(tx, b.sense_id);
        return updateGradset(tx, null, a.synset_id, {synset_id: b.synset_id});
      case 'omw':
        return linkExternalDataToSynset(tx, a, b.synset_id, type);
      case 'eq_has_hyperonym':
      case 'eq_has_hyponym':
        return linkExternalDataToSynset(tx, a, b.synset_id, 'omw', {Relation: type});
      default:
        return {error: 'invalid operation'};
    }
  });
}

/**
 * Delete a synset if it has no senses and no relations
 * @param tx
 * @param id
 * @returns {Promise<void>}
 */
async function cleanupSynset(tx, id) {
  if (id) {
    const senses = await tx[schema].senses.find({synset_id: id});
    const relations = await tx[schema].synset_relations.where(`synset_1_id = ${id} OR synset_2_id = ${id}`);
    const links = await tx[schema].synset_external_links.find({synset_id: id});
    if (senses.length === 0 && relations.length === 0 && links.length === 0) {
      await tx[schema].synsets.destroy({id})
    }
  }
}

/**
 * Change to which synset does the sense belong to
 * @param withTx
 * @param synset_id
 * @param sense_id
 * @returns {Promise<*>}
 */
async function changeSynset(withTx, synset_id, sense_id) {
  return await withTx(async tx => {
    const sense = await tx[schema].senses.findOne({id: sense_id});
    const prev_synset_id = sense.synset_id;
    sense.synset_id = synset_id;
    const result = await tx[schema].senses.save(sense);
    // todo: warn user
    await cleanupSynset(tx, prev_synset_id);

    return result;
  });
}


async function cleanupGradset(tx, id) {
  if (id) {
    const synsets = await tx[schema].synsets.find({gradset_id: id});
    const gradset = await tx[schema].gradsets.findOne({id});
    if (synsets.length === 0 && !gradset.sense_id) {
      await tx[schema].gradsets.destroy({id})
    }
  }
}

async function updateSynset(withTx, id, data) {
  return await withTx(async tx => {
    const synset = await tx[schema].synsets.findOne({id});
    const update = getUpdate(synset, data, {id});
    const result = await tx[schema].synsets.save(update);
    // todo: warn user
    await cleanupGradset(tx, synset.gradset_id);
    debug('synset updated', result);
    return result;
  });
}

async function updateGradset(tx, id, synset_id, data) {
  if (!id) {
    id = (await tx[schema].synsets.findOne({id: synset_id})).gradset_id;
  }
  const gradset = await tx[schema].gradsets.findOne({id});
  const update = getUpdate(gradset, data, {id});
  const result = await tx[schema].gradsets.save(update);
  debug('gradset updated', result);
  await cleanupSynset(tx, gradset.synset_id);

  return result;
}

/**
 * Gradsets are collections of synsets. E.g. {{cold}, {warm}, {hot}}.
 * They can also have an attribute/name: a synset that describes the gradset. E.g. {temperature}
 *
 * This retrieves from the database all the synsets in the gradset.
 * Including the attribute sysnet, if exists.
 *
 * @param gradset_id - The database id of the gradset. Null or non-existant id is allowed.
 * @returns array - Gradset (list of synsets), if exists. Otherwise, empty list.
 */
async function getGradset(gradset_id) {
  let senses = await (await dbconn).query(`
    SELECT ps.order_no AS parent_order_no,
           e.heading AS text,
           gradset_id,
           s.*
    FROM dict.senses s
    JOIN dict.synsets sy ON sy.id=s.synset_id
    LEFT JOIN dict.senses ps ON ps.id=s.parent_sense_id
    JOIN dict.entries e ON e.id=s.entry_id
    WHERE gradset_id = ${gradset_id}
      OR s.synset_id =
        (SELECT synset_id
         FROM dict.gradsets
         WHERE id=${gradset_id})
  `);
  return _(senses).groupBy('synset_id').values()
    .map((s) => ({
      senses: processSenses(s),
      synset_id: s[0].synset_id,
      gradset_attribute: s[0].gradset_id !== gradset_id
    }))
    .orderBy('gradset_attribute', 'desc')
    .value();
}

/**
 * Get all external entries that have links to the synset
 * @param synset_id
 */
async function getExternalLinks(synset_id) {
  let links = await (await dbconn)[schema].synset_external_links.find({synset_id, link_type_id: 1});
  return Promise.all(links.map(async (l) => {
    let res = {link_id: l.id, display_relation: l.data && l.data.Relation ? pwn_relation_map[l.data.Relation] : null};
    let [offset, pos] = l.remote_id.split('-');
    return Object.assign(res, await wordpos.seek(parseInt(offset), pos).then(s => formatPWN(s)));
  }));
}

async function getSynsetRelations(synset_id) {
  let all = {};

  const external_links = await getExternalLinks(synset_id);
  if (external_links.length) all.external_links = external_links;

  let relations = await (await dbconn).query(`
    SELECT rels.type_id AS rel_type_id,
           e.heading AS text,
           ps.order_no AS parent_order_no,
           ps.data,
           rels.*
    FROM
      (SELECT r.synset_1_id AS synset_id,
              r.id AS relation_id, *
       FROM dict.synset_relations r
       JOIN dict.senses s ON s.synset_id = r.synset_1_id
       WHERE synset_2_id = ${synset_id}
       UNION 
       SELECT r.synset_2_id AS synset_id,
              r.id AS relation_id, *
       FROM dict.synset_relations r
       JOIN dict.senses s ON s.synset_id = r.synset_2_id
       WHERE synset_1_id = ${synset_id}) rels
    LEFT JOIN dict.senses ps ON ps.id=rels.parent_sense_id
    JOIN entries e ON e.id=rels.entry_id`,
    {synset_id}
  );
  let types = (await (await dbconn)[schema].synset_rel_types.find());

  relations = _(relations).groupBy('relation_id')
    .map((r) => {
      return {senses: processSenses(r), synset_id: r[0].synset_id}
    }).groupBy((r) => {
      let type = types.find(t => t.id === r.senses[0].rel_type_id);
      if (type.is_symmetric || r.senses[0].synset_1_id === synset_id) {
        return type.name;
      } else {
        return type.name_inverse;
      }
    }).value();

  all = Object.assign(all, relations);

  // A synset can either belong to a gradset;
  let synset = await (await dbconn)[schema].synsets.findOne({id: synset_id});
  const gradsetSynsetBelongsTo = (!synset) ? [] : await getGradset(synset.gradset_id);

  // Or be an attribute/name of a gradset.
  let gradset = await (await dbconn)[schema].gradsets.findOne({synset_id});
  const gradsetSynsetNameOf = (!gradset) ? [] : await getGradset(gradset.id)

  if (gradsetSynsetBelongsTo.length) all.gradset = gradsetSynsetBelongsTo;
  if (gradsetSynsetNameOf.length) all.gradset_of_attribute = gradsetSynsetNameOf;

  return all;
}

/**
 * Get all our synsets that have been linked with the entry in the external resource
 * @param remote_id - external entry id
 * @param type_name - external link type
 * @returns {Promise<*>}
 */
async function getExternalLinkRelations(remote_id, type_name) {
  let result = {synsets: []};
  const type = await (await dbconn)[schema].external_link_types.findOne({name: type_name});
  if (type) {
    let links = await (await dbconn)[schema].synset_external_links.find({link_type_id: type.id, remote_id});
    result.synsets = await getSynsets(links.map(l => l.synset_id));
  }
  return result.synsets.length ? result: {};
}

async function deleteSynsetRelation(withTx, id) {
  return await withTx(async tx => {
    const result = await tx[schema].synset_relations.destroy({id});
    debug('synset relation deleted', result);
    return result;
  });
}

async function deleteExternalLink(withTx, id) {
  return await withTx(async tx => {
    const link = await tx[schema].synset_external_links.findOne({id});
    const result = await tx[schema].synset_external_links.destroy({id});
    await cleanupSynset(tx, link.synset_id);
    debug('synset external link deleted', result);
    return result;
  });
}

module.exports = {
  getExamplesFromSketchEngine,

  updateEntry,
  addWordnetComments,
  createWordnetEntry,
  saveSketchEngineError,
  getSketchEngineErrors,

  suggestSynset,
  suggestPWNSynset,
  getSynset,
  getSynsets,
  processSynsetRelation,
  changeSynset,
  getSynsetRelations,
  deleteSynsetRelation,

  getExternalLinkRelations,
  deleteExternalLink,

  updateSynset,
  createSynsetForSense,
  linkExternalDataToSynset
};
