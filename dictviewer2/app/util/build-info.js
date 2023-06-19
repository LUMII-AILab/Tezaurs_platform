let buildtime;
let gitcommitinfo;

try {
  if (process.env.BUILD_TS) {
    buildtime = process.env.BUILD_TS;
  } else {
    buildtime = require('./_build_time').buildTime;
  }
} catch (err) {
  console.error(err);
  buildtime = 'unknown';
}

try {
  if (process.env.GIT_COMMIT) {
    gitcommitinfo = process.env.GIT_COMMIT;
  } else {
    gitcommitinfo = require('./_git_commit_info').logMessage;
  }
} catch (err) {
  console.error(err);
  gitcommitinfo = 'unknown';
}

module.exports = {
  buildtime,
  gitcommitinfo
};
