const config = require('../config');
const model = require('./model');

const dbconn = config.dbconn;
const schema = config.DB_SCHEMA;
const release = config.RELEASE;

(async function run() {
  try {
    // console.log(await model.getValues());
    // console.log(await model.getParadigms());
    // console.log(await getParadigms2());
    // console.log(JSON.stringify(await model.getEntry('suns'), null, 2));

    // await (await dbconn).withTransaction(async tx => console.log(await tx[schema].senses.findOne()));
    // await (await dbconn).withTransaction(async tx => console.log(await tx.query('select * from senses limit 1')));

    // console.log(await model.mweSchema.validate({type_id: 4, heading: 'test', 'data.SciName': ' 2 | 3'}))
    // console.log(await model.mweSchema.validate({type_id: 4, heading: 'test', 'data.SciName': ''}));
    // console.log(await model.mweSchema.validate({type_id: 4, heading: 'test', 'data.SciName': null}));
    // console.log(await model.mweSchema.validate({heading: 'test'})); // type 4
    // console.log(await model.getNextHomonym('suns'))
    // console.log(await model.suggestEntries('suns'))

    // console.log(await model.moveSense(311223, 388406, 1))
    // await (await dbconn).withTransaction(async tx => console.log(await tx[schema].senses.find({id: 388406})));
    // await (await dbconn).withTransaction(async tx => console.log(await tx[schema].senses.find({entry_id: 311223})));
  } catch (e) {
    console.trace(e);
  } finally {
    await (await dbconn).pgp.end();
  }
})();
