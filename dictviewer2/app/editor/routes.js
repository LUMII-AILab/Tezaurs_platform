const express = require('express');
const router = express.Router();
const debug = require('debug')('routes');
const _ = require('lodash');
const c = require('ansi-colors');

const model = require('./model');
const config = require('../config');
const wordnet = require('./wordnet');

const wrapAsync = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next))
    .catch(e => {
      console.trace('Error', e);
      console.trace('Route', c.yellow(req.path), req.method);
      res.json({error: `${e.message}`})
    });
};

const handleEntity = (schema, callback) => wrapAsync(async (req, res, next) => {
  const data = req.body;
  // debug('form data raw', JSON.stringify(req.body));
  let r = {};
  try {
    r.data = await schema.validate(data, {abortEarly: false});
  } catch (e) {
    console.trace();
    debug('Validate error', e);
    r.data = e.value;
    r.error = e && e.errors && e.errors.length > 0 ? e.errors.join('\n') : 'Kļūda';
  }
  if (!r.error) {
    try {
      // debug('form data', req.params, res.locals.form);
      debug('form data', req.originalUrl, req.params, JSON.stringify(r.data));
      r.result = await callback(r.data, req, res, next);
      if (res.headersSent) return; // stop if callback already handled response
      r.message = 'Saglabāts';
    } catch (err) {
      console.trace(err);
      r.error = err.message;
    }
  }
  return res.json(r);
});

function withUserTx(req) {
  return async callback => {
    return await (await config.dbconn).withTransaction(async tx => {
      const userId = req.user && req.user.id;
      if (userId) await tx.query(`set local myvars.appuser=${userId}`);
      return await callback(tx);
    });
  }
}

router.post('/api/entries', handleEntity(model.entrySchema, async (data, req, res) => {
  const r = await model.createEntry(withUserTx(req), data);
  return res.json({data: r})
}));

router.get('/api/entries/next_homonym/:heading', wrapAsync(async (req, res) => {
  let r = await model.getNextHomonym(req.params.heading);
  return res.json({data: r})
}));

router.patch('/api/entries/:entry_id', handleEntity(model.entrySchema, async (data, req, res) => {
  const id = parseInt(req.params.entry_id, 10);
  return await model.updateEntry(withUserTx(req), id, data);
}));

router.delete('/api/entries/:entry_id', wrapAsync(async (req, res) => {
  await res.json(await model.deleteEntry(withUserTx(req), parseInt(req.params.entry_id, 10)));
}));

router.get('/api/entries/:entry_id/dependents', wrapAsync(async (req, res) => {
  const id = parseInt(req.params.entry_id, 10);
  return res.json(await model.dependentsForEntry(withUserTx(req), id));
}));

router.get('/api/suggest/entries', wrapAsync(async (req, res) => {
  const q = req.query.q || '';
  const ignore = parseInt(req.query.ignore, 10);
  return res.json(await model.suggestEntries(q, req.query.entry_type_id && parseInt(req.query.entry_type_id), ignore));
}));

router.get('/api/suggest/senses/:entry_id', wrapAsync(async (req, res) => {
  const entry_id = parseInt(req.params.entry_id, 10);
  return res.json(await model.suggestSenses(entry_id));
}));


router.post('/api/entries/:entry_id/lexemes', handleEntity(model.lexemeSchema, async (data, req, res) => {
  const entry_id = parseInt(req.params.entry_id, 10);
  return await model.createLexeme(withUserTx(req), entry_id, data);
}));

router.patch('/api/entries/:entry_id/lexemes/:id', handleEntity(model.lexemeSchema, async (data, req, res) => {
  const entry_id = parseInt(req.params.entry_id, 10);
  const id = parseInt(req.params.id, 10);
  return await model.updateLexeme(withUserTx(req), entry_id, id, data);
}));

router.delete('/api/entries/:entry_id/lexemes/:id', wrapAsync(async (req, res) => {
  const entry_id = parseInt(req.params.entry_id, 10);
  const id = parseInt(req.params.id, 10);
  return res.json(await model.deleteLexeme(withUserTx(req), entry_id, id));
}));

