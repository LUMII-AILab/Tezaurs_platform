const path = require('path');
const pg_url_parse = require('pg-connection-string').parse;
const massive = require('massive');
const monitor = require('pg-monitor');

const argv = require('minimist')(process.argv.slice(2));

const ENV_NAME=process.env.ENV_NAME || argv['config'] || '';
const config = require('dotenv').config({path: path.join(__dirname, ENV_NAME + '.env')});

// if (!config || config.error) {
//   console.error('Nav uzdots konfigurācijas fails; tā strādāt nav iespējams. \nIzveidojiet .env kā pielāgotu sample.env kopiju.');
//   process.exit();
// }
// console.log('config loaded:', config);

if (argv['dry-run']) {
  process.env['DRY_RUN'] = 'true';
}

const NODE_ENV = process.env.NODE_ENV || 'production';
const NODE_ENV_DEVELOPMENT = process.env.NODE_ENV === 'development';

const PORT = parseInt(process.env.PORT || '3004');

const DB_URL = process.env.DB_URL;
if (!DB_URL) {
  console.error(`Nav DB_URL; iespējams, nepareizs vai neesošs parametru fails "${ENV_NAME}.env"`);
  process.exit(1);
}

const DB_CONFIG = pg_url_parse(DB_URL);
const DB_SCHEMA = process.env.DB_SCHEMA || 'dict';

const DICT = process.env.DICT;  // tezaurs | mlvv | llvv

// const RELEASE = parseInt(process.env.RELEASE || '1'); // TODO: deprecate RELEASE?
// const DICTABBR = process.env.DICTABBR || DICT;  // TODO: deprecate DICTABBR?

if (process.env.SHOW_EDITOR && process.env.APP_MODE) {
  console.error('nevar norādīt vienlaikus gan APP_MODE, gan SHOW_EDITOR');
  process.exit(1);
}

const APP_MODE = {
  EDITOR: 1,
  VIEWER: 2,
  PUBLIC: 3,
  BUILD_CACHE: 4,
}

let SHOW_EDITOR;
let SHOW_WORDNET_EDITOR, LLVV_USERNAME, LLVV_PASSWORD;
let app_mode;

if (process.env.SHOW_EDITOR) {
  SHOW_EDITOR = (process.env.SHOW_EDITOR === 'true');
  app_mode = SHOW_EDITOR ? APP_MODE.EDITOR : APP_MODE.VIEWER;
} else if (process.env.APP_MODE) {
  if (Object.keys(APP_MODE).includes(process.env.APP_MODE.toUpperCase())) {
    app_mode = APP_MODE[process.env.APP_MODE.toUpperCase()];
    if (app_mode === APP_MODE.EDITOR) {
      SHOW_EDITOR = true;
    }
  } else {
    console.error('nezināma APP_MODE', process.env.APP_MODE);
    process.exit(1);
  }
} else {
  SHOW_EDITOR = true;
  app_mode = APP_MODE.EDITOR;
}

let app_mode_name = (Object.keys(APP_MODE).find(x => APP_MODE[x] === app_mode) || 'unknown').toLowerCase();

if (process.env.SHOW_WORDNET_EDITOR) {
  SHOW_WORDNET_EDITOR = (process.env.SHOW_WORDNET_EDITOR === 'true');
  LLVV_USERNAME = process.env.LLVV_USERNAME;
  LLVV_PASSWORD = process.env.LLVV_PASSWORD;
}

// const SHOW_EDITOR_IN_SUBROUTE = (process.env.SHOW_EDITOR_IN_SUBROUTE === 'true');
const SHOW_DEBUG = process.env.SHOW_DEBUG === 'true';
const DRY_RUN = process.env.DRY_RUN || false;
const USE_LOCAL_MORPHOSERVICE = process.env.USE_LOCAL_MORPHOSERVICE === 'true';

const dbconn = (async function() {
  const db = await massive({...DB_CONFIG}, {}, {schema: ['public', DB_SCHEMA]});
  // const db = await massive({...DB_CONFIG, poolSize: 1}, null, {schema: DB_SCHEMA});

  console.log(`izmantojam ${ENV_NAME}.env; datubāze "${DB_CONFIG.database}"; app_mode "${app_mode_name}"`);

  if (NODE_ENV_DEVELOPMENT) {
    // setup db query logging
    const debug = require('debug')('db');
    monitor.attach(db.driverConfig);
    monitor.setLog((msg, info) => {
      info.display = false;
      debug(`${info.time && info.time.toISOString().substring(11, 23)} ${info.event} ${info.text}`);
    });
  }
  return db;
})();

const REPORT_STATS = process.env.REPORT_STATS === 'true';
const STATS_SCHEMA = process.env.STATS_SCHEMA || 'stats';

let statsdbconn = dbconn;
let STATS_DB_URL;
let STATS_DB_CONFIG;
if (process.env.STATS_DB_URL) {
  STATS_DB_URL = process.env.STATS_DB_URL;
  STATS_DB_CONFIG = pg_url_parse(STATS_DB_URL);

  statsdbconn = (async function() {
    const statsdb = await massive({...STATS_DB_CONFIG}, {}, {schema: [STATS_SCHEMA]});
    console.log(`statistikai izmantojam datubāzi ${STATS_DB_CONFIG.database}, shēmu ${STATS_SCHEMA}`);

    if (NODE_ENV_DEVELOPMENT) {
      // setup db query logging
      const debug = require('debug')('stats');
      monitor.attach(statsdb.driverConfig);
      monitor.setLog((msg, info) => {
        info.display = false;
        debug(`${info.time && info.time.toISOString().substring(11, 23)} ${info.event} ${info.text}`);
      });
    }
    return statsdb;
  })();
}

const OTHER_DB_NAME_LLVV = process.env.OTHER_DB_NAME_LLVV || 'llvv_dv';
const OTHER_DB_NAME_MLVV = process.env.OTHER_DB_NAME_MLVV || 'mlvv_dv';
const OTHER_DB_NAME_TEZAURS = process.env.OTHER_DB_NAME_TEZAURS || 'tezaurs_dv';

module.exports = {
  NODE_ENV,
  NODE_ENV_DEVELOPMENT,
  SHOW_DEBUG,
  // PORT,
  DICT,
  // DICTABBR,
  // RELEASE,
  SHOW_EDITOR,
  SHOW_WORDNET_EDITOR,
  // SHOW_EDITOR_IN_SUBROUTE,
  USE_LOCAL_MORPHOSERVICE,
  DRY_RUN,

  DB_URL,
  DB_CONFIG,
  DB_SCHEMA,
  LLVV_USERNAME,
  LLVV_PASSWORD,
  dbconn,

  OTHER_DB_NAME_TEZAURS,
  OTHER_DB_NAME_MLVV,
  OTHER_DB_NAME_LLVV,

  REPORT_STATS,
  // STATS_DB_URL,
  // STATS_DB_CONFIG,
  STATS_SCHEMA,
  statsdbconn,

  APP_MODE,
  app_mode,
  app_mode_name,
};

// console.log('CONFIG', JSON.stringify(module.exports, null, 2));
