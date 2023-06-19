const debug = require('debug')('model');
const _ = require('lodash');
const yup = require('yup');
const config = require('../config');

const dbconn = config.dbconn;
const schema = config.DB_SCHEMA;
// const release = config.RELEASE;

const ENTRY_TYPES = {
  word: 1,
  idiom: 2,
  taxon: 3,
  otherMWE: 4,
};

const GLOSS_LINK_TYPE_ID = 4; // fix to db id

yup.addMethod(yup.object, 'noUnknownKeys', function() {
  return this.test('pattern', function(value, path, context) {
    // console.log('unk', this.schema.fields)
    let known = Object.keys(this.schema.fields);
    let unknownKeys = Object.keys(value || {}).filter(key => known.indexOf(key) === -1 && !key.startsWith('data.Gram.Flags.'));
    return value == null || unknownKeys.length === 0 || this.createError({message: 'Unknown keys: ' + unknownKeys.join(' '), path});
  })
});
yup.addMethod(yup.string, 'nullify', function() {
  return this.nullable().transform(function(value, originalValue) {
    return value === '' ? null : value;
  });
});
yup.addMethod(yup.array, 'split', function() {
  return this.nullable().transform(function(value, originalValue) {
    return originalValue != null && _.map(originalValue.split('|'), _.trim).filter(e => e !== '') || null;
  }).of(yup.string());
});

const _cleanupData = d => {
  if (_.isArray(d))  return _.reject(_.map(d, _cleanupData), e => e == null || _.isObject(e) && _.isEmpty(e));
  else if ( _.isObject(d)) {
    let v = _.omitBy(_.mapValues(d, _cleanupData), e => e == null || _.isObject(e) && _.isEmpty(e));
    return _.isEmpty(v) ? null : v;
  }
  else if (_.isString(d)) {
    // strip all string values and nullify if empty
    return d.replace(/^\s+|\s+$/g, '') || null;
  }
  return d;
}

const getUpdate = (currentData, formData, defaultData) => {
  currentData = formData
  if (defaultData) currentData = Object.assign(currentData, defaultData);
  // cleanup data from null and empty values
  if (currentData.data) currentData.data = _cleanupData(currentData.data);
  if (currentData.data && !Object.keys(currentData.data).length) currentData.data = null;
  debug('form update', JSON.stringify(currentData));
  return currentData;
};

const structuralRestrictionsSchema = yup.lazy(v => {
  if (v == null) return yup.object().default(undefined).nullable();
  else if (v.hasOwnProperty('AND')) return yup.object({AND: yup.array().of(structuralRestrictionsSchema).compact().min(2).nullable()}).default(undefined).nullable();
  else if (v.hasOwnProperty('OR')) return yup.object({OR: yup.array().of(structuralRestrictionsSchema).compact().min(2).nullable()}).default(undefined).nullable();
  else return yup.object({
    Restriction: yup.string().trim().nullify().required(),
    Frequency: yup.string().trim().nullify().nullable(),
    Value: yup.object({
      Flags: yup.object().transform(_cleanupData).nullable(),
      LanguageMaterial: yup.array().of(yup.string().trim().nullify()).compact().nullable(),
    }).default(undefined).nullable(),
  }).default(undefined).nullable()
    .test('overallFrequency', '${path} "Biežums" ir obligāts lauks', v => v == null || v.Restriction !== 'Vispārīgais lietojuma biežums' || v.Frequency != null)
    .test('not overallFrequency', '${path} Vismaz viens no laukiem "Valodas materiāls" vai "Karodziņi" ir obligāts', v => v == null || v.Restriction === 'Vispārīgais lietojuma biežums' || (v.Value != null && (v.Value.LanguageMaterial != null || v.Value.Flags != null)))
});

const entrySchema = yup.object().shape({
  type_id: yup.number().required(),
  homonym_no: yup.number().required(),
  heading: yup.string().trim().nullify().required(),
  heading_is_primary_lexeme: yup.boolean(),
  data: yup.object({
    SciName: yup.array().of(yup.string()).nullable(),
    Etymology: yup.string().trim().nullify(),
    Normative: yup.string().trim().nullify(),
    Gram: yup.object({
      FreeText: yup.string().trim().nullify(),
      StructuralRestrictions: structuralRestrictionsSchema,
    }),
  }),
  notes: yup.string().trim().nullify(),
  hidden: yup.boolean(),
});

