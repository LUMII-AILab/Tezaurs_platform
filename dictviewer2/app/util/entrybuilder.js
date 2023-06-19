const debug = require('debug')('entry:build');
const { prettifyString } = require('./misc-utils');
const { linkifyGloss, unlinkifyGloss } = require('./linkifier');
const { buildMorphoTable, doNotBuildMorphoTableIfEverythingIsBroken } = require('./morpho-utils');
const { outgoing_rel_names, incoming_rel_names, sense_entry_rel_names } = require('./text-constants');
const _ = require('lodash');
const helper = require('./entry-helper');
const WordPOS = require('wordpos'),
  wordpos = new WordPOS({dictPath: require('path').join(__dirname, 'dict_3.0')});


const loadFullEntry = async (req, entry_id, isMain = false) => {
    // debug('lfe', entry_id);

    if (!req.app.locals.isReady) {
        debug('Lietotne vēl nav ielādēta, nav ko mani pāragri tracināt');
        return null;
    }

    if (isMain && !req._seen) {
      req._seen = new Map();
    }

    let fullEntry = req._seen.get(entry_id);
    if (fullEntry) return fullEntry;

    fullEntry = await buildFullEntry(req, entry_id, isMain);
    return fullEntry;
}

const buildFullEntry = async (req, entry_id, isMain = false) => {
    debug('bfe', entry_id);
    // console.time(`load entry ${entry_id}`);
    let cache = req.app.locals.dbcache;

    let db = req.app.get('db');
    let dbschema = req.app.get('dbschema');

    // const fresh_entries = await db[dbschema].entries.find();
    // let entryStub = fresh_entries.find(e => e.id === entry_id);
    // if (!entryStub) {
    //     console.error(`neatradu entry stub ${entry_id}`); // TODO:
    //     return null;
    // }

    // let entryStub = await db[dbschema].entries.findOne(entry_id); // FIXME: via method
    let entryStub = await cache.getEntryById(entry_id);
    if (!entryStub) {
      console.error(`neatradu entry stub ${entry_id}`); // TODO:
      return null;
    }

    debug('entryStub: %o', entryStub);
    let fullEntry = {...entryStub};

    req._seen.set(entry_id, fullEntry);

    const senses = await loadSenses(req, entry_id);
    fullEntry.senses = senses;
    debug('%d sense(s) loaded for', senses.length, entry_id);

    // if (!isMain) return fullEntry;

    // -- lexemes --
    const lexemes = await db[dbschema].lexemes.find(
      {
        'entry_id': entry_id
      },
      {
        order: [
          { field: 'hidden', direction: 'asc' },
          { field: 'order_no', direction: 'asc' },
        ]
      }
    );

    for (let l of lexemes) {
      if (entryStub.primary_lexeme_id === l.id) {
        l.primary = true; // TODO: consolidate primary -> isPrimary
      }
      if (l.paradigm_id) {
        l.paradigm = cache.paradigms.find(p => p.id === l.paradigm_id);
      }
    }

    fullEntry.lexemes = lexemes;
    fullEntry.primaryLexeme = lexemes.find(l => l.id === fullEntry.primary_lexeme_id);
    if (!fullEntry.primaryLexeme) {
      debug('primary lexeme %d not found for %o', entryStub.primary_lexeme_id, lexemes);
    }
    debug('%d lexeme(s) loaded for %d', lexemes.length, entry_id);

    // lexeme morphotables
    for (let lex of fullEntry.lexemes) {
      if (lex.lemma && lex.paradigm && lex.paradigm.legacy_no !== 0 && lex.paradigm.legacy_no !== 36) {
        try {
          if (!doNotBuildMorphoTableIfEverythingIsBroken(lex)) {
            const mt = await buildMorphoTable(
              lex.lemma,
              // lex.paradigm.legacy_no,
              lex.paradigm.human_key,
              lex.paradigm.data,
              lex.stem1,
              lex.stem2,
              lex.stem3,
              lex.data && lex.data.Gram && lex.data.Gram.Flags,
              lex.data && lex.data.Gram && lex.data.Gram.StructuralRestrictions,
            );
            if (mt) {
              lex.morphology = mt;
            }
          }
        } catch (err) {
          console.error('nosprāga morfoloģija', err);
        }
      }
    }
    debug('morpho info for lexemes loaded');
    // -- end lexemes --

    if (!isMain) return fullEntry;


    // -- sources --
    fullEntry.sources = await db.query(`select sl.id, sl.source_id, abbr, title, sl.order_no, sl.data, sl.lexeme_id, sl.sense_id
      from source_links sl left join sources s on s.id = sl.source_id where sl.entry_id = $1 order by sl.order_no, sl.id`, [entry_id]);
    debug('%d source link(s) loaded for %d', fullEntry.sources.length, entry_id);
    // -- end sources --

    // -- examples --
    fullEntry.examples = await db[dbschema].examples.find(
      {
        'entry_id': entry_id,
        'sense_id': null,
      },
      {
        order: [
          { field: 'hidden', direction: 'asc' },
          { field: 'order_no', direction: 'asc' },
        ]
      }
    )
    // -- end examples --

    await loadEntryRelations(req, entry_id, fullEntry);
    debug('relations loaded', entry_id);

    // console.timeEnd(`load entry ${entry_id}`);
    // console.log(`entryMap has ${cache.entryMap.size} entries`);
    // console.log(fullEntry.primaryLexeme);


    return fullEntry;
};

