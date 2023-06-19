const config = require('../../config');
const debug = require('debug')('queries');
const router = require('express').Router({ mergeParams: true });

const NodeCache = require( "node-cache" );

// const {
//   perform_validations,
// } = require('./validate');

const codeQueries = require('./code-queries');

const resultCache = new NodeCache( { stdTTL: 3600, checkperiod: 1200, useClones: false });

const PAGE_SIZE = 1000;

const qdef = require('./custom-queries.json');
const conditionallyVisibile = (item, dict) => (!item.hideIn || !item.hideIn.includes(dict)) && (!item.showIn || item.showIn.includes(dict)) && !item.hidden;

for (let g in qdef.groups) {
  qdef.groups[g].hidden = !conditionallyVisibile(qdef.groups[g], config.DICT)
}
qdef.queries = qdef.queries.filter(x => conditionallyVisibile(x, config.DICT));
// qdef.queries.sort((a, b) => a.caption > b.caption ? 1 : a.caption < b.caption ? -1 : 0);
qdef.queries.sort((a, b) => a.caption.localeCompare(b.caption));

const showQueries = (req, res, next) => {
  // TODO: apkarināt sarakstu ar skaitiem no cache, kur tie ir jau pieejami
  res.render('custom-query-list', { qdef, titlePrefix: 'Vaicājumu saraksts' });
}

const processQuery = async (req, res, next) => {
  const queryName = req.params.queryName;

  debug('query requested: slug=%s', queryName);
  // debug({ req });

  let q;
  if (queryName && queryName.trim().length > 0) {
    q = qdef.queries.find(x => x.name === queryName);
  }
  if (!q) {
    res.render('not-found', {data: {query: queryName}});
    return;
  }

  const app = req.app;
  const db = app.get('db');
  const dbschema = app.get('dbschema');

  let PARAMS = {};
  if (req.query && typeof req.query === 'object') {
    PARAMS = Object.assign(PARAMS, req.query);
  }
  if (req.body && typeof req.body === 'object') {
    PARAMS = Object.assign(PARAMS, req.body);
  }
  debug({ PARAMS });

  const pageStr = PARAMS.page;
  let pageNo = 1;
  if (pageStr) {
    try {
      pageNo = Number.parseInt(pageStr, 10);
    } catch {
      pageNo = 1;
    }
  }
 
  let tryFromCache = pageNo !== 1 && !q.skipCache;
  debug({ tryFromCache });
  let cacheKey;
  let queryResults;
 
  if (q.queryType === 'code') {
    if (codeQueries[q.codeFunction]) {
      // cacheKey = q.param ? `${q.codeFunction}-${q.param}` : q.codeFunction;
      cacheKey = q.name;
      if (tryFromCache) {
        debug(`mēģinām no cache ar atslēgu '${cacheKey}'`);
        queryResults = resultCache.get(cacheKey);
        debug(resultCache.getStats())
      }

      if (queryResults) {
        debug('izmantojam rezultātu no cache');
      } else {
        debug('rēķinām query no jauna');
        queryResults = await codeQueries[q.codeFunction](db, dbschema, q.param);
        resultCache.set(cacheKey, queryResults);
      }

    } else {
      res.render('not-found', { data: { message: 'neatradās vaicājums' } });
      return;
    }
  } else {
    // q.queryType SQL
    let sql;
    if (q.resultShape === 'eslx') {
      sql = `
      SELECT heading, human_key, lemma as slug, 'leksēma' as entity FROM dict.lexemes x JOIN dict.entries e ON e.id = x.entry_id WHERE ${q.where}
      UNION
      SELECT heading, human_key, gloss as slug, 'nozīme' as entity FROM dict.senses x JOIN dict.entries e ON e.id = x.entry_id WHERE ${q.where}
      UNION
      SELECT heading, human_key, content as slug, 'piemērs' as entity FROM dict.examples x JOIN dict.entries e ON e.id = x.entry_id WHERE ${q.where}
      UNION
      SELECT heading, human_key, '' as slug, 'šķirklis' as entity FROM dict.entries x WHERE ${q.where} ; `
    } else {
      sql = q.sql;
    }

    sql = sql.replace(/@@@USER_ID@@@/g, req.user.id);
    if (q.paramForm) {
      for (let f of q.paramForm.fields) {
        sql = sql.replaceAll(`@@@${f.name}@@@`, PARAMS[f.name]);
      }
    }
    debug({ sql });

    cacheKey = sql;
    if (tryFromCache) {
      queryResults = resultCache.get(cacheKey);
      debug(resultCache.getStats())
    }

    if (queryResults) { 
      debug('izmantojam rezultātu no cache');
    } else {
      debug('rēķinām query no jauna');

      queryResults = await db.query(sql);
      if (queryResults.length > 0) {
        if (q.resultShape === 'eslx') {
          queryResults.sort((a, b) => a.heading.localeCompare(b.heading) || a.human_key.localeCompare(b.human_key) || a.id - b.id);
        }
      }
      resultCache.set(cacheKey, queryResults);
    }
  }

  let paginationInfo;
  let resultsToShow;
  if (Array.isArray(queryResults)) {
    debug(`sarēķinājām, ${queryResults.length} rindas`);
    let pageSize = PAGE_SIZE;
    // const pageSizeStr = PARAMS.size;
    const pageSizeStr = q.pageSize;
    if (pageSizeStr) {
      try {
        pageSize = Number.parseInt(pageSizeStr, 10);
      } catch {
        pageSize = PAGE_SIZE;
      }
    }
    debug(PARAMS)
    debug({ pageSize });
    
    const totalPages = 1 + Math.floor((queryResults.length - 1) / pageSize);
    pageNo = Math.max(Math.min(totalPages, pageNo), 1);
  
    paginationInfo = {
      currentPage: pageNo,
      totalPages,
      totalRows: queryResults.length,
      pageSize,
    }
  
    debug('pirms slice')
    resultsToShow = queryResults.slice((pageNo - 1) * pageSize, pageNo * pageSize);
    debug('pēc slice')
  
  } else {
    resultsToShow = queryResults;
  }

  debug('done')

  if (Array.isArray(resultsToShow)) {
    debug('array', resultsToShow.length);
    if (resultsToShow.length > 0) {
      debug(resultsToShow[0]);
    }
    res.render('custom-query-results', { query: q, qdef, paginationInfo, titlePrefix: q.caption, results: resultsToShow });
  } else {
    debug('object', Object.keys(resultsToShow).length);
    res.render('custom-query-results', { query: q, qdef, paginationInfo, titlePrefix: q.caption, ...resultsToShow });
  }
  return;
}

const askForParams = async (req, res, next) => {
  const queryName = req.params.queryName;

  debug('params form requested: slug=%s', queryName);

  let q;
  if (queryName && queryName.trim().length > 0) {
    q = qdef.queries.find(x => x.name === queryName);
  }
  if (!q || !q.paramForm) {
    res.render('not-found', {data: {query: queryName}});
    return;
  }

  const app = req.app;
  const db = app.get('db');

  let paramForm = Object.assign({}, q.paramForm);
  for (let f of paramForm.fields) {
    if (f.type === 'select') {
      if (Array.isArray(f.values)) continue;
      if (!f.sql) {
        res.send(`parametram ${f.name} nav ne vērtību, ne vaicājuma`);
        return;
      }
      f.values = await db.query(f.sql);
    }
  }

  res.render('custom-query-param-form', { paramForm, targetQuery: queryName });

}

router.get('/', showQueries);

router.get('/p:queryName', askForParams);

router.get('/:queryName', processQuery);
router.post('/:queryName', processQuery);

module.exports = router;
