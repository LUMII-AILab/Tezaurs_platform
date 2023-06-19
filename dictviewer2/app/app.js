const path = require('path');
const debug = require('debug')('app');
const express = require('express');
const morgan = require('morgan');
const favicon = require('express-favicon');
const c = require('ansi-colors');

const config = require('./config');
const model = require('./editor/model');
const wordnet = require('./editor/wordnet');
const { authMiddleware } = require('./util/auth-middleware');
const { notReadyMiddleware, requestMarkerMiddleware } = require('./util/misc-middleware');

const { APP_MODE } = config;
const app = express();

app.use(morgan(config.NODE_ENV_DEVELOPMENT ? 'dev' : ':remote-addr [:date[iso]] :method :url :status :response-time ms - :res[content-length]', {
  stream: {write: msg => debug(msg)},
  skip: (req, res) => {
    if (res.statusCode !== 200 && res.statusCode !== 304) return false;
    if (req.originalUrl.startsWith("/img") || req.originalUrl.startsWith("/styles") || req.originalUrl.startsWith("/js")) return true;
    return false;
}}));

app.use(authMiddleware);

switch(config.DICT) {

  case 'tezaurs':
    switch (config.app_mode) {
      case config.APP_MODE.PUBLIC:
        app.use(favicon(__dirname + '/public/img/tezaurs/favicon-32x32-green.png'));
        break;
      case config.APP_MODE.EDITOR:
      default:
        app.use(favicon(__dirname + '/public/img/tezaurs/favicon-32x32-red.png'));
        break;
    }
    break;

  case 'mlvv':
    app.use(favicon(__dirname + '/public/img/mlvv/favicon-32x32.png'));
    break;

  case 'llvv':
    app.use(favicon(__dirname + '/public/img/mlvv/favicon-32x32.png'));
    break;

  case 'ltg':
    app.use(favicon(__dirname + '/public/img/ltg/favicon-32x32.png'));
    break;
}

app.locals.dict = config.DICT;
// app.locals.dictabbr = config.DICTABBR || 't';
app.locals.themeinfo = {
  title: config.DICT === 'tezaurs' ? 'Tēzaurs' : config.DICT.toUpperCase(),
  styles: 'tezaurs',
  footer: 'footer-tezaurs',
  viewsSubdir: config.DICT,
};
app.locals.buildinfo = require('./util/build-info');
app.locals.SHOW_EDITOR = config.SHOW_EDITOR;
app.locals.SHOW_WORDNET_EDITOR = config.SHOW_WORDNET_EDITOR;
app.locals.SHOW_DEBUG = config.SHOW_DEBUG;
app.locals.APP_MODE = config.APP_MODE;
app.locals.app_mode = config.app_mode;
app.locals.app_mode_name = config.app_mode_name;

// editor view util functions, values
app.locals.values = {};
model.getValues().then(d => app.locals.values = d).catch(e => console.error('Error loading values', e));

app.set('view engine', 'pug');
app.set('views', [
  path.join(__dirname, 'views', app.locals.themeinfo.viewsSubdir),
  path.join(__dirname, 'views', 'common'),
  path.join(__dirname, 'views'),
]);
app.set('trust proxy', true);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({limit: '300kb'}));
app.use(express.urlencoded({ extended: true }));
app.use(notReadyMiddleware);
app.use(requestMarkerMiddleware);

app.get('/', require('./routes/index'));

switch (config.DICT) {
  case 'tezaurs':
    app.get('/_avoti', require('./routes/sources'));
    if (config.app_mode !== config.APP_MODE.PUBLIC) {
      app.use(`/_talka`, require('./routes/talka'));
    }
    break;
  case 'ltg':
    app.get('/_avoti', require('./routes/sources'));
    break;

  default:
    break;
}

app.get('/_/r', require('./routes/random'));
app.get('/_entry-list', require('./routes/entry-list'));
app.use(`/_nojs`, require('./routes/nojs'));
app.use(`/_nojs/:w`, require('./routes/nojs'));
// app.get('/_/wordnet', require('./routes/wordnet'));
app.use(require('./routes/wordnet'));
app.get('/_/:pagename', require('./routes/page'));