router.post('/api/entries/:entry_id/senses', handleEntity(model.senseSchema, async (data, req, res, next) => {
  const entry_id = parseInt(req.params.entry_id, 10);
  res.json(await model.createSense(withUserTx(req), entry_id, data));
}));

router.patch('/api/entries/:entry_id/senses/:id', handleEntity(model.senseSchema, async (data, req, res, next) => {
  const entry_id = parseInt(req.params.entry_id, 10);
  const id = parseInt(req.params.id, 10);
  res.json(await model.updateSense(withUserTx(req), entry_id, id, data));
}));

router.delete('/api/entries/:entry_id/senses/:id', wrapAsync(async (req, res) => {
  const entry_id = parseInt(req.params.entry_id, 10);
  const id = parseInt(req.params.id, 10);
  res.json(await model.deleteSense(withUserTx(req), entry_id, id));
}));

router.get('/api/entries/:entry_id/senses/:id/dependents', wrapAsync(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  return res.json(await model.dependentsForSense(withUserTx(req), id));
}));

router.post('/api/entries/:entry_id/senses/:parent_sense_id/senses', handleEntity(model.senseSchema, async (data, req, res, next) => {
  const entry_id = parseInt(req.params.entry_id, 10);
  const parent_sense_id = parseInt(req.params.parent_sense_id, 10);
  res.json(await model.createSubSense(withUserTx(req), entry_id, parent_sense_id, data));
}));

router.patch('/api/entries/:entry_id/senses/:parent_sense_id/senses/:id', handleEntity(model.senseSchema, async (data, req, res, next) => {
  const entry_id = parseInt(req.params.entry_id, 10);
  const parent_sense_id = parseInt(req.params.parent_sense_id, 10);
  const id = parseInt(req.params.id, 10);
  res.json(await model.updateSubSense(withUserTx(req), entry_id, parent_sense_id, id, data));
}));

router.delete('/api/entries/:entry_id/senses/:parent_sense_id/senses/:id', wrapAsync(async (req, res) => {
  const entry_id = parseInt(req.params.entry_id, 10);
  const parent_sense_id = parseInt(req.params.parent_sense_id, 10);
  const id = parseInt(req.params.id, 10);
  res.json(await model.deleteSubSense(withUserTx(req), entry_id, parent_sense_id, id));
}));

router.get('/api/entries/:entry_id/senses/:parent_sense_id/senses/:id/dependents', wrapAsync(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  return res.json(await model.dependentsForSense(withUserTx(req), id));
}));

router.post('/api/entries/:entry_id/senses/:sense_id/sense_mwe_link', handleEntity(model.mweLinkSchema, async (data, req, res) => {
  const sense_id = parseInt(req.params.sense_id, 10);
  res.json(await model.createSenseMweLink(withUserTx(req), sense_id, data));
}));

router.patch('/api/entries/:entry_id/senses/:sense_id/sense_mwe_link/:mwe_id', wrapAsync(async (req, res) => {
  const sense_id = parseInt(req.params.sense_id, 10);
  const mwe_id = parseInt(req.params.mwe_id, 10);
  res.json(await model.updateSenseMweLink(withUserTx(req), mwe_id, sense_id, req.body));
}));

router.delete('/api/entries/:entry_id/senses/:sense_id/sense_mwe_link/:mwe_id', wrapAsync(async (req, res) => {
  const sense_id = parseInt(req.params.sense_id, 10);
  const mwe_id = parseInt(req.params.mwe_id, 10);
  res.json(await model.deleteSenseMweLink(withUserTx(req), sense_id, mwe_id));
}));

router.post('/api/entries/:entry_id/senses/:sense_id/examples', handleEntity(model.exampleSchema, async (data, req, res) => {
  const sense_id = parseInt(req.params.sense_id, 10);
  res.json(await model.createSenseExample(withUserTx(req), sense_id, data));
}));

router.patch('/api/entries/:entry_id/senses/:sense_id/examples/:id', handleEntity(model.exampleSchema, async (data, req, res) => {
  const sense_id = parseInt(req.params.sense_id, 10);
  const id = parseInt(req.params.id, 10);
  res.json(await model.updateSenseExample(withUserTx(req), sense_id, id, data));
}));

