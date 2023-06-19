var express = require('express');
const config = require('../config');
const _ = require('lodash');
const {query} = require("pg-monitor");
var router = express.Router();
const WordPOS = require('wordpos'),
  wordpos = new WordPOS({dictPath: require('path').join(__dirname, '../editor/data/dict_3.0')});
const model = require("../editor/model");
const {linkExternalDataToSynset} = require("../editor/wordnet");

const dbconn = config.dbconn;
const schema = config.DB_SCHEMA;

router.get('/_/wordnet', async (req, res, next) => {

  let entries = await (await dbconn).query(`
    SELECT * FROM ${schema}.wordnet_entries
    WHERE in_top = true and no IS NOT NULL
    `);
  let non_top_entries = await (await dbconn).query(`
    SELECT
      we.no,
      e.heading AS entry,
      we.senses_done,
      we.examples_done,
      we.visible_examples_done,
      we.inner_links_done,
      we.outer_links_done,
      we.comments,
      we.assignee,
      we.id
    FROM ${schema}.synsets sy 
    JOIN ${schema}.senses s ON s.synset_id = sy.id
    JOIN ${schema}.entries e ON e.id = s.entry_id
    LEFT OUTER JOIN ${schema}.wordnet_entries we ON we.entry = e.heading
    WHERE we.no IS NULL
    GROUP BY
      e.heading,
      we.no,
      we.senses_done,
      we.examples_done,
      we.visible_examples_done,
      we.inner_links_done,
      we.outer_links_done,
      we.comments,
      we.assignee,
      we.id
    ORDER BY
      MAX(sy.id)
`);
  let stats = await getWordnetStatistics();

  res.render('wordnet', {entries, non_top_entries, stats});
});

async function getSynsetRelationStats(db) {
  return await db.query(`
    SELECT type_id, count(*)
    FROM dict.synset_relations
    GROUP BY type_id
    UNION
    SELECT 6 as type_id, count(*) FROM dict.synsets
    WHERE gradset_id IS NOT NULL
    ORDER BY count DESC`
  );
}

async function getEntityRelationStats(db, entity) {
  let query = (entity === 'senses') ? 's.id' : 'entry_id';
  return await db.query(`
    SELECT type_id, count(*)
    FROM
      (SELECT distinct(${query}), type_id
       FROM dict.senses s
       JOIN dict.synset_relations r ON (s.synset_id=r.synset_1_id OR s.synset_id=r.synset_2_id)
       WHERE synset_id IS NOT NULL
       UNION
       SELECT distinct(${query}), 6 as type_id
       FROM dict.senses s
       JOIN dict.synsets sy ON sy.id=s.synset_id
       WHERE synset_id IS NOT NULL and gradset_id IS NOT NULL
       ) st
    GROUP BY type_id
    ORDER BY count(*) DESC
  `);
}

/**
 * Gets stats only for words from the top most frequent word list
 * @param db
 * @param phaseDone - 1: only inner links, 2: all links
 * @returns {Promise<{senses: *, words: number, synsets: number}>}
 */
async function getTopWordStats(db, phaseDone=1) {
  let phaseQuery = `
    AND w.senses_done 
    AND w.examples_done 
    AND w.visible_examples_done 
    AND w.inner_links_done`;

  if (phaseDone === 2) {
    phaseQuery += ' AND w.outer_links_done';
  }

  let senses = await db.query(`
    SELECT DISTINCT s.id AS sense_id,
                    s.entry_id,
                    w.entry,
                    s.synset_id
    FROM dict.senses s
    JOIN dict.entries e ON synset_id IS NOT NULL
    JOIN dict.wordnet_entries w ON w.entry=e.heading
    WHERE e.id=s.entry_id
      AND w.in_top=TRUE
      ${phaseQuery}`
  );

  return {
    senses: senses.length,
    words: _.uniqBy(senses, 'entry').length,
    synsets: _.uniqBy(senses, 'synset_id').length
  };
}

async function getPolysemyStats(db) {
  let sense_counts = await db.query(`
    SELECT sy.id, count(s.synset_id)
    FROM dict.synsets sy
    LEFT OUTER JOIN dict.senses s ON sy.id = s.synset_id
    GROUP BY sy.id
  `);

  let grouped = _.groupBy(sense_counts, ({count}) => {
    if (count === '1') return 'monosemous';
    if (count > 1) return 'polysemous';
    else return 'none';
  });
   let counts = {
     polysemous: grouped.polysemous.length,
     monosemous: grouped.monosemous.length
   };
   let mean = {
     polysemous: _.mean(grouped.polysemous.map(({count}) => parseInt(count))),
     all: _.mean(sense_counts.map(({count}) => parseInt(count))),
   };

  return {counts, mean};
}

