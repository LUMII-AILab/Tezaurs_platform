const config = require('../config');
const yup = require('yup');
const _ = require('lodash');
const bodyParser = require('body-parser');
const router = require('express').Router();

const qdef = require('./custom-queries/custom-queries.json');

const dbconn = config.dbconn;
const schema = config.DB_SCHEMA;

const STATUS= {
  new: 0, // Jauns
  done: 1, // Salabots
  postponed: 2, // Atlikts
  spam: 3, // Atkritums
  delegated: 4, // Deleģēts
};

const feedbackSchema = yup.object().shape({
  id: yup.number(),
  entry_id: yup.number().required(),
  text: yup.string().trim().required(),
  created_at: yup.date(),
  status: yup.number().default(STATUS.new),
  fixed_at: yup.date().nullable(),
  fixed_by: yup.number().nullable(),
});

const wrap = async (callback, req) => {
  return callback(req).catch(error => {return {error}});
};

const validate = async (data, callback) => {
  return feedbackSchema.validate(data)
    .then(async (validated) => {
      return await callback(validated);
    })
    .catch((e) => {return {error: e}});
};

const updateFeedback = async (req) => {
  return await validate(req.body, async (data) => {
    return await (await dbconn).withTransaction(async tx => {
      return await tx[schema].feedbacks.save(data);
    });
  });
};

const saveFeedback = async (req) => {
  return await validate(req.body, async (data) => {
    return await (await dbconn).withTransaction(async tx => {
      return await tx[schema].feedbacks.insert(data);
    });
  });
};

const getFeedbacks = async (req) => {
  const db = req.app.get('db');
  let entries = await db.query(
    'SELECT f.id, f.entry_id, f.status, f.text, f.created_at, e.heading, e.human_key ' +
    'FROM dict.feedbacks f ' +
    'JOIN dict.entries e on e.id = f.entry_id');

  entries = _(entries)
    .groupBy('entry_id')
    .map(e => {
      return {
        feedbacks: _.orderBy(e, 'created_at', 'desc'),
        entry: e[0].heading,
        entry_id: e[0].entry_id,
        human_key: e[0].human_key
      }
    })
    .value();

  // let issues = await getIssues(req, _.map(entries, 'entry_id'));

  // return {entries, queries: issues.queries};
  return {entries, queries: []};
};

/**
 * Get issues (found by custom-queries) for the specified entries
 * @param req
 * @param ids
 * @param withFeedback - include the pending user feedback
 * @returns {Promise<{queries: {}}>}
 */
const getIssues = async (req, ids, withFeedback=false) => {
  const db = req.app.get('db');

  let issues = {queries: {}};
  ids.forEach(id => {issues.queries[id] = []});

  for (const q of qdef.queries) {
    if (q.notIssue) continue;
    let m = /(.+?WHERE) (.+)(ORDER BY .+)/mg.exec(q.sql);
    if (m) {
      let colName = q.sql.indexOf('entries e') > 0 ? 'e.id' : 'id';
      let sql = `${m[1]} ${colName} IN (${ids.join(', ')}) AND (${m[2]}) ${m[3]}`;
      let result = await db.query(sql).catch(() => {});
      if (result && result.length > 0) {
        _.uniq(_.map(result, 'id')).forEach((id) => issues.queries[id].push({caption: q.caption, name: q.name}));
      }
    }
  }

  if (withFeedback) {
    issues.feedbacks = await db[schema].feedbacks.find(
      {entry_id: ids, status: STATUS.new},
      {order: [{field: 'created_at', direction: 'desc'}]}
    )
  }

  return issues;
};

const getEntryIssues = async (req) => {
  let withFeedback = req.params.with_feedback === 'true';
  const id = parseInt(req.params.entry_id, 10);
  return await getIssues(req, [id], withFeedback);
};

// ---------------------------------------------------
/**
 * Note: Editing happens in darbaversija (public version is clean).
 * Thus all feedback related actions should access darabaversija's db.
 * The proxy forwards requests from public to darbaversija.
 */

router.post(
  '/api/feedback/create',
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  async (req, res) => {
  return res.json(await wrap(saveFeedback, req));
});

if (config.app_mode !== config.APP_MODE.PUBLIC) {

  router.post('/api/feedback/done', async (req, res) => {
    req.body.status = STATUS.done;
    if (req.user) {
      req.body.fixed_by = req.user.id;
    }
    req.body.fixed_at = new Date();
    return res.json(await wrap(updateFeedback, req));
  });

  router.post('/api/feedback/postpone', async (req, res) => {
    req.body.status = STATUS.postponed;
    if (req.user) {
      req.body.fixed_by = req.user.id;
    }
    req.body.fixed_at = new Date();
    return res.json(await wrap(updateFeedback, req));
  });

  router.post('/api/feedback/spam', async (req, res) => {
    req.body.status = STATUS.spam;
    if (req.user) {
      req.body.fixed_by = req.user.id;
    }
    req.body.fixed_at = new Date();
    return res.json(await wrap(updateFeedback, req));
  });

  router.post('/api/feedback/delegate', async (req, res) => {
    req.body.status = STATUS.delegated;
    if (req.user) {
      req.body.fixed_by = req.user.id;
    }
    req.body.fixed_at = new Date();
    return res.json(await wrap(updateFeedback, req));
  });

  router.post('/api/feedback/reset', async (req, res) => {
    req.body.status = STATUS.new;
    if (req.user) {
      req.body.fixed_by = req.user.id;
    }
    req.body.fixed_at = new Date();
    return res.json(await wrap(updateFeedback, req));
  });

  router.get('/api/list/:entry_id/:with_feedback', async (req, res) => {
    return res.json(await wrap(getEntryIssues, req));
  });

  router.get('/feedback/list', async (req, res) => {
    res.render('feedback-table', await wrap(getFeedbacks, req));
  });
}

module.exports = router;