async function createEntry(withTx, data) {
  return await withTx(async tx => {
    // const entry = await tx[schema].entries.save(getUpdate(null, data, {release_id: config.RELEASE}));
    const entry = await tx[schema].entries.save(getUpdate(null, data));
    const lexeme = await tx[schema].lexemes.save({entry_id: entry.id, type_id: 1, paradigm_id: null, lemma: entry.heading, order_no: 1}); // default lexeme
    return tx[schema].entries.save({id: entry.id, primary_lexeme_id: lexeme.id});
  });
}

async function getNextHomonym(heading, conn=null) {
  conn = conn || await dbconn;
  const homonym_no = (await conn.query('select coalesce(max(homonym_no + 1), 1) as homonym_no from dict.entries where heading = ${heading}', {heading}))[0].homonym_no;
  return {homonym_no};
}

async function updateEntry(withTx, id, data) {
  return await withTx(async tx => {
    const oldData = await tx[schema].entries.findOne({id});
    const update = getUpdate(oldData, data, {id});
    delete update.human_key; // exclude human_key from update
    if (update.heading_is_primary_lexeme) {
      update.heading = (await tx[schema].lexemes.findOne({id: update.primary_lexeme_id})).lemma;
    }
    if (oldData.heading !== update.heading) data.homonym_no = (await getNextHomonym(update.heading, tx)).homonym_no;
    const result = await tx[schema].entries.save(update);
    debug('entry updated', result);
    return result;
  });
}

async function deleteEntry(withTx, id) {
  return await withTx(async tx => {
    const result = await tx[schema].entries.destroy({id});
    debug('entry deleted', result);
    return result;
  });
}

/**
 * Finds and returns a string with info about all gloss links
 *   that link to the entry or any sense of the entry
 */
async function dependentsForEntry(withTx, id) {
  return await withTx(async tx => {
    let glossLinks = [];
    (await getDependentsForEntry(tx, id)).forEach(gl => glossLinks.push(gl));
    const senses = await tx[schema].senses.find({entry_id: id});
    for (const sense of senses) {
      (await getDependentsForSense(tx, sense.id)).forEach(gl => glossLinks.push(gl));
    }

    if (glossLinks && glossLinks.length > 0) {
      return `Saites nozīmju skaidrojumos:<br>${glossLinks.join('<br>')}`;
    }
    return null;
  })
}

async function reorder(table_obj, filter, predicate=null, position=null) {
  let entities = await table_obj.find(filter, {order: [{field: 'order_no', direction: 'asc', nulls: 'last'}]});
  if (entities.length && predicate != null && position != null) {
    // move element matching predicate to the specific position in the array
    // let x = [{a: 1}, {a: 2}, {a: 3}, {a: 4}]
    // x.splice(0, 0, x.splice(_.findIndex(x, {a:2}), 1)[0])
    entities.splice(position - 1, 0, entities.splice(_.findIndex(entities, predicate), 1)[0]);
  }
  // debug('reorder', filter, entities);
  for (let [i, e] of entities.entries()) {
    i = i + 1;
    if (e.order_no !== i) {
      debug('move entity', e.order_no, '->', i)
      e.order_no = i;
      await table_obj.save(e);
    }
  }
}

async function moveSense(withTx, entry_id, sense_id, position) {
  return await withTx(async tx => {
    await reorder(tx[schema].senses, {entry_id, parent_sense_id: null}, e => e.id === sense_id, position);
  })
}

async function reorderSenses(tx, entry_id) {
  await reorder(tx[schema].senses, {entry_id, parent_sense_id: null});
}

async function moveSubSense(withTx, parent_sense_id, sense_id, position) {
  return await withTx(async tx => {
    await reorder(tx[schema].senses, {parent_sense_id}, e => e.id === sense_id, position);
  })
}

async function reorderSubSenses(tx, parent_sense_id) {
  await reorder(tx[schema].senses, {parent_sense_id});
}

async function moveLexeme(withTx, entry_id, lexeme_id, position) {
  return await withTx(async tx => {
    await reorder(tx[schema].lexemes, {entry_id}, e => e.id === lexeme_id, position);
  })
}

async function reorderLexemes(tx, entry_id) {
  await reorder(tx[schema].lexemes, {entry_id});
}

async function moveEntryExample(withTx, entry_id, example_id, position) {
  return await withTx(async tx => {
    await reorder(tx[schema].examples, {entry_id}, e => e.id === example_id, position);
  })
}

async function reorderEntryExamples(tx, entry_id) {
  await reorder(tx[schema].examples, {entry_id});
}

async function moveSenseExample(withTx, sense_id, example_id, position) {
  return await withTx(async tx => {
    await reorder(tx[schema].examples, {sense_id}, e => e.id === example_id, position);
  })
}

async function reorderSenseExamples(tx, sense_id) {
  await reorder(tx[schema].examples, {sense_id});
}