async function getCounts(db, column) {
  return (await db.query(`
    SELECT count(distinct(${column}))
    FROM dict.senses
    WHERE synset_id IS NOT NULL`
  ))[0].count;
}

async function getExampleStats(db, bySense=false) {
  let query = bySense ? 'distinct(ex.sense_id)' : '*';
  let examples = (await db.query(`
    SELECT et.description,
           count(${query})
    FROM dict.examples ex
    JOIN dict.senses s ON s.id=ex.sense_id
    JOIN dict.entries en ON en.id=s.entry_id
    JOIN dict.entry_types et ON en.type_id=et.id
    GROUP BY et.description
  `));

  examples = examples.reduce((o, {description, count}) => ({...o, [description]: parseInt(count)}), {});
  examples.total = _.sum(Object.values(examples));

  return examples;
}

async function getPWNStats(db) {
  let pwn = await db.query(`
    SELECT DATA -> 'Relation' AS relation,
                 count(distinct(synset_id))
    FROM dict.synset_external_links
    GROUP BY relation
  `);

  relations = {
    'eq_has_hyperonym': 'LV šaurāka nozīme',
    'eq_has_hyponym': 'LV plašāka nozīme',
    'null': 'Ekvivalenta nozīme',
  };
  pwn = pwn.reduce((o, {relation, count}) => ({...o, [relations[relation]]: parseInt(count)}), {});
  total = await db.query(`SELECT count(distinct(synset_id)) FROM dict.synset_external_links`);
  pwn.total = total.length ? total[0].count : 0;

  return pwn;
}

async function getWordnetStatistics() {
  const db = (await dbconn);
  let data = {counts: {}};

  data.counts.synsets = await getCounts(db, 'synset_id');
  data.counts.senses = await getCounts(db, 'id');
  data.counts.words = await getCounts(db, 'entry_id');

  data.relations = (await db[schema].synset_rel_types.find()).reduce((acc, t) => (
      {...acc, [t.id]: {name: t.description + (t.is_symmetric ? '' : `/${t.description_inverse}`)}}),
    {});
  data.relations['6'] = {name: 'gradācijas kopa'};
  const processRelations = (relations, entity) => {
    relations.forEach(({type_id, count}) => {data.relations[type_id][entity] = count});
  };
  processRelations(await getSynsetRelationStats(db), 'synsets');
  processRelations(await getEntityRelationStats(db, 'words'), 'words');
  processRelations(await getEntityRelationStats(db, 'senses'), 'senses');
  data.counts.relations = Object.values(data.relations).reduce((a, {synsets}) => a + (synsets ? parseInt(synsets) : 0), 0);

  data.top = {};
  data.top.doneInner = await getTopWordStats(db, 1);
  data.top.done = await getTopWordStats(db, 2);
  data.polysemy = await getPolysemyStats(db);
  data.counts.examplesBySense = await getExampleStats(db, true);
  data.counts.examples = await getExampleStats(db);
  data.counts.pwn = await getPWNStats(db);
  return data;
}

// ----------------------------------------------------------

const formatPWN = (s) => ({
  display_pos: s.pos === 'r' || s.pos === 'a' ? 'adj' : (s.pos === 'r' ? 'adv' : s.pos),
  gloss: s.gloss,
  senses: s.synonyms
});

/**
 * Find the last potential link that the user processed
 */
async function getLastPotentialLinkNo(db, userId) {
  // TODO: this method will have a problem if: user manually chooses and edits a link much further down
  const lastAnswer = await db.query(`
    SELECT pl.order_no
    FROM ${schema}.potential_link_answers pla
    JOIN ${schema}.potential_links pl ON pl.id = pla.potential_link_id
    WHERE pla.user_id = ${userId}
    ORDER BY pl.order_no desc
    LIMIT 1
  `);
  // const lastAnswer = await db.query(`
  //   SELECT pl.order_no
  //   FROM ${schema}.potential_links pl
  //   JOIN ${schema}.potential_link_answers pla ON pl.id = pla.potential_link_id
  //   WHERE pla.user_id = ${userId}
  //   ORDER BY pl.order_no desc
  //   LIMIT 1
  // `);
  return lastAnswer.length > 0 ? lastAnswer[0].order_no : 0;
}