const loadEntryRelations = async (req, entry_id, fullEntry) => {
  let db = req.app.get('db');
  let dbschema = req.app.get('dbschema');
  let cache = req.app.locals.dbcache;

  // FIXME: te varbūt var lasīt no view, kurā ir jau redzams arī otra gala human_key
  const outgoing_entry_relations = await db[dbschema].entry_relations.find(
    {
      'entry_1_id': entry_id
    },
    {
      order: [
        { field: 'id', direction: 'asc' },
      ]
    }
  );

  // const fresh_entries = await db[dbschema].entries.find();

  // fullEntry.outgoing_entry_relations = [];
  // for (let rel of outgoing_entry_relations) {
  //     let otherEntry = await loadFullEntry(req, rel.entry_2_id);
  //     if (otherEntry) {
  //         fullEntry.outgoing_entry_relations.push({
  //             type_id: rel.type_id,
  //             entry: otherEntry,
  //         });
  //     }
  // }

  // fullEntry.outgoing_entry_relations = outgoing_entry_relations.map(er =>
  //     ({type_id: er.type_id, entry: cache.entries.find(e => e.id === er.entry_2_id)}));

/*
  fullEntry.references = [];
  for (let er of outgoing_entry_relations) {
    let e2 = await cache.getEntryById(er.entry_2_id);
    fullEntry.references.push({ type_id: er.type_id, entry: e2});
  }
  console.log(fullEntry.references);
*/
  const incoming_entry_relations = await db[dbschema].entry_relations.find(
    {
      'entry_2_id': entry_id
    },
    {
      order: [
        { field: 'id', direction: 'asc' },
      ]
    }
  );

  const sense_entry_relations = await db[dbschema].sense_entry_relations.find(
    {
      'entry_id': entry_id
    },
    {
      order: [
        { field: 'id', direction: 'asc' },
      ]
    }
  );

  debug('relations for %d: incoming %d, outgoing %d, sense %d', entry_id, incoming_entry_relations.length, outgoing_entry_relations.length, sense_entry_relations.length);

  // FIXME: te laikam vajag tikai 3 un 5
  fullEntry.incoming_entry_relations = [];
  for (let rel of incoming_entry_relations) {
      let otherEntry = await loadFullEntry(req, rel.entry_1_id);
      if (otherEntry) {
        // debug('idiom+:', otherEntry);
          fullEntry.incoming_entry_relations.push({
              type_id: rel.type_id,
              rel_id: rel.id,
              entry: otherEntry,
          });
      }
  }
  fullEntry.incoming_entry_relations.sort((a, b) => a.entry.heading.localeCompare(b.entry.heading, 'lv'));

  let entry_sidelinks = [];
  for (let rel of incoming_entry_relations) {
      if (rel.type_id === 3 || rel.type_id === 5) continue; // TODO: atkabināties no num id
      // let other = fresh_entries.find(e => e.id === rel.entry_1_id); // FIXME: šos varbūt var paņemt no fullEntry.incoming_entry_relations
      let other = await cache.getEntryById(rel.entry_1_id); // FIXME: šos varbūt var paņemt no fullEntry.incoming_entry_relations
      if (!other.human_key) continue;
      entry_sidelinks.push({
          direction: 'ienākoša',
          // relation: cache.entry_rel_types.find(rt => rt.id === er.type_id),
          relation: incoming_rel_names[rel.type_id],
          human_key: other.human_key,
          heading: other.heading,
          rel_id: rel.id,
      });
  }
  for (let rel of outgoing_entry_relations) {
      // if (rel.type_id === 3 || rel.type_id === 5) continue; // TODO: atkabināties no num id
      // let other = fresh_entries.find(e => e.id === rel.entry_2_id);
      let other = await cache.getEntryById(rel.entry_2_id);
      if (!other.human_key) continue;
      entry_sidelinks.push({
          direction: 'izejoša',
          // relation: cache.entry_rel_types.find(rt => rt.id === er.type_id),
          relation: outgoing_rel_names[rel.type_id],
          human_key: other.human_key,
          heading: other.heading,
          rel_id: rel.id,
      });
  }
  for (let rel of sense_entry_relations) {
      let other = await cache.getEntryBySenseId(rel.sense_id);
      if (!other.human_key) continue;
      entry_sidelinks.push({
          direction: 'nozīmes',
          // relation: cache.entry_rel_types.find(rt => rt.id === er.type_id),
          relation: sense_entry_rel_names[rel.type_id],
          human_key: other.human_key,
          heading: other.heading,
          rel_id: rel.id,
      });
  }
  // fullEntry.incoming_entry_relations = incoming_entry_relations.map(er =>
  //     ({type_id: er.type_id, entry: cache.entries.find(e => e.id === er.entry_1_id)}));

  fullEntry.sidelinks = entry_sidelinks;

  if (req.app.locals.SHOW_WORDNET_EDITOR) {
    fullEntry.wordnet_entry = await db[dbschema].wordnet_entries.findOne({entry: fullEntry.heading});

    let synset_ids = fullEntry.senses
      .concat(fullEntry.senses.flatMap(s => s.subSenses || []))
      .map(s => s.synset_id)
      .filter(Number);
    fullEntry.synsets = (await getSynsets(synset_ids, db));
  }
}