const lexemeSchema = yup.object().shape({
  lemma: yup.string().trim().required(),
  paradigm_id: yup.number().transform(v => isNaN(v) ? null : v).nullable(),
  stem1: yup.string().trim().nullify(),
  stem2: yup.string().trim().nullify(),
  stem3: yup.string().trim().nullify(),
  data: yup.object({
    Gram: yup.object({
      Inflection: yup.string().trim().nullify(),
      FreeText: yup.string().trim().nullify(),
      StructuralRestrictions: structuralRestrictionsSchema,
    }),
    Pronunciations: yup.array().of(yup.string()),
  }),
  primary: yup.boolean(),
  hidden: yup.boolean(),
  type_id: yup.number().required()
});

async function updateEntryPrimaryLexeme(tx, entry_id, lexeme) {
  const entry = await tx[schema].entries.findOne({id: entry_id});
  debug('updateEntryPrimaryLexeme before', entry);
  let entry_update = {id: entry_id, primary_lexeme_id: lexeme.id};
  if (entry.heading_is_primary_lexeme && entry.heading !== lexeme.lemma) {
    entry_update.heading = lexeme.lemma;
    entry_update.homonym_no = (await getNextHomonym(lexeme.lemma, tx)).homonym_no;
  }
  const updated_entry = await tx[schema].entries.save(entry_update);
  debug('updated entry from primary lexeme', updated_entry);
  await reorder(tx[schema].lexemes, {entry_id}, e => e.id === lexeme.id, 1);
  debug('moved primary lexeme as first');
  return updated_entry;
}

async function createLexeme(withTx, entry_id, data) {
  return await withTx(async tx => {
    let result = await tx[schema].lexemes.save(getUpdate(null, data, {entry_id}));
    debug('lexeme created', result);
    if (data.primary === true) {
      result.entry_human_key = (await updateEntryPrimaryLexeme(tx, entry_id, result)).human_key;
    }
    await reorderLexemes(tx, entry_id);
    return result;
  });
}

async function updateLexeme(withTx, entry_id, id, data) {
  return await withTx(async tx => {
    const update = getUpdate(await tx[schema].lexemes.findOne({id}), data, {id});
    let result = await tx[schema].lexemes.save(update);
    debug('lexeme updated', result);
    if (data.primary === true) {
      result.entry_human_key = (await updateEntryPrimaryLexeme(tx, entry_id, result)).human_key;
    }
    await reorderLexemes(tx, entry_id);
    return result;
  });
}

async function deleteLexeme(withTx, entry_id, id) {
  return await withTx(async tx => {
    const entry = await tx[schema].entries.findOne({id: entry_id});
    if (entry.primary_lexeme_id === id) {
      debug('tried to delete primary lexeme', entry_id, id);
      throw new Error('Nevar dzēst primāro (pamatvārda) leksēmu');
    }
    const result = await tx[schema].lexemes.destroy({id});
    debug('lexeme deleted', result);
    await reorderLexemes(tx, entry_id);
    return result;
  });
}

const senseSchema = yup.object().shape({
  gloss: yup.string().trim().required(),
  data: yup.object({
    Gram: yup.object({
      FreeText: yup.string().trim().nullify(),
      StructuralRestrictions: structuralRestrictionsSchema,
    }),
  }),
  hidden: yup.boolean(),
});

async function createSense(withTx, entry_id, data) {
  return await withTx(async tx => {
    const update = getUpdate({}, data, {entry_id, order_no: (_.max((await tx[schema].senses.find({entry_id})).map(e => e.order_no)) || 0) + 1});
    const result = await tx[schema].senses.save(update);
    debug('sense created', result);
    await reorderSenses(tx, entry_id);
    return result;
  });
}

async function updateSense(withTx, entry_id, id, data) {
  return await withTx(async tx => {
    data.gloss = await updateGlossLinks(tx, id, data.gloss, data.gloss_links);
    delete data.gloss_links;

    const update = getUpdate(await tx[schema].senses.findOne({id}), data, {id});
    const result = await tx[schema].senses.save(update);
    debug('sense updated', result);
    await reorderSenses(tx, entry_id);
    return result;
  });
}

async function deleteSense(withTx, entry_id, id) {
  return await withTx(async tx => {
    debug('delete subsenses', await tx[schema].senses.destroy({parent_sense_id: id}));
    const result = await tx[schema].senses.destroy({id});
    debug('sense deleted', result);
    await reorderSenses(tx, entry_id);
  })
}

/**
 * Helper for getDependentsForSense and getDependentsForEntry
 */