/**
 * Load data for the potential link that is shown on the first load of the page.
 */
async function getFirstPotentialLink(userId) {
  const db = (await dbconn);
  const orderNo = await getLastPotentialLinkNo(db, userId);
  const links = await getNextPotentialLinks(userId, orderNo, 0, 1);
  if (links.length === 0) {
    console.log('no potential links found!');
  }
  let link = links[0];

  return link;
}

/**
 * Load read-only link info for a potential link
 */
async function getPotentialLink(id) {
  const db = (await dbconn);
  const link = await db[schema].potential_links.findOne({id});
  return link ? (await getFullPotentialLink(db, link)) : null;
}

async function getFullPotentialLink(db, link) {
  let guesses = await db[schema].potential_link_guesses.find({potential_link_id: link.id});
  const pwnIds = guesses.map(g => g.pwn);
  const pwnInfo = await getFullPwnInfo(pwnIds);
  for (let j = 0; j < guesses.length; ++j) {
    guesses[j].synset = pwnInfo[guesses[j].pwn];
  }

  const sense = await db.query(`
    SELECT s.*, ps.order_no AS parent_order_no, e.heading
    FROM ${schema}.senses s
           JOIN ${schema}.entries e ON e.id = s.entry_id
           LEFT JOIN ${schema}.senses ps ON ps.id = s.parent_sense_id
    WHERE s.id = ${link.sense_id}
  `);
  // if (sense.length === 0) {
  //   toRemove.push(link.sense_id);
  //   console.log('SENSE NOT FOUND');
  // }
  link.sense = sense[0];
  link.guesses = guesses;
  return link;
}

async function getFullPwnInfo(pwnIds) {
  let results = {};
  for (let j = 0; j < pwnIds.length; ++j) {
    let [offset, pos] = pwnIds[j].split('-');
    const synset = await wordpos.seek(parseInt(offset), pos)
      .then(s => formatPWN(s));
    results[pwnIds[j]] = synset;
  }
  return results;
}

/**
 * Preload next few links for a user
 * TODO: load one by one and check whether sense_id is ok and not already answered
 */
async function getNextPotentialLinks(userId, currentOrderNo, from, to) {
  const db = (await dbconn);

  // let links = await db.query(`
  //   SELECT pl.*
  //   FROM ${schema}.potential_links pl
  //   ORDER BY RANDOM ()
  //     LIMIT ${to - from}
  // `);

 let links = await db.query(`
    SELECT pl.*
    FROM ${schema}.potential_links pl
    ORDER BY order_no OFFSET ${currentOrderNo+from}
      LIMIT ${to - from}
  `);

  // let toRemove = []; // just in case
  for (let i = 0; i < links.length; ++i) {
    links[i] = await getFullPotentialLink(db, links[i]);
  }
  // toRemove.forEach(sense_id => links.splice(links.indexOf(sense_id), 1));

  return links;
}

// TODO: this is temp; create a db table with potential link answer types
const answerTypes = {
  'yes': 1,
  'no': 2,
  'more_info_needed': 3,
  'not_eq': 4
};
const answerTypeToString = {
  1: 'Jā',
  2: 'Nē',
  3: 'Vajag vairāk info',
  4: 'Šaurāks/plašāks'
};

/**
* Save user's validation of a potential link
* */
async function saveAnswer(withTx, data) {
  return await withTx(async tx => {
    let info = {
      potential_link_id: data.id,
      user_id: data.user_id
    };
    const oldAnswer = await tx[schema].potential_link_answers.findOne(info);
    info.guess_id = data.guess_id;
    info.answer_type = answerTypes[data.answer];

    if (oldAnswer) { // update
      info.updated_at = new Date();
      return await tx[schema].potential_link_answers.save(info);
    }
    return await tx[schema].potential_link_answers.insert(info);
  });
}

/**
 * Get all the information needed for the result page
 * Checks whether the linked PWN is already
 * (1) manually linked to a lv synset
 * (2) potentially linked to some another lv sense
 */