if (config.app_mode !== config.APP_MODE.PUBLIC) {
  app.use(`/_issues`, require('./routes/issues'));
  app.use(`/_q`, require('./routes/custom-queries'));
  app.use(`/_history`, require('./routes/history'));
  app.get('/__/:pagename', require('./routes/page'));
  app.get('/_byid/:entity_type/:entity_id', require('./routes/byid'));
}

app.get(`/_search/:entryslug`, require('./routes/search'));
app.get(`/_search/:entryslug/:sense_no`, require('./routes/search'));
app.get(`/:entry_slug`, require('./routes/entry'));
app.get(`/:entry_slug/:sense_tag`, require('./routes/entry'));
app.get(`/:entry_slug?hilite=:slug`, require('./routes/entry'));

if (config.SHOW_EDITOR) {
  app.use(require('./editor/routes'));
}

const formatNiceNumber = (num, singular, plural) => {
  const single = num % 10 === 1 && num !== 11;
  let numStr = num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1&nbsp;');
  return single ? `${numStr}&nbsp;${singular}` : `${numStr}&nbsp;${plural}`;
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  // let err = new Error('Ir aizdomas, ka kaut kas nav labi');
  let err = new Error('Nekas netika atrasts');
  console.error(c.red(404), c.yellow(req.path), req.method);
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  console.error(err);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = config.NODE_ENV_DEVELOPMENT ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const work = async () => {
  const db = await config.dbconn;

  app.set('db', db);
  app.set('dbschema', config.DB_SCHEMA);
  app.set('statsschema', config.STATS_SCHEMA);

  debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
  await require('./util/dbcache')(app);
  require('./util/flag-verbalizer').init();

  // const release_record = await db[config.DB_SCHEMA].metadata.findOne({id: config.RELEASE});
  const dict_meta = await db[config.DB_SCHEMA].metadata.findOne();
  debug('METADATA', dict_meta);
  app.locals.dictstats = dict_meta.info;
  app.locals.dictstats.dbname = config.DB_CONFIG.database;

  app.locals.dictstats.cornertitle = process.env.CORNER_TITLE; // TODO: sataisīt json ielādēšanu no .env un iepludināšanu dictstats

  // FIXME: temp override
  if (config.DICT === 'mlvv' && config.app_mode === APP_MODE.PUBLIC) {
    app.locals.dictstats = {
      ...app.locals.dictstats,
      release: 'Mūsdienu latviešu valodas vārdnīca',
      year: '',
      //synonymsStr: '',
    };
  } else if (config.DICT === 'llvv' && config.app_mode === APP_MODE.PUBLIC) {
    app.locals.dictstats = {
      release: 'Latviešu literārās valodas vārdnīca',
      year: '',
    }
  } else if (config.DICT === 'ltg' && config.app_mode === APP_MODE.PUBLIC) {
    app.locals.dictstats = {
      release: 'Latgalīšu volūdys vuordineica',
      year: '',
    }
  } else if (config.DICT === 'tezaurs' && config.app_mode === APP_MODE.PUBLIC) {
    app.locals.dictstats = {
      // release: 'Rudens versija',
      // release: 'Ziemas versija',
      release: 'Pavasara versija',
      // release: 'Vasaras versija',
      year: 2023,
      // wordsStr: formatNiceNumber(wordCount, 'vārds', 'vārdi'), // 325 317 (rudens'20), 326 481 (ziema'21), 328 944 (pavasaris'21), 329 515 (vasara'21), 329667 (rudens'21)
      // mwesStr: formatNiceNumber(mweCount, 'vārdu savienojums', 'vārdu savienojumi'), // 47 798 (rudens'20), 48 551 (ziema'21), 48 692 (pavasaris'21), 49 104 (vasara'21), 49 732 (rudens'21)
    }
  }
  const entryCount = await db[config.DB_SCHEMA].entries.count({ hidden: false });
  const wordCount = await db[config.DB_SCHEMA].entries.count({type_id: 1, hidden: false});
  const mweCount = await db[config.DB_SCHEMA].entries.count({type_id: 4, hidden: false});
  const wordPartCount = await db[config.DB_SCHEMA].entries.count({type_id: 5, hidden: false});
  app.locals.dictstats.entriesStr = formatNiceNumber(entryCount, 'šķirklis', 'šķirkļi');

  // console.log('dictstats', app.locals.dictstats);
  debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);

  // await preloadEntries(app, 200000);
  // await generateFullEntries(app);
  // debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
}

work().then(console.log).catch(console.error);

module.exports = app;