const formatSense = s =>  {
  let txt = s.heading;
  if (s.order_no)
    txt += '<sub>' + (s.parent_order_no ? `${s.parent_order_no}.` : '') + s.order_no + '</sub>';
  return txt;
};
const formatGlossLink = (s1, s2) =>`${formatSense(s1)} -> ${formatSense(s2)}`;

/**
 * Helper for dependentsForSense and dependentsForEntry
 */
async function getDependentsForSense(tx, id) {
  const sense = await tx.query(`
    SELECT e.heading, s.order_no, ps.order_no AS parent_order_no
    FROM dict.senses s
    LEFT JOIN dict.senses ps ON ps.id = s.parent_sense_id
    JOIN dict.entries e ON e.id = s.entry_id
    WHERE s.id = $1
      `, [id]);

  const glossLinks = await tx.query(`
    SELECT e.heading, s.order_no, ps.order_no AS parent_order_no
    FROM dict.sense_relations sr
    JOIN dict.senses s ON s.id = sr.sense_1_id
    LEFT JOIN dict.senses ps ON ps.id = s.parent_sense_id
    JOIN dict.entries e ON e.id = s.entry_id
    WHERE sr.sense_2_id = $1
    AND sr.type_id = 4 
      `, [id]);

  return glossLinks.map(gl => formatGlossLink(gl, sense[0]));
}

/**
 * Helper for dependentsForEntry
 */
async function getDependentsForEntry(tx, id) {
  const entry = await tx[schema].entries.findOne({id});

  const glossLinks = await tx.query(`
    SELECT e.heading, s.order_no, ps.order_no AS parent_order_no
    FROM dict.sense_entry_relations ser
    JOIN dict.senses s ON s.id = ser.sense_id
    LEFT JOIN dict.senses ps ON ps.id = s.parent_sense_id
    JOIN dict.entries e ON e.id = s.entry_id
    WHERE ser.entry_id = $1
    AND ser.type_id = 4 
      `, [id]);

  return glossLinks.map(gl => formatGlossLink(gl, entry));
}

/**
 * Finds and returns a string with info about all gloss links
 *   that link to the sense or its subsenses
 */
async function dependentsForSense(withTx, id) {
  return await withTx(async tx => {
    let glossLinks = [];
    (await getDependentsForSense(tx, id)).forEach(gl => glossLinks.push(gl));
    const subsenses = await tx[schema].senses.find({parent_sense_id: id});
    for (const sense of subsenses) {
      (await getDependentsForSense(tx, sense.id)).forEach(gl => glossLinks.push(gl));
    }

    if (glossLinks && glossLinks.length > 0) {
      return `Saites nozīmju skaidrojumos:<br>${glossLinks.join('<br>')}`;
    }
    return null;
  })
}

async function createSubSense(withTx, entry_id, parent_sense_id, data) {
  return await withTx(async tx => {
    const update = getUpdate({}, data, {entry_id, parent_sense_id, order_no: (_.max((await tx[schema].senses.find({entry_id})).map(e => e.order_no)) || 0) + 1});
    const result = await tx[schema].senses.save(update);
    debug('subsense created', result);
    await reorderSubSenses(tx, parent_sense_id);
    return result;
  });
}

async function updateSubSense(withTx, entry_id, parent_sense_id, id, data) {
  return await withTx(async tx => {
    const update = getUpdate(await tx[schema].senses.findOne({id}), data, {id});
    const result = await tx[schema].senses.save(update);
    debug('subsense updated', result);
    await reorderSubSenses(tx, parent_sense_id);
    return result;
  });
}

async function deleteSubSense(withTx, entry_id, parent_sense_id, id) {
  return await withTx(async tx => {
    const result = await tx[schema].senses.destroy({id});
    debug('subsense deleted', result);
    await reorderSubSenses(tx, parent_sense_id);
  })
}

/**
 * Update the db so that it matches the contents of gloss_links.
 */
async function updateGlossLinkForType(tx, relation, current_relations, table, colTo) {
  const current_relation = current_relations.find(e => e.id === relation.id);
  const update = getUpdate(current_relation, {
    [colTo]: relation[colTo],
    data: relation.data
  }, {id: relation.id});
  const result = await tx[schema][table].save(update);
  debug('gloss link updated', result);
}

async function deleteGlossLinks(tx, current_relations, gloss, type, table) {
  for (const relation of current_relations) {
    const regex = new RegExp(`(\\[.*\\])\\{${type[0]}:${relation.id}\\}`, 'i');
    if (!regex.test(gloss)) { // delete relation
      const result = await tx[schema][table].destroy({id: relation.id});
      debug('gloss link deleted', result);
    }
  }
}