async function getPotentialLinkAnswers() {
  const db = (await dbconn);
  const formatSense = (pl) => ({
    potential_link_id: pl[0].potential_link_id,
    heading: pl[0].heading,
    gloss: pl[0].gloss,
    order_no: pl[0].order_no,
    parent_order_no: pl[0].parent_order_no
  });

  const  potentialLinkStatus = (status, answers) => {
    const same =
      _.intersectionBy(answers, 'guess_id').length === 1
      && _.intersectionBy(answers, 'answer_type').length === 1;
    return same ? 'Sakrīt' : 'Nesakrīt';
  };

  // check whether there are other potential links with the same pwn answer
  const otherLinkAnswers = (ans, potential_link_id) => {
    const other = ans.filter(a => a.potential_link_id !== potential_link_id);
    return other.length > 0 ? other : null;
  }

  let answers = await db.query(`
    SELECT pla.id as id, 
           pl.status, 
           pla.*, 
           s.*, 
           ps.order_no AS parent_order_no, 
           e.heading, 
           plg.pwn,
           plg.no,
           u.full_name as user,
           sel.id as external_link_id
    FROM ${schema}.potential_link_answers pla
           JOIN ${schema}.potential_links pl ON pla.potential_link_id = pl.id
           JOIN ${schema}.senses s ON pl.sense_id = s.id
           JOIN ${schema}.entries e ON e.id = s.entry_id
           LEFT JOIN ${schema}.users u ON pla.user_id = u.id
           LEFT JOIN ${schema}.potential_link_guesses plg ON plg.id = pla.guess_id
           LEFT JOIN ${schema}.senses ps ON ps.id = s.parent_sense_id
           LEFT JOIN ${schema}.synset_external_links sel on CAST(sel.data -> 'PotentialLinkId' AS INTEGER)  = pl.id
  `);
  const pwnIds = _.compact(answers.map(a => a.pwn));
  const pwnInfo = await getFullPwnInfo(pwnIds);
  const answersByPWN = _(answers).filter('pwn').groupBy('pwn').value();
  // console.log(answers);

  let manual = await db.query(`
    SELECT e.heading,
           ps.order_no AS parent_order_no,
           s.order_no,
           s.synset_id,
           sel.remote_id,
           sel.data -> 'Relation' as relation
    FROM ${schema}.synset_external_links sel
           JOIN dict.senses s ON s.synset_id = sel.synset_id
           JOIN dict.entries e ON e.id = s.entry_id
           LEFT JOIN dict.senses ps ON ps.id = s.parent_sense_id
    WHERE sel.remote_id in (${pwnIds.map(id => `'${id}'`).join(',')})
  `);
  manual = _(manual).groupBy('remote_id').mapValues(m => _.groupBy(m, 'synset_id')).value();
  // console.log(manual);

  answers = _(answers).groupBy('potential_link_id').values()
    .map(pl => ({
      id: pl[0].potential_link_id,
      sense: formatSense(pl),
      votes: pl.length,
      status: potentialLinkStatus(pl[0].status, pl),
      in_wordnet: pl[0].external_link_id === null ? 'Nē' : 'Jā',
      answers: pl.map(a => ({
        ...a,
        answer_type_str: answerTypeToString[a.answer_type],
        pwn_info: pwnInfo[a.pwn],
        manual: manual[a.pwn],
        other: a.pwn ? otherLinkAnswers(answersByPWN[a.pwn], a.potential_link_id) : null
      }))
    })).value();

  return answers;
}

/**
 * Calculate and save the (deterministic) order in which links should be shown.
 * Version 1: entries with 1 sense + no manual links
 * */
async function reorderPotentialLinks(withTx) {
  return await withTx(async tx => {
    console.log('reorder 1');
    const db = (await dbconn);
    await db.query(`
      UPDATE ${schema}.potential_links
      SET order_no = NULL
    `) // clear the previous ordering

    let links = await db.query(`
      SELECT pl.id as id, pl.sense_id as sense_id, pl.status as status, e.heading
      FROM ${schema}.potential_links pl
             LEFT JOIN ${schema}.senses s ON s.id = pl.sense_id
             JOIN ${schema}.entries e ON e.id = s.entry_id
             LEFT JOIN ${schema}.senses so ON s.entry_id = so.entry_id
      WHERE s.synset_id is NULL
  `);
    links = _(links)
      .groupBy('id')
      .filter(senses => senses.length === 1)
      .mapValues(v => v[0])
      .value();

    // console.log(Object.keys(links).length);
    links = Object.values(links);

    // NULL if a link shouldn't be shown
    for (let i = 1; i < links.length; ++i) {
      // console.log(i, links[i].heading);
      await tx[schema].potential_links.save({
        id: links[i].id,
        status: links[i].status,
        sense_id: links[i].sense_id,
        order_no: i
      });
    }
  });
}

/**
 * Add all potential links to the main wordnet if they meet the validation criteria
 * @param withTx
 * @returns {Promise<void>}
 */
