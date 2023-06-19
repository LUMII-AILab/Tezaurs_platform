const pgp = require('pg-promise')();
const cs = require('pg-connection-string');

const config = require('../config');

const dbConnectionMap = new Map();

const getDbConnection = async dictname => {
  let dbConn = dbConnectionMap.get(dictname);
  if (dbConn) return dbConn;

  let dbName;
  switch (dictname) {
    case 'mlvv': 
      dbName = config.OTHER_DB_NAME_MLVV;
      break;
    case 'llvv':
      dbName = config.OTHER_DB_NAME_LLVV;
      break;
    case 'tezaurs':
      dbName = config.OTHER_DB_NAME_TEZAURS;
      break;
    default:
      throw new Error(`Nepazīstams dictname ${dictname}`);
  }

  let dbConfig = Object.assign({}, config.DB_CONFIG, { database: dbName });

  dbConn = pgp(dbConfig);
  dbConnectionMap.set(dictname, dbConn);

  return dbConn;
}

const getWordInOtherDictionaries = async (dictname, word) => {
  const db = await getDbConnection(dictname);

  const results = await db.any(`select heading, human_key, type_id, homonym_no from dict.entries where heading = $1 order by human_key`, [word]);
  return results;
}


function *range(n) {
  for (let i = 1; i <= n; i += 1) yield i;
}

const mockupEntries = (word, num) => {
  // return range(num).map(n => ({ heading: word, human_key: `${word}:${n}`, homonym_no: n, type_id: 1}));
  return [...Array(num).keys()].map(n => n + 1).map(n => ({ heading: word, human_key: `${word}:${n}`, homonym_no: n, type_id: 1}));
}

const allDictionaries = [ 'tezaurs', 'mlvv', 'llvv', ];
const otherDictionaries = allDictionaries.filter(x => x !== config.DICT);

const replyTemplate =   {
  tezaurs: {
    style: {
      primaryColor: '#81c784',
      primaryColorLite: '#e8f5e9',
    },
    name: 'Tēzaurs',
    baseUrl: 'https://tezaurs.lv',
    entries: [],
  },
  mlvv: {
    style: {
      primaryColor: '#9b81cf',
      primaryColorLite: '#f3eff9',
    },
    name: 'MLVV',
    baseUrl: 'https://mlvv.tezaurs.lv',
    entries: [],
  },
  llvv: {
    style: {
      primaryColor: '#CCCC00',
      primaryColorLite: '#E5E5CC',
    },
    name: 'LLVV',
    baseUrl: 'https://llvv.tezaurs.lv',
    entries: [],
  }
}

const lookupWordInOtherDictionaries = async slug => {
  let word = slug.includes(':')
    ? slug.slice(0, slug.indexOf(':'))
    : slug;

  let reply = {};

  for (let dictname of otherDictionaries) {
    let hits = await getWordInOtherDictionaries(dictname, word);
    if (hits && hits.length > 0) {
      reply[dictname] = { ...replyTemplate[dictname], entries: hits }
    }
  }
  return reply;
}

module.exports = {
  lookupWordInOtherDictionaries,
}