/**
 * Create a new gloss link.
 * There are 2 types sense->sense or sense->entry.
 */
async function createGlossLinkForType(tx, relation, sense_id, table, colFrom, colTo){
  const result = await tx[schema][table].insert(
    {[colFrom]: sense_id, [colTo]: relation[colTo], type_id: GLOSS_LINK_TYPE_ID, data: relation.data} // TODO: fix type id to real one
  );
  debug('gloss link created', result);
  return result;
}

async function updateGlossLinks(tx, sense_id, gloss, gloss_links) {
  console.log(gloss);

  const current_entry_relations = await tx[schema].sense_entry_relations.find({sense_id, type_id: GLOSS_LINK_TYPE_ID});
  const current_sense_relations = await tx[schema].sense_relations.find({sense_1_id: sense_id, type_id: GLOSS_LINK_TYPE_ID});

  let result, regex;

  for (const relation of gloss_links.entry) {
    regex = new RegExp(`(\\[.*\\])\\{e:${relation.id}\\}`, 'i');
    if (!regex.test(gloss)) continue;
    if (relation.sense_2_id) {
      result = await createGlossLinkForType(tx, relation, sense_id, 'sense_relations', 'sense_1_id', 'sense_2_id');
      gloss = gloss.replace(regex, `$1{s:${result.id}}`);
    } else {
      await updateGlossLinkForType(tx, relation, current_entry_relations, 'sense_entry_relations', 'entry_id');
    }
  }

  for (const relation of gloss_links.sense) {
    regex = new RegExp(`(\\[.*\\])\\{s:${relation.id}\\}`, 'i');
    if (!regex.test(gloss)) continue;
    if (relation.sense_2_id) {
      await updateGlossLinkForType(tx, relation, current_sense_relations, 'sense_relations', 'sense_2_id');
    } else {
      result = await createGlossLinkForType(tx, relation, sense_id, 'sense_entry_relations', 'sense_id', 'entry_id');
      gloss = gloss.replace(regex, `$1{e:${result.id}}`);
    }
  }

  await deleteGlossLinks(tx, current_entry_relations, gloss, 'entry', 'sense_entry_relations');
  await deleteGlossLinks(tx, current_sense_relations, gloss, 'sense', 'sense_relations');

  for (const relation of gloss_links.new) {
    regex = new RegExp(`(\\[.*\\])\\{n:${relation.id}\\}`, 'i');
    if (!regex.test(gloss)) continue;
    if (relation.sense_2_id) {
      result = await createGlossLinkForType(tx, relation, sense_id, 'sense_relations', 'sense_1_id', 'sense_2_id');
      gloss = gloss.replace(regex, `$1{s:${result.id}}`); // The id of the newly created relation has to be added to the gloss text.
    } else {
      result = await createGlossLinkForType(tx, relation, sense_id, 'sense_entry_relations', 'sense_id', 'entry_id');
      gloss = gloss.replace(regex, `$1{e:${result.id}}`);
    }
  }

  console.log(gloss);

  return gloss;
}

const mweLinkSchema= yup.object().shape({
  entry_id: yup.number().required(),
  sense_id: yup.number()
});

async function createSenseMweLink(withTx, sense_id, data) {
  return await withTx(async tx => {
    const update = getUpdate(null, data);
    const result = await tx[schema].sense_entry_relations.insert({sense_id, entry_id: update.entry_id, type_id: 1}); // TODO: mwe type - should be deprecated
    debug('sense mwe link created', result);
    return result;
  });
}

async function updateSenseMweLink(withTx, mwe_id, sense_id, data) {
  return await withTx(async tx => {
    const link = await tx[schema].sense_entry_relations.findOne({entry_id: mwe_id, sense_id, type_id: 1});
    const update = getUpdate(null, link, data);
    const result = await tx[schema].sense_entry_relations.save(update);
    debug('sense mwe link updated', result);
    return result;
  });
}

async function deleteSenseMweLink(withTx, sense_id, mwe_id) {
  return await withTx(async tx => {
    const result = await tx[schema].sense_entry_relations.destroy({sense_id, entry_id: mwe_id, type_id: 1});
    debug('sense mwe link deleted', result);
    return result;
  });
}

const exampleSchema = yup.object().shape({
  content: yup.string().trim().required(),
  data: yup.object({
    CitedSource: yup.string().trim().nullify(),
    Gram: yup.object({
      FreeText: yup.string().trim().nullify(),
    }),
  }),
  hidden: yup.boolean(),
});

async function createSenseExample(withTx, sense_id, data) {
  return await withTx(async tx => {
    const update = getUpdate(null, data, {sense_id});
    const result = await tx[schema].examples.insert(update);
    debug('sense example created', result);
    await reorderSenseExamples(tx, sense_id);
    return result;
  });
}

