const fetch = require('node-fetch');
const http = require('http');
const https = require('https');
const debug = require('debug')('api:utils');
const NodeCache = require( "node-cache" );

const config = require('../config');

let API_V1_ROOT;
if (config.USE_LOCAL_MORPHOSERVICE) {
  API_V1_ROOT = 'http://localhost:8182/v1';
} else {
  API_V1_ROOT = 'https://api.tezaurs.lv/v1';
}

const agent = API_V1_ROOT.startsWith('https:') 
  ? new https.Agent({ keepAlive: true }) 
  : new http.Agent({ keepAlive: true });

const API_TIMEOUT = 1000;

const morphoCache = new NodeCache({ stdTTL: 1800 });

const fetchCorporaExamples = async (word) => {
    debug(`Fetching corpora examples for ${word}`);

    // const url = `${API_V1_ROOT}/examples/${word}`;
    const url = `${API_V1_ROOT}/examples/${encodeURIComponent(word)}`;

    let data;

    try {
      debug('corpora examples API call:', url);
      const resp = await fetch(url, { 
        // agent,
        timeout: API_TIMEOUT 
      });
      if (resp.ok) {
        data = await resp.json();
        debug(data);
      } else {
        debug(`Response is not OK: ${resp.status}, ${resp}`);
      }
    } catch(err) {
      if (err.name === 'FetchError' && err.type === 'request-timeout') {
        debug('api timeout at', API_TIMEOUT);
      } else {
        debug('api error', url, err);
      }
    }

    // console.log(JSON.stringify(data, null, 2));

    return data || [];
}

const fetchInflections = async (word, paradigm, stem1, stem2, stem3, inflmisc) => {
    debug(`Fetching inflections for ${word} with paradigm ${paradigm}`);

    let url = `${API_V1_ROOT}/inflections/${encodeURIComponent(word)}?paradigm=${paradigm}`;

    if (stem1 || stem2 || stem3) {
        if (stem1) {
            url += `&stem1=${encodeURIComponent(stem1)}`;
        } else {
            url += '&stem1=';
        }

        if (stem2) {
            url += `&stem2=${encodeURIComponent(stem2)}`;
        } else {
            url += '&stem2=';
        }

        if (stem3) {
            url += `&stem3=${encodeURIComponent(stem3)}`;
        } else {
            url += '&stem3=';
        }
    }

    if (inflmisc) {
        url += `&inflmisc=${encodeURIComponent(inflmisc)}`;
    }

    let morphoKey = `${word}:${paradigm}:${stem1 || ''}:${stem2 || ''}:${stem3 || ''}:${inflmisc || ''}`;
    let cached = morphoCache.get(morphoKey);
    if (cached) {
      debug('cache hit:', morphoKey);
      debug('cache stats:', morphoCache.getStats());
      return cached;
    } else {
      debug('cache miss:', morphoKey);
    }

    let data;

    try {
      debug('morpho inflections API call:', url);
      const resp = await fetch(url, { timeout: API_TIMEOUT });
      if (resp.ok) {
        data = await resp.json();
        // debug(data);
      } else {
        debug(`Response is not OK: ${resp.status}, ${resp}`);
      }
    } catch(err) {
      if (err.name === 'FetchError' && err.type === 'request-timeout') {
        debug('api timeout at', API_TIMEOUT);
      } else {
        debug('api error when fetching inflections for:', word, paradigm, stem1, stem2, stem3);
        debug('api error', url, err);
      }
    }

    // console.log(JSON.stringify(data, null, 2));

    let result = data || [];
    morphoCache.set(morphoKey, result);
    return result;
}

module.exports = { fetchCorporaExamples, fetchInflections };
