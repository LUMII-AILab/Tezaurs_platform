const { v4: uuid_v4 } = require('uuid');


const MARKER_NAME = 'dict_request_id';

const requestMarkerMiddleware = (req, res, next) => {
  req[MARKER_NAME] = uuid_v4();
  next();
}

const notReadyMiddleware = (req, res, next) => {
  if (!req.app.locals.isReady) {
    res.render('not-ready');
    return;
  }
  next();
}

module.exports = {
  notReadyMiddleware,
  requestMarkerMiddleware,
};