/*
const loadLexemes = async (req, entry_id) => {
    let db = req.app.get('db');
    const lexemes = await db[dbschema].lexemes.find({'entry_id': entry_id});
    let cache = req.app.locals.dbcache;
    return lexemes;
}
*/

const loadSenses = async (req, entry_id) => {
  let db = req.app.get('db');
  let dbschema = req.app.get('dbschema');

  const all_senses = await db[dbschema].senses.find(
    {
      'entry_id': entry_id
    },
    {
      order: [
        { field: 'hidden', direction: 'asc' },
        { field: 'order_no', direction: 'asc' },
      ]
    }
  );

  let synset_ids = all_senses.map(s => s.synset_id).filter(id => id != null);
  let synsets = await getSynsets(synset_ids, db);

  // todo: get rid of this workaround
  // This is a temporary empty cache for the linkifier because it expects db cache object
  let fake_cache = {
    entriesByHK: new Map(),
    entriesByHeading: new Map(),
    entriesByHeadingInLowerCase: new Map(),
    glossLinks: {}
  };

  const top_senses = [];
  for (let curr_sense of all_senses) {
    if (curr_sense.parent_sense_id) {
      let parent = all_senses.find(x => x.id === curr_sense.parent_sense_id);
      if (!parent) {
        // error
      } else {
        curr_sense.parent_order_no = parent.order_no;
        if (parent.subSenses) {
          parent.subSenses.push(curr_sense);
        } else {
            parent.subSenses = [curr_sense];
        }
      }
    } else {
      top_senses.push(curr_sense);
    }

    curr_sense.MWEs = [];
    curr_sense.gloss_links = {sense: [], entry: []};
    let ser = await db[dbschema].sense_entry_relations.find({'sense_id': curr_sense.id});
    for(let rel of ser) {
      if (rel.type_id === 4) {
        rel.entry = await db[dbschema].entries.findOne({'id': rel.entry_id});
        curr_sense.gloss_links.entry.push(rel);
      } else {
        let mweEntry = await loadFullEntry(req, rel.entry_id);
        if (mweEntry) {
          // debug('MWE:', mweEntry);
          curr_sense.MWEs.push(mweEntry);
        }
      }
    }
    curr_sense.MWEs.sort((a, b) => a.heading.localeCompare(b.heading, 'lv'));

    let sr = await db[dbschema].sense_relations.find({'sense_1_id': curr_sense.id});
    for (let rel of sr) {
      if (rel.type_id === 4) {
        rel.sense = (await db.query(
          `select s.*, ps.order_no as parent_order_no
           from dict.senses s
           left outer join dict.senses ps on ps.id=s.parent_sense_id
           where s.id = $1`, [rel.sense_2_id]
        ))[0];
        rel.entry_id = rel.sense.entry_id;
        rel.entry = await db[dbschema].entries.findOne({'id': rel.sense.entry_id});
        curr_sense.gloss_links.sense.push(rel);
      }
    }

    fake_cache.glossLinks.sense = curr_sense.gloss_links.sense.reduce(function(map, gl) {map.set(gl.id, gl); return map;}, new Map());
    fake_cache.glossLinks.entry = curr_sense.gloss_links.entry.reduce(function(map, gl) {map.set(gl.id, gl); return map;}, new Map());
    curr_sense.linkifiedGloss = linkifyGloss(fake_cache, curr_sense.gloss);

    // examples (MLVV) // TODO: check this
    curr_sense.examples = [];
    let examples = await db[dbschema].examples.find(
      {
        'sense_id': curr_sense.id
      },
      {
        order: [
          { field: 'hidden', direction: 'asc' },
          { field: 'order_no', direction: 'asc' },
        ]
      }
    );
    for(let ex of examples) {
      // debug('example:', ex);
      curr_sense.examples.push(ex);
    }

    let synset = synsets[curr_sense.synset_id] ? removeSenseFromSynset(synsets[curr_sense.synset_id], curr_sense.id) : {senses: []};
    synset.external_links = await getExternalLinks(curr_sense.synset_id, db, dbschema);
    synset.relations = await getSynsetRelations(curr_sense.synset_id, db, dbschema);
    curr_sense.synset = synset;

    // debug(`sense processed: ${curr_sense.gloss}`)

  }

  return top_senses;

};