async function addValidLinksToWordnet(withTx) {
  return await withTx(async tx => {
    // The default: Agute (16, agute), Laura (6, laura), and Madara (17, madara) agree

    const db = (await dbconn);
    // Get all potential links for which all users have the same answer + the answer is "yes"
    let links = await db.query(`
      SELECT laura.potential_link_id, laura.guess_id, pl.sense_id, plg.pwn
      FROM   ${schema}.potential_link_answers laura
               JOIN ${schema}.potential_link_answers agute ON agute.potential_link_id = laura.potential_link_id
               JOIN ${schema}.potential_link_answers madara ON madara.potential_link_id = laura.potential_link_id
               JOIN ${schema}.potential_link_guesses plg ON plg.id = laura.guess_id
               JOIN ${schema}.potential_links pl ON pl.id = laura.potential_link_id
               JOIN ${schema}.senses s ON s.id = pl.sense_id
      WHERE laura.user_id = 6
        AND agute.user_id = 16
        AND madara.user_id = 17
        AND s.synset_id IS NULL
        AND ( laura.guess_id = agute.guess_id AND laura.guess_id = madara.guess_id )
    `); // todo: This is just hardcoded ids

    // Create the new links
    for (const link of links) {
      await linkExternalDataToSynset(tx, link, link.pwn, 'omw',
        {Source: 'Manuālā pārbaude', PotentialLinkId: link.potential_link_id}
      );
    }

    return links.length;
  });
}

/**
 * Temporary function to fix the external wordnet IDs.
 * Some incorrectly have "-a" not "-s"
 * @param withTx
 * @returns {Promise<*>}
 */
async function fixWordnetRemoteIds(withTx) {
  return await withTx(async tx => {
    const db = (await dbconn);
    let test = await db.query(`
      select * from ${schema}.synset_external_links
      where remote_id like '%-a'
    `);

    let bad = [];
    for (let j = 0; j < test.length; ++j) {
      let [offset, pos] = test[j].remote_id.split('-');
      const synset = await wordpos.seek(parseInt(offset), pos);
      if (synset.pos === 's') { // These should have a "-s" ending not a "-a"
        test[j].remote_id = `${offset}-s`;
        await tx[schema].synset_external_links.save(test[j]);
        bad.push(offset);
      }
    }

    return bad;
  });
}

// ----------------------------------------------------------

const wrapAsync = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next))
    .catch(e => {
      console.trace('Error', e);
      res.json({error: `${e.message}`})
    });
};

function withUserTx(req) {
  return async callback => {
    return await (await config.dbconn).withTransaction(async tx => {
      const userId = req.user && req.user.id;
      if (userId) await tx.query(`set local myvars.appuser=${userId}`);
      return await callback(tx);
    });
  }
}

router.get('/_/wordnet/potential_links', async (req, res, next) => {
  res.render('wordnet/potential_links', {link: await getFirstPotentialLink(req.user.id), readOnly: false});
});

router.post('/_/wordnet/potential_links/:link_id', wrapAsync(async (req, res) => {
  if (req.user) {
    req.body.user_id = req.user.id;
  }
  await res.json(await saveAnswer(withUserTx(req), req.body));
}));

router.get('/_/wordnet/potential_links/next/:current/:from/:to', wrapAsync(async (req, res) => {
  const currentOrderNo = parseInt(req.params.current, 10);
  const from = parseInt(req.params.from, 10);
  const to = parseInt(req.params.to, 10);
  return res.json(await getNextPotentialLinks(req.user, currentOrderNo, from, to));
}));

router.get('/_/wordnet/potential_links/add_valid', wrapAsync(async (req, res) => {
  await res.json(await addValidLinksToWordnet(withUserTx(req)));
}));

router.get('/_/wordnet/potential_links/answers', async (req, res, next) => {
  res.render('wordnet/potential_link_answers', {answers: await getPotentialLinkAnswers()});
});

router.get('/_/wordnet/potential_links/reorder/1', wrapAsync(async (req, res) => {
  await res.json(await reorderPotentialLinks(withUserTx(req)));
}));

router.get('/_/wordnet/potential_links/:link_id', async (req, res, next) => {
  const linkId = parseInt(req.params.link_id, 10);
  res.render('wordnet/potential_links', {link: await getPotentialLink(linkId), readOnly: true});
});

router.get('/_/wordnet/fix', wrapAsync(async (req, res) => {
  await res.json(await fixWordnetRemoteIds(withUserTx(req)));
}));

// ----------------------------------------------------------

module.exports = router;