async function updateSenseExample(withTx, sense_id, id, data) {
  return await withTx(async tx => {
    const update = getUpdate(await tx[schema].examples.findOne({id}), data, {id});
    const result = await tx[schema].examples.save(update);
    debug('sense example updated', result);
    await reorderSenseExamples(tx, sense_id);
    return result;
  });
}

async function deleteSenseExample(withTx, sense_id, id) {
  return await withTx(async tx => {
    await tx[schema].examples.destroy({id});
    debug('sense example deleted', sense_id, id);
    await reorderSenseExamples(tx, sense_id);
  });
}

const entryRelationSchema = yup.object().noUnknownKeys().shape({
  entry_1_id: yup.number().required(), // mwe
  entry_2_id: yup.number().required(),
  type_id: yup.number().required(),
});

async function createEntryRelation(withTx, data) {
  return await withTx(async tx => {
    let update = getUpdate(null, data);
    const result = await tx[schema].entry_relations.insert(update);
    debug('entry relation created', result);
    return result
  });
}

async function deleteEntryRelation(withTx, { rel_id, entry_1_id, type_id, entry_2_id }) {
  return await withTx(async tx => {
    if (rel_id) {
      const result = await tx[schema].entry_relations.destroy({id: rel_id});
      debug('entry relation deleted', rel_id, result);
      return result;
    } else {
      const result = await tx[schema].entry_relations.destroy({or: [{ entry_1_id, entry_2_id, type_id }, { entry_1_id: entry_2_id, entry_2_id: entry_1_id, type_id }]});
      debug('entry relation deleted', { entry_1_id, type_id, entry_2_id }, result);
      return result;
    }
  });
}

const entrySourceSchema = yup.object().shape({
  source_id: yup.number().required(),
  data: yup.object({
    sourceDetails: yup.string().trim().nullify(),
  }),
});

const entryMergeSchema = yup.object().noUnknownKeys().shape({
  entry_1_id: yup.number().required(),
  entry_2_id: yup.number().required()
});

async function mergeEntries(withTx, data) {
  return await withTx(async tx => {
    let recipient_id = data.entry_1_id;
    let donor_id = data.entry_2_id;
    const result = await await tx.query(`call dict.merge_entries($1, $2)`, [recipient_id, donor_id]);
    debug('entries merged', result);
    let resulting_entry = await tx[schema].entries.findOne({id: recipient_id});
    return resulting_entry;
  });
}

async function createEntrySource(withTx, entry_id, data) {
  return await withTx(async tx => {
    let update = getUpdate(null, data, {entry_id, order_no: (_.max((await tx[schema].source_links.find({entry_id})).map(e => e.order_no)) || 0) + 1});
    const result = await tx[schema].source_links.insert(update);
    debug('entry source created', result);
    await reorderEntrySources(tx, entry_id);
    return result
  });
}

async function updateEntrySource(withTx, entry_id, id, data) {
  return await withTx(async tx => {
    const update = getUpdate(await tx[schema].source_links.findOne({id}), data, {id});
    const result = await tx[schema].source_links.save(update);
    debug('entry source updated', entry_id, result);
    // await reorderEntrySources(tx, entry_id);
    return result;
  });
}

async function deleteEntrySource(withTx, entry_id, id) {
  return await withTx(async tx => {
    const result = await tx[schema].source_links.destroy({id});
    debug('entry source deleted', result);
    await reorderEntrySources(tx, entry_id);
    return result
  });
}

async function moveEntrySource(withTx, entry_id, source_link_id, position) {
  return await withTx(async tx => {
    await reorder(tx[schema].source_links, {entry_id}, e => e.id === source_link_id, position);
  })
}

async function reorderEntrySources(tx, entry_id) {
  await reorder(tx[schema].source_links, {entry_id});
}