// TODO: clean all this up

const removeSenseFromSynset = function(synset, sense_id) {
  synset.senses = synset.senses.filter(s => s.sense_id !== sense_id);
  return synset;
};

const getSynsets = async (synset_ids, db) => {
  if (synset_ids.length === 0) return [];
  let synset_senses = await db.query(helper.getSynsetsQuery(`WHERE s.synset_id in (${synset_ids})`));
  synset_senses.forEach(s => s.gloss = prettifyString(s.gloss));
  return _(synset_senses).groupBy('synset_id').map((senses, synset_id) => {
    return {synset_id, senses, sense_id: senses[0].sense_id}
  }).keyBy('synset_id').value();
};

async function getSynsetRelations(synset_id, db, dbschema) {
  let all = {};

  let relations = await db.query(`
    SELECT rels.type_id AS rel_type_id,
           e.heading AS text,
           e.human_key,
           ps.order_no AS parent_order_no,
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
  let types = (await db[dbschema].synset_rel_types.find());

  relations = _(relations).groupBy('relation_id')
    .map((r) => {
      return {
        senses: r.map(s => ({...s, unlinkifiedGloss: unlinkifyGloss(s.gloss)})),
        synset_id: r[0].synset_id
      }
    }).groupBy((r) => {
      // let type = types[r.senses[0].rel_type_id - 1];
      let type = types.find(t => t.id === r.senses[0].rel_type_id);
      return (type.is_symmetric || r.senses[0].synset_1_id === synset_id)
        ? helper.relation_types[type.name].text
        : helper.relation_types[type.name_inverse].text;
    }).value();

  all = Object.assign(all, relations);

  const gradset = await getGradset(synset_id, db, dbschema);
  if (gradset.length) all['Gradācijas jēdzienu grupa'] = gradset;

  const ordered = helper.orderRelations(all);

  return _.isEmpty(ordered) ? null : ordered;
}

async function getGradset(synset_id, db, dbschema) {
  let synset = await db[dbschema].synsets.findOne({id: synset_id});

  if (!synset) return [];

  let senses = await db.query(`
    SELECT ps.order_no AS parent_order_no,
           e.heading AS text,
           e.human_key,
           gradset_id,
           s.*
    FROM dict.senses s
    JOIN dict.synsets sy ON sy.id=s.synset_id
    LEFT JOIN dict.senses ps ON ps.id=s.parent_sense_id
    JOIN dict.entries e ON e.id=s.entry_id
    WHERE gradset_id = ${synset.gradset_id}
      OR s.synset_id =
        (SELECT synset_id
         FROM dict.gradsets
         WHERE id=${synset.gradset_id})
  `);
  return _(senses).groupBy('synset_id').values()
    .map((s) => ({
      senses: s.map(ss => ({...ss, unlinkifiedGloss: unlinkifyGloss(ss.gloss)})),
      synset_id: s[0].synset_id,
      display_info: s[0].gradset_id !== synset.gradset_id ? 'grupas nosaukums' : null
    }))
    .orderBy('display_info', 'asc')
    .value();
}

const pos_map = {
  'n': 'n',
  'v': 'v',
  'a': 'adj',
  's': 'adj',
  'r': 'adv',
};

const pwn_relation_map = {
  'eq_has_hyperonym': 'LV šaurāka nozīme',
  'eq_has_hyponym': 'LV plašāka nozīme',
};


const formatPWN = (s) => ({
  pwn: true,
  pos: s.pos,
  display_pos: pos_map[s.pos],
  remote_id: `${s.synsetOffset}-${s.pos === 's' ? 'a' : s.pos}`,
  gloss: s.gloss,
  def: s.def,
  examples: s.exp,
  senses: s.synonyms.map(syn => ({text: syn.split('_').join(' ')}))
});


async function getExternalLinks(synset_id, db, dbschema) {
  let links = await db[dbschema].synset_external_links.find({synset_id, link_type_id: 1});
  let result = await Promise.all(links.map(async (l) => {
    let res = {link_id: l.id, url: l.url, display_relation: l.data && l.data.Relation ? pwn_relation_map[l.data.Relation] : null};
    let [offset, pos] = l.remote_id.split('-');
    return Object.assign(res, await wordpos.seek(parseInt(offset), pos).then(s => formatPWN(s)));
  }));

  return result.length > 0 ? result : null;
}

module.exports = { loadFullEntry, buildFullEntry };
