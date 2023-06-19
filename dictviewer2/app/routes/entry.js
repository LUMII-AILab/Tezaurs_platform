const { APP_MODE, app_mode } = require('../config');

const entryForEditor = require('./entryForEditor');
// const entryForViewer = require('./entryForViewer-0');
const entryForViewer = require('./entryForViewer');

if (app_mode === APP_MODE.PUBLIC) {
  module.exports = entryForViewer;
} else {
  module.exports = entryForEditor;
}