async function getEntry(id, verbose=false) {
  if (id == null) return null;
  if (!/^\d+$/.test(id)) {
    return await getEntry((await (await dbconn)[schema].entries.findOne({human_key: id})).id);
  }
  id = parseInt(id, 10);

  let entry = null;
  if (verbose) debug('--- getEntry start');
  await (await dbconn).withTransaction(async tx => {
    entry = await tx[schema].entries.findOne({id});
    if (!entry) return null;

    if (verbose) debug('getEntry entry found');
    entry.lexemes = await tx[schema].lexemes.find({entry_id: entry.id});
    entry.lexemes = entry.lexemes.map(e => e.id === entry.primary_lexeme_id ? {...e, primary: true} : e);
    entry.primaryLexeme = entry.lexemes && entry.lexemes.find(e => e.id === entry.primary_lexeme_id);

    if (verbose) debug('getEntry lexemes found');
    entry.sources = await tx[schema].source_links.find({entry_id: entry.id});
    if (verbose) debug('getEntry sources');
    const senses = await tx[schema].senses.find({entry_id: entry.id}, {order: [{field: 'order_no', direction: 'asc'}]});
    if (verbose) debug('getEntry senses');

    const top_senses = entry.senses = senses.filter(x => !x.parent_sense_id);
    for (let sense of senses) {
      if (sense.parent_sense_id) {
        let parent = senses.find(x => x.id === sense.parent_sense_id);
        if (parent.subSenses) {
          parent.subSenses.push(sense);
        } else {
          parent.subSenses = [sense];
        }
      }
      sense.MWEs = await tx.query(`
        select ser.id as relation_id, e.*, coalesce(json_agg(s) filter (where s.id is not null), '[]') as senses
        from sense_entry_relations ser
        left join entries e on e.id = ser.entry_id
        left join senses s on s.entry_id = e.id
        where ser.sense_id = $1
        group by ser.id, e.id
      `, [sense.id]);

      sense.examples = await tx[schema].examples.find({'sense_id': sense.id});
    }
    if (verbose) debug('getEntry subsenses and nested mwes finished ---');

    entry.incoming_entry_relations = await tx.query(`
      select
      er.id, er.type_id,
      row_to_json((select a from (
        select e.*, coalesce(json_agg(s) filter (where s.id is not null), '[]') as senses
        from entries e
        left join senses s on e.id = s.entry_id
        where e.id = er.entry_1_id group by e.id
      ) a)) entry
      from entry_relations er
      where er.entry_2_id=$1;
    `, [entry.id]);
    if (verbose) debug('getEntry relations finished ---');
  });

  return entry;
}

async function getValues() {
  return {
    mwe_types: [
      {id: ENTRY_TYPES.idiom, label: 'Frazeoloģisms'},
      {id: ENTRY_TYPES.otherMWE, label: 'Stabila vienība'},
      {id: ENTRY_TYPES.taxon, label: 'Taksons'},
    ],
    paradigms: await (await dbconn).query(`select id, human_key || ': ' || caption as label from paradigms order by human_key='dummy' desc, human_key`),
    flags: await (await dbconn).query(`select name as id, is_multiple, scope, permitted_values, array_agg(value order by fv.order_no, fv.value) as values
      from dict.grammar_flags f
      left join dict.grammar_flag_values fv on f.id = fv.flag_id
      where not f.is_deprecated and (fv.is_deprecated is null or fv.is_deprecated = false)
      group by f.id, f.order_no
      order by f.order_no`),
    entry_types: await (await dbconn).query(`select id, description as label from entry_types order by id`),
    sources: await (await dbconn).query(`select id, concat_ws(' - ', abbr, title) as label from sources order by id`),
    lexeme_types: await (await dbconn).query(`select id, description as label from dict.lexeme_types order by id`),
    grammar_restriction_frequencies: await (await dbconn).query(`select id, caption from dict.grammar_restriction_frequencies order by id`),
    grammar_restriction_types: await (await dbconn).query(`select id, caption from dict.grammar_restriction_types order by id`),
  };
}

async function suggestEntries(q, entry_type_id, ignore) {
  if (q.length === 0) return [];
  let entry_type_id_query = entry_type_id ? 'and type_id = $2' : '';
  let limit_query = q.length <= 3 ? 'and char_length(heading) <= 4 order by char_length(heading)': 'limit 100';
  return await (await dbconn).query(`
    select id, text from (
      select * from (select id, 1 as w, heading || case when homonym_no > 1 then ':' || homonym_no else '' end as text from dict.entries where heading || case when homonym_no > 1 then ':' || homonym_no else '' end like $1 || '%' ${entry_type_id_query} ${limit_query})  a
      union
      select * from (select id, 2 as w, heading || case when homonym_no > 1 then ':' || homonym_no else '' end as text from dict.entries where heading || case when homonym_no > 1 then ':' || homonym_no else '' end ilike $1 || '%' ${entry_type_id_query} ${limit_query}) b
      union
      select * from (select id, 3 as w, heading || case when homonym_no > 1 then ':' || homonym_no else '' end as text from dict.entries where heading || case when homonym_no > 1 then ':' || homonym_no else '' end ilike '%' || $1 || '%' ${entry_type_id_query} ${limit_query}) c
    ) merged
    where id != $3
    group by id, text
    order by min(w), min(char_length(text))
    limit 100;
  `, [q, entry_type_id, ignore])
}

