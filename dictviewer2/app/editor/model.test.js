const config = require('../config');
const model = require('./model');
const debug = require('debug')('tests');

afterAll(async () => {
  await (await config.dbconn).pgp.end();
});

const withTx = cb => async () => {
  try {
    await (await config.dbconn).withTransaction(async tx => {
      await cb(tx, async cb => await cb(tx));
      throw 'TransactionError';
    })
  } catch (e) {
    if (e === 'TransactionError') {
      // console.log('rollback')
    } else {
      throw e;
    }
  }
}

test('heading_is_primary_lexeme new primary lexeme', withTx(async (tx, txb) => {
  let e = await model.createEntry(txb, {heading: '_t1', homonym_no: 1, type_id: 1, heading_is_primary_lexeme: true});
  let l = await model.createLexeme(txb, e.id, {primary: true, lemma: '_t2'});
  expect(l.entry_human_key).toBe('_t2:1');
}));

test('heading_is_primary_lexeme lexeme update', withTx(async (tx, txb) => {
  let e = await model.createEntry(txb, {heading: '_t1', homonym_no: 1, type_id: 1, heading_is_primary_lexeme: true});
  expect(e.human_key).toBe('_t1:1');
  let e2 = await model.createEntry(txb, {heading: '_t2', homonym_no: 1, type_id: 1, heading_is_primary_lexeme: true});
  debug('e2', e2);
  let l2 = await model.updateLexeme(txb, e2.id, e2.primary_lexeme_id, {lemma: '_t1', primary: true});
  await tx.dict.entries.findOne(e2.id);
  expect(l2.entry_human_key).toBe('_t1:2');
}));

test('heading_is_primary_lexeme entry update', withTx(async (tx, txb) => {
  let e = await model.createEntry(txb, {heading: '_t1', homonym_no: 1, type_id: 1, heading_is_primary_lexeme: false});
  await tx.dict.lexemes.save({id: e.primary_lexeme_id, lemma: '_t2'});
  e = await model.updateEntry(txb, e.id, {...e, heading_is_primary_lexeme: true});
  expect(e.human_key).toBe('_t2:1');
}));

test('heading_is_primary_lexeme entry update without sync', withTx(async (tx, txb) => {
  let e = await model.createEntry(txb, {heading: '_t1', homonym_no: 1, type_id: 1, heading_is_primary_lexeme: false});
  let l = await model.updateLexeme(txb, e.id, e.primary_lexeme_id,{primary: true, lemma: '_t2'});
  expect(l.lemma).toBe('_t2');
  expect(l.entry_human_key).toBe('_t1:1');
  e = await model.updateEntry(txb, e.id, {...e, heading: '_t2'});
  expect(e.human_key).toBe('_t2:1');
}));