router.delete('/api/entries/:entry_id/senses/:sense_id/examples/:id', wrapAsync(async (req, res) => {
  const sense_id = parseInt(req.params.sense_id, 10);
  const id = parseInt(req.params.id, 10);
  res.json(await model.deleteSenseExample(withUserTx(req), sense_id, id));
}));

router.post('/api/entries/:entry_id/relations', handleEntity(model.entryRelationSchema, async (data, req, res) => {
  res.json(await model.createEntryRelation(withUserTx(req), data));
}));

router.delete('/api/entries/:entry_1_id/entry_mwe_link/:entry_2_id', wrapAsync(async (req, res) => {
  res.json(await model.deleteEntryRelation(withUserTx(req), { 
    entry_1_id: parseInt(req.params.entry_1_id, 10), 
    type_id: 3,
    entry_2_id: parseInt(req.params.entry_2_id, 10) 
  }));
}));

router.delete('/api/entry_relations/:rel_id', wrapAsync(async (req, res) => {
  res.json(await model.deleteEntryRelation(withUserTx(req), { 
    rel_id: parseInt(req.params.rel_id, 10)
  }));
}));

router.patch('/api/entries/:entry_id/merge', handleEntity(model.entryMergeSchema, async (data, req, res) => {
  res.json(await model.mergeEntries(withUserTx(req), data));
}));

router.post('/api/wordnet/examples', wrapAsync(async (req, res) => {
  const data = req.body || '';
  return res.json(await wordnet.getExamplesFromSketchEngine(data));
}));

router.patch('/api/wordnet/:wordnet_entry_id/:column(senses_done|examples_done|visible_examples_done|inner_links_done|outer_links_done|assignee|comments)',
  wrapAsync(async (req, res) => {
    const wordnet_entry_id = parseInt(req.params.wordnet_entry_id, 10);
    const column = req.params.column;
    return res.json(await wordnet.updateEntry(withUserTx(req), wordnet_entry_id, {[column]: req.body.value}));
  })
);

router.post('/api/wordnet/wordnet_entry', wrapAsync(async (req, res) => {
  const entry = req.body.entry;
  res.json(await wordnet.createWordnetEntry(withUserTx(req), entry));
}));

router.post('/api/wordnet/wordnet_comments/:entry_id',
  wrapAsync(async (req, res) => {
    const entry_id = parseInt(req.params.entry_id, 10);
    return res.json(await wordnet.addWordnetComments(withUserTx(req), entry_id, req.body.value));
  })
);

router.post('/api/wordnet/sketch_engine_error',
  wrapAsync(async (req, res) => {
    return res.json(await wordnet.saveSketchEngineError(withUserTx(req), req.body));
  })
);

router.post('/api/wordnet/sketch_engine_error/list',
  wrapAsync(async (req, res) => {
    return res.json(await wordnet.getSketchEngineErrors(withUserTx(req), req.body));
  })
);

router.post('/api/wordnet/suggest/synset', wrapAsync(async (req, res) => {
  const q = req.body.q || '';
  const filter = req.body.filter;
  return res.json(await wordnet.suggestSynset(q, filter));
}));

router.post('/api/wordnet/suggest/pwn', wrapAsync(async (req, res) => {
  const q = req.body.q || '';
  const filter = req.body.filter;
  return res.json(await wordnet.suggestPWNSynset(q, filter));
}));

router.get('/api/wordnet/sense/synset/:sense_id', wrapAsync(async (req, res) => {
  const sense_id = parseInt(req.params.sense_id, 10);
  return res.json(await wordnet.getSynset(sense_id));
}));

router.get('/api/wordnet/synset/relations/:synset_id', wrapAsync(async (req, res) => {
  const synset_id = parseInt(req.params.synset_id, 10);
  return res.json(await wordnet.getSynsetRelations(synset_id));
}));

router.delete('/api/wordnet/synset/relations/:id', wrapAsync(async (req, res) => {
  res.json(await wordnet.deleteSynsetRelation(withUserTx(req), parseInt(req.params.id, 10)));
}));

