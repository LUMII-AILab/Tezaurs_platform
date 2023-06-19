const _ = require('lodash');
const Cache = require( "node-cache" );
const debug = require('debug')('auth');
const config = require('../config');

const userCache = new Cache({stdTTL: 300})

const getLoginFromBasicAuth = auth_header => {
  const PREFIX = 'Basic ';
  const encoded = auth_header.slice(PREFIX.length);
  const buff = Buffer.from(encoded, 'base64');
  const decoded = buff.toString('ascii');
  const sepPos = decoded.indexOf(':');
  if (sepPos > 0) return decoded.slice(0, sepPos);
}

const getUser = async login => {
  let user = userCache.get(login);
  if (!user) {
    user = await (await config.dbconn)[config.DB_SCHEMA].users.findOne({login});
    userCache.set(login, user);
  }
  if (!user) {
    debug('User not found in database', login);
    let user = await (await config.dbconn)[config.DB_SCHEMA].users.save({login, full_name: login});
    debug('Created a new user', user);
    userCache.set(login, user);
  }
  user = _.pick(user, ['id', 'login', 'full_name']);
  // debug('user', user)
  return user;
}

const authMiddleware = (req, res, next) => {
  const login = getLoginFromBasicAuth(req.headers.authorization || '') || 'unknown';
  Promise.resolve(getUser(login))
    .then(user => {
      req.user = user;
      res.locals.user = user;
      next()
    });
}

module.exports = {
  authMiddleware,
};
