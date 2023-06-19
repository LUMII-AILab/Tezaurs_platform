const express = require('express');
const router = express.Router();

router.get('/_/:pagename', async function(req, res, next) {
    const pagename = req.params.pagename;

    if (!pagename) {
        res.render('not-found');
        return;
    }

    // varbūt pārbaudīt, vai šāds pug eksistē?

    try {
        res.render(`pages/${pagename}`);
    }
    catch (err) {
        res.render('not-found');
    }
});

router.get('/__/:pagename', async function(req, res, next) {
    const pagename = req.params.pagename;

    if (!pagename) {
        res.render('not-found');
        return;
    }

    try {
        res.render(`restricted-pages/${pagename}`);
    }
    catch (err) {
        res.render('not-found');
    }
});

router.use((err, req, res, next) => {
    if (err instanceof Error && err.hasOwnProperty('view')) {
        res.locals.message = 'Lapa nav atrasta';
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500);
        // res.render('error');
        res.render('not-found');
        return;
    }

    next(err);
})

module.exports = router;
