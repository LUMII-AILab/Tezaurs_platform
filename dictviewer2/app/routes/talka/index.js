const config = require('../../config');
const debug = require('debug')('talka');
const express = require('express');
const router = express.Router();

const { list, action } = require('./talka-1');

router.get('/', list);
router.patch('/', action);

module.exports = router;
