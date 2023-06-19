var express = require('express');
var router = express.Router();

router.get('/vardnicas', async function(req, res, next) {
    res.render('dictionaries');
});

module.exports = router;