async function suggestSenses(entry_id) {
  return await (await dbconn).query(
    `select s.id, s.gloss, s.order_no, ps.order_no as parent_order_no
     from dict.senses s
     left outer join dict.senses ps on ps.id=s.parent_sense_id
     where s.entry_id = $1`, [entry_id]
  );
}


async function getExistingEntries(text) {
  return await (await dbconn).query(`select human_key, id from dict.entries where heading = $1`, [text]);
}

async function getExistingLexemes(text) {
  return await (await dbconn).query(`select human_key, e.id, lemma as lemma from dict.lexemes l left join dict.entries e on l.entry_id = e.id where lemma = $1`, [text]);
}

/**
 * Change the parent and the order no of a sense
 * @param table_obj
 * @param sense
 * @param new_parent_id
 * @param order_no
 * @returns {Promise<void>}
 */
async function updateParent(table_obj, sense, new_parent_id, order_no) {
  sense.order_no = order_no;
  sense.parent_sense_id = new_parent_id;
  return await table_obj.save(sense);
}


/**
 * Change parent sense:
 *    - sense becomes a subsense
 *    - subsense becomes a sense
 *    - subsence changes a parent
 * Only 2 levels: if the sense previously was not a subsense then move up all its subsenses to the same level.
 * @param withTx
 * @param entry_id
 * @param sense_id
 * @param new_parent_order_no
 * @returns {Promise<*>}
 */
// todo: what happens with examples (particularly in wordnet section)
async function changeSenseParent(withTx, entry_id, sense_id, new_parent_order_no) {
  return await withTx(async tx => {
    let old_parent_sense_id = null;
    let parent_sense_id = null; // Subsense becomes a sense
    if (new_parent_order_no !== 0) { // Sense becomes a subsense
      let new_parent_sense = await tx[schema].senses.findOne({entry_id, order_no: new_parent_order_no, parent_sense_id: null});
      if (!new_parent_sense) {
        throw new Error('Nozīme ar norādīto kārtas numuru neeksistē');
      }
      if (sense_id === new_parent_sense.id) {
        throw new Error('Nekorekta nozīmes pārvietošana');
      }
      parent_sense_id = new_parent_sense.id;
    }

    let sense = await tx[schema].senses.findOne({id: sense_id});
    if (parent_sense_id === sense.parent_sense_id) { // No change - already has the parent
      return;
    }
    old_parent_sense_id = sense.parent_sense_id;


    let order_no = (_.max((await tx[schema].senses.find({parent_sense_id: parent_sense_id, entry_id})).map(e => e.order_no)) || 0) + 1;
    const result = await updateParent(tx[schema].senses, sense, parent_sense_id, order_no);
    debug('sense parent changed', sense_id, result);

    let subsenses = await tx[schema].senses.find(
      {parent_sense_id: sense_id},
      {order: [{field: 'order_no', direction: 'asc'}]}
    );
    for (let [i, subsense] of subsenses.entries()) {
      await updateParent(tx[schema].senses, subsense, parent_sense_id, order_no + i + 1);
    }

    await reorderSenses(tx, entry_id);
    if (parent_sense_id)
      await reorderSubSenses(tx, parent_sense_id); // subsenses of the new parent sense
    if (old_parent_sense_id)
      await reorderSubSenses(tx, old_parent_sense_id); // subsenses of the old parent sense
  })
}

module.exports = {
  getEntry,
  entrySchema,
  createEntry,
  updateEntry,
  deleteEntry,
  dependentsForEntry,
  getNextHomonym,
  lexemeSchema,
  createLexeme,
  updateLexeme,
  deleteLexeme,
  senseSchema,
  createSense,
  updateSense,
  reorderSenses,
  moveSense,
  moveSubSense,
  moveLexeme,
  moveSenseExample,
  moveEntryExample,
  deleteSense,
  dependentsForSense,
  createSubSense,
  updateSubSense,
  deleteSubSense,
  mweLinkSchema,
  createSenseMweLink,
  updateSenseMweLink,
  deleteSenseMweLink,

  exampleSchema,
  createSenseExample,
  updateSenseExample,
  deleteSenseExample,

  entryRelationSchema,
  createEntryRelation,
  deleteEntryRelation,

  entryMergeSchema,
  mergeEntries,

  entrySourceSchema,
  createEntrySource,
  updateEntrySource,
  deleteEntrySource,
  moveEntrySource,

  getValues,
  suggestEntries,
  suggestSenses,
  getExistingEntries,
  getExistingLexemes,

  changeSenseParent,
  getUpdate
};
