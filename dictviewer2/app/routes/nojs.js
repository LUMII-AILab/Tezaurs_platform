const debug = require('debug')('nojs');
const express = require('express');
const router = express.Router();

const redirectNoJS = (req, res, next) => {
  const word = req.param('w');
  if (word) {
    res.redirect(`/${encodeURIComponent(word).replace('%3A', ':')}`);
    return;
  }

  next();
}

router.use('/', redirectNoJS);

module.exports = router;
