const express = require('express');
const router = express.Router();

const SPECIAL_DAY = {
  year: 2022,
  month: 4,
  date: 1
}

/* GET home page. */
router.get('/', (req, res, next) => {
  let d1 = new Date();
  if (
    d1.getDate() === SPECIAL_DAY.date
    && d1.getMonth() + 1 === SPECIAL_DAY.month 
    && d1.getFullYear() === SPECIAL_DAY.year 
    && req.app.locals.dict === 'tezaurs'
    && req.app.locals.app_mode === req.app.locals.APP_MODE.PUBLIC
    ) {
      res.render('index-piegdiena', { title: 'Tēzaurs.lv' });
      return;
  }
  res.render('index', { title: 'Tēzaurs.lv' });
});

module.exports = router;