router.get('/api/wordnet/synset/external_links/relations/:remote_id/:type', wrapAsync(async (req, res) => {
  const remote_id = req.params.remote_id;
  const type = req.params.type;
  return res.json(await wordnet.getExternalLinkRelations(remote_id, type));
}));

router.delete('/api/wordnet/synset/external_links/:id', wrapAsync(async (req, res) => {
  res.json(await wordnet.deleteExternalLink(withUserTx(req), parseInt(req.params.id, 10)));
}));

router.post('/api/wordnet/synset/create',
  wrapAsync(async (req, res) => {
    const a = req.body.a;
    const b = req.body.b;
    const type = req.body.type;
    return res.json(await wordnet.processSynsetRelation(withUserTx(req), a, b, type));
  })
);

router.patch('/api/wordnet/synset/change',
  wrapAsync(async (req, res) => {
    const synset_id = req.body.synset_id;
    const sense_id = req.body.sense_id;
    return res.json(await wordnet.changeSynset(withUserTx(req), synset_id, sense_id));
  })
);

router.patch('/api/wordnet/synset/:id', wrapAsync(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = req.body;
  res.json(await wordnet.updateSynset(withUserTx(req), id, data));
}));

router.post('/api/entries/:entry_id/sources', handleEntity(model.entrySourceSchema, async (data, req, res) => {
  res.json(await model.createEntrySource(withUserTx(req), parseInt(req.params.entry_id, 10), data));
}));

router.patch('/api/entries/:entry_id/sources/:id', handleEntity(model.entrySourceSchema, async (data, req, res) => {
  res.json(await model.updateEntrySource(withUserTx(req), parseInt(req.params.entry_id, 10), parseInt(req.params.id, 10), data));
}));

router.delete('/api/entries/:entry_id/sources/:id', wrapAsync(async (req, res) => {
  res.json(await model.deleteEntrySource(withUserTx(req), parseInt(req.params.entry_id, 10), parseInt(req.params.id, 10)));
}));

router.put('/api/:entity/:id/move/:context_id/:position', wrapAsync(async (req, res) => {
  debug('move', req.originalUrl, req.params);
  const entity = req.params.entity
  const id = parseInt(req.params.id, 10);
  const context_id = parseInt(req.params.context_id, 10);
  const position = parseInt(req.params.position, 10);
  let r = {};
  try {
    if (entity === 'senses') r.result = await model.moveSense(withUserTx(req), context_id, id, position);
    else if (entity === 'sub_senses') r.result = await model.moveSubSense(withUserTx(req), context_id, id, position);
    else if (entity === 'lexemes') r.result = await model.moveLexeme(withUserTx(req), context_id, id, position);
    else if (entity === 'entry_examples') r.result = await model.moveEntryExample(withUserTx(req), context_id, id, position);
    else if (entity === 'sense_examples') r.result = await model.moveSenseExample(withUserTx(req), context_id, id, position);
    else if (entity === 'sources') r.result = await model.moveEntrySource(withUserTx(req), context_id, id, position);
    else throw new Error('Nekorekta entīte kārtošanai');
    r.message = 'Saglabāts';
  } catch (err) {
    console.trace(err);
    r.error = err.message;
  }
  await res.json(r);
}));

router.put('/api/senses/:id/change_parent/:entry_id/:position', wrapAsync(async (req, res) => {
  const sense_id = parseInt(req.params.id, 10);
  const entry_id = parseInt(req.params.entry_id, 10);
  const new_parent_order_no = parseInt(req.params.position, 10);
  let r = {};
  try {
    r.result = await model.changeSenseParent(withUserTx(req), entry_id, sense_id, new_parent_order_no);
    r.entry = await model.getEntry(entry_id);
    r.message = 'Saglabāts';
  } catch (err) {
    console.trace(err);
    r.error = err.message;
  }
  await res.json(r);
}));

router.get('/api/entries/existing', wrapAsync(async (req, res) => {
  return res.json(await model.getExistingEntries(req.query.q));
}));

router.get('/api/lexemes/existing', wrapAsync(async (req, res) => {
  return res.json(await model.getExistingLexemes(req.query.q));
}));

module.exports = router;
