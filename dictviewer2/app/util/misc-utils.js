const ENABLED_MD_ELEMENTS = [
  'normalize',
  'block',
  'inline',
  'replacements',
  'smartquotes',
  'paragraph',
  'text',
  'fence',
  'newline',
  'escape',
  'emphasis',
  'link',
  'html_inline',
  'entity',
  'sub', 
  'sup', 
];

const DISABLED_MD_ELEMENTS = [
  'linkify', 
  'table',
  'code',
  'blockquote',
  'hr',
  'list',
  'reference',
  'html_block',
  'heading',
  'lheading',
  'backticks',
  'strikethrough',
  'image',
  'autolink',
];

const md = require('markdown-it')({
  html: true, // to be removed later
  xhtmlOut: false,
  breaks: true,
  linkify: false,
  typographer: true,
  quotes: '“”‘’', // vai tiešām neeksistē lv vadlīnijas?
})
  // .use(require('markdown-it-abbr')) // abbr_replace, abbr_def
  // .use(require('markdown-it-attrs')) // curly_attributes
  // .use(require('markdown-it-deflist')) // deflist
  // .use(require('markdown-it-emoji')) // emoji
  // .use(require('markdown-it-highlightjs'))
  .use(require('markdown-it-sub')) // sub ~A~ => <sub>A</sub>
  .use(require('markdown-it-sup')) // sup ^A^ => <sup>A</sup>
  .use(require('markdown-it-plain-text'))
  .enable(ENABLED_MD_ELEMENTS, true)
  .disable(DISABLED_MD_ELEMENTS, true)

const fullMarkdownDecoder = str => md.renderInline(str);

const fullMarkdownDecoder0 = str => { 
  // console.log('😍 😍 😍', [ 'core', 'block', 'inline' ].flatMap(c => md[c].ruler.__rules__).map(r => r.name))
  return md.renderInline(str); 
}

const syntaxHighlight = (data, br=true) => {
  if (!data) return null;

  let json;
  if (typeof data === 'object') {
    json = JSON.stringify(data);
  } else {
    json = data;
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'json-number';
      if (/^"/.test(match)) {
          if (/:$/.test(match)) {
              cls = 'json-key';
          } else {
              cls = 'json-string';
          }
      } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
      } else if (/null/.test(match)) {
          cls = 'json-null';
      }
      if (br && cls !== 'json-key') {
        return '<span class="' + cls + '">' + match + '</span><br />';
      } else {
        return '<span class="' + cls + '">' + match + '</span>';
      }
  });
}

const prettifyString = (str) => {
    let str2 = str
      .trim()
      .replace(/-->/g, '→')
      .replace(/==>/g, '→')
      .replace(/->/g, '→')
      .replace(/=>/g, '→')
      .replace(/→/g, ' → ')
      .replace(/\s{2,}/g, ' ')
      .replace(/ - /g, ' — ') // em-dash
      .replace(/(\\d)-(\\d)/g, '$1–$2') // en-dash

  return str2;
}

const preparePronunciation = pron => pron
  .trim()
  .replace(/,/g, '\u0327')
  .replace(/~/g, '\u0303')
  .replace(/\^/g, '\u0302')
  .replace(/\\/g, '\u0300')
  .replace(/!/g, '\u02c8')
  .replace(/%/g, '\u02b2');

const preparePronunciations = arrPron => {
  console.log(arrPron);
  return arrPron.map(p => preparePronunciation(p)).join(', ');
};

const prepareInflection = infl => {
  if (!infl) return infl;
  if (infl.indexOf('[') < 0) return infl;
  let done = [];
  let pos = 0;
  while (pos < infl.length) {
    let opener = infl.indexOf('[', pos);
    if (opener < 0) {
      done.push(infl.slice(pos));
      break;
    }
    done.push(infl.slice(pos, opener + 1));
    pos = opener + 1;
    let closer = infl.indexOf(']', opener);
    if (closer < 0) {
      done.push(infl.slice(pos));
      break;
    }
    done.push(preparePronunciation(infl.slice(opener + 1, closer)));
    done.push(']');
    pos = closer + 1;

  }
  let result = done.join('');
  return result;
}

/*
  text_prim = text_prim.replace("<?xml version=\"1.0\" encoding=\"UTF-8\"?>{{NEW_LINE}}", "");
  text_prim = text_prim.replace("{{NEW_LINE}}", "\n");
  text_prim = text_prim.replace("{{TAB}}", "\t");

  text_prim = text_prim.replace("&gt;", ">");
  text_prim = text_prim.replace("&gt;", ">");
  text_prim = text_prim.replace("&lt;", "<");
  text_prim = text_prim.replace("&amp;", "&");

*/

const simpleMarkdownDecoder = (str) => {
  if (!str) return null;

  const REGEX_ITALICS = /\_\_(\S(.*?\S)?)\_\_/gm;
  const ITALICS_OPEN = '<em>';
  const ITALICS_CLOSE = '</em>';
  let italicized = str.replace(REGEX_ITALICS, '<em>$1</em>');
  return italicized;
}

function* getGuessedDerivatives(slug) {
  if (!slug) return;

  // TODO:
  // detalizēt pārveidojumu tabulu,
  // 1) pieliekot jaunus likumu veidus,
  // 2) pieliekot minējuma tipu (atvasinājums, cits skaitlis, ...),
  // 3) šos minējuma tipus atdot kopā ar rezultātu, lai varētu vizualizēt saskarnē

  const SWAP_SUFFIXES = [
    { from: 'ēdis', to: [ 'ēži' ] },
    { from: 'ieki', to: [ 'ieks', 'iece' ] },
    { from: 'ieši', to: [ 'iete', 'ietis']  },
    { from: 'is', to: [ 'ji', 'ītis' ] },
    { from: 'ītis', to: [ 'īši' ] },
    // { from: 'lnis', to: [ 'ļņi' ] },
    { from: 'loģija', to: [ 'logs' ] },
    { from: 't', to: [ 'šana', 'tava', 'tājs' ] },
    { from: 'ties', to: [ 'šanās' ] },
    { from: 'ošs', to: [ 'ts' ] },
    { from: 's', to: [ 'ais' ] },
  ];

  for (let subst of SWAP_SUFFIXES) {
    if (slug.endsWith(subst.from)) {
      let base = slug.slice(0, slug.length - subst.from.length);
      for (let suff of subst.to) {
        yield { guess: base + suff, guess_type: 5 };
      }
    }
  }

  // nest -> nenest, nesties -> nenesties
  if (slug.endsWith('t') || slug.endsWith('ties')) {
    yield { guess: 'ne' + slug, guess_type: 5 };
  }
}

const collate = str => str.toLowerCase()
    .replace(/ā/g, 'a')
    .replace(/ē/g, 'e')
    .replace(/ī/g, 'i')
    .replace(/ō/g, 'o')
    .replace(/ū/g, 'u');

const collateAll = str => collate(str)
    .replace(/č/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/ģ/g, 'g')
    .replace(/ķ/g, 'k')
    .replace(/ļ/g, 'l')
    .replace(/ņ/g, 'n')
    .replace(/ŗ/g, 'r');

const asciify = str => collateAll(str);

const asciify2 = str => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const asciify3 = str => asciify2(str).replace(/[\-\/\&\(\)\[\]\.,!\?%:'"ˋ]/g, '');

const soundex = str => {
  if (!str) return str;

  let w = collate(str);
  if (w.length < 2) return w;

  const c1 = w.slice(0, 1);
  let rest = w.slice(1);

  rest = rest
    .replace(/i/g, '[1]')
    .replace(/e/g, '[1]')

    .replace(/a/g, '[2]')
    .replace(/o/g, '[2]')
    .replace(/u/g, '[2]')

    .replace(/s/g, '[3]')
    .replace(/z/g, '[3]')

    .replace(/š/g, '[4]')
    .replace(/ž/g, '[4]')

    .replace(/b/g, '[5]')
    .replace(/p/g, '[5]')

    .replace(/g/g, '[6]')
    .replace(/k/g, '[6]')

    // .replace(/ģ/g, '[14]')
    // .replace(/ķ/g, '[14]')

    .replace(/ll/g, '[7]')
    .replace(/l/g, '[7]')

    .replace(/ļļ/g, '[8]')
    .replace(/ļ/g, '[8]')

    .replace(/mm/g, '[9]')
    .replace(/m/g, '[9]')

    .replace(/nn/g, '[10]')
    .replace(/n/g, '[10]')

    .replace(/ņņ/g, '[11]')
    .replace(/ņ/g, '[11]')

    .replace(/rr/g, '[12]')
    .replace(/r/g, '[12]')

    .replace(/ŗŗ/g, '[13]')
    .replace(/ŗ/g, '[13]');

    // neaiztikti burti: ķģ c č dt f h j

  rest = rest
    .replace(/ķ/g, '[14]')
    .replace(/ģ/g, '[14]')

    .replace(/d/g, '[15]')
    .replace(/t/g, '[15]');

    return c1 + rest;
}

const soundex2 = str => {
  if (!str) return str;

  let w = str.toLowerCase();
  const X = 945;

  w = w
    .replace(/^ai/, 'ae')

    .replace(/ai/g, String.fromCharCode(X + 1))
    .replace(/aj/g, String.fromCharCode(X + 1))

    .replace(/ei/g, String.fromCharCode(X + 2))
    .replace(/ej/g, String.fromCharCode(X + 2))

    .replace(/ui/g, 'uj')

    .replace(/au/g, 'av')

    .replace(/oi/g, 'oj')

    .replace(/iu/g, 'iv')

    .replace(/eu/g, 'ev')

    .replace(/ou/g, 'ov')

    .replace(/^ais/g, String.fromCharCode(X + 3))
    .replace(/^aiz/g, String.fromCharCode(X + 3))

    .replace(/^is/g, String.fromCharCode(X + 4))
    .replace(/^iz/g, String.fromCharCode(X + 4))

    .replace(/jš$/g, 'š')
    .replace(/šs$/g, 'š')
    .replace(/šs$/g, 'š')

    .replace(/ts$/g, 'c')
    .replace(/ds$/g, 'c')

    .replace(/zs$/g, 's')
    .replace(/ss$/g, 's')

    .replace(/ua/g, String.fromCharCode(X + 5))
    .replace(/uo/g, String.fromCharCode(X + 5))
    .replace(/o/g, String.fromCharCode(X + 5))
    .replace(/oo/g, String.fromCharCode(X + 5))

    .replace(/ia/g, String.fromCharCode(X + 6))
    .replace(/ie/g, String.fromCharCode(X + 6))

    .replace(/eē/g, String.fromCharCode(X + 7))
    .replace(/ee/g, String.fromCharCode(X + 7))
    .replace(/ē/g, String.fromCharCode(X + 7))
    .replace(/e/g, String.fromCharCode(X + 7))

    .replace(/uu/g, String.fromCharCode(X + 8))
    .replace(/ū/g, String.fromCharCode(X + 8))
    .replace(/u/g, String.fromCharCode(X + 8))

    .replace(/aā/g, String.fromCharCode(X + 9))
    .replace(/aa/g, String.fromCharCode(X + 9))
    .replace(/ā/g, String.fromCharCode(X + 9))
    .replace(/a/g, String.fromCharCode(X + 9))

    .replace(/ll/g, 'l')
    .replace(/ļļ/g, 'ļ')
    .replace(/mm/g, 'm')
    .replace(/nn/g, 'n')
    .replace(/ņņ/g, 'ņ')
    .replace(/rr/g, 'r')
    .replace(/ŗŗ/g, 'ŗ')
    .replace(/pp/g, 'p')
    .replace(/tt/g, 't')
    .replace(/ss/g, 's')
    .replace(/kk/g, 'k')
    .replace(/(.+)šš(.+)/g, '$1š$2')

    .replace(/b/g, 'p')
    .replace(/d/g, 't')
    .replace(/g/g, 'k')
    .replace(/ģ/g, 'ķ')
    .replace(/z/g, 's')
    .replace(/ž/g, 'š');

    return w;
}

const levenshtein_group = str => {
  // let w = collateAll(str);
  let w = asciify2(str);
  let sum = 0;

  for (let i = 0; i < w.length; i += 1) {
    let x = w.charCodeAt(i);
    if (x >= 97 && x <= 122) { // a..z
      sum += x;
    }
  }
  return sum;
}

/**
 * Computes the Damerau–Levenshtein distance.
 *
 * http://en.wikipedia.org/wiki/Levenshtein_distance
 * http://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance
 * http://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Levenshtein_distance#Java
 * http://stackoverflow.com/questions/4055488/how-to-modify-levenshteins-edit-distance-to-count-adjacent-letter-exchanges-as
 *
 */
const ll2 = (s1, s2) => {
  // let str1 = collateAll(s1);
  let str1 = s1;
  // let str2 = collateAll(s2);
  let str2 = s2;

  let distance = Array.from(new Array(str1.length + 1), x => new Array(str2.length + 1));
  for (let i = 0; i <= str1.length; i += 1) {
    for (let j = 0; j <= str2.length; j += 1) {
      distance[i][j] = 0;
    }
  }

  for (let i = 1; i <= str1.length; i++) distance[i][0] = i;

  // target prefixes can be reached from empty source prefix
  // by inserting every characters
  for (let j = 1; j <= str2.length; j++) distance[0][j] = j;

  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {

      if (str1.charAt(i-1) === str2.charAt(j-1)) {
        distance[i][j] = distance[i-1][j-1]; // no operation required
      }

      else if (i > 1 && j > 1 && str1.charAt(i-1) === str2.charAt(j-2) && str1.charAt(i-2) === str2.charAt(j-1)) {
        distance[i][j] = Math.min(
          distance[i-2][j-2] + 1, // transposition
          distance[i-1][j  ] + 1, // deletion
          distance[i  ][j-1] + 1, // insertion
          distance[i-1][j-1] + 1  // substitution
        );
      }

      else {
        distance[i][j] = Math.min(
          distance[i-1][j  ] + 1, // deletion
          distance[i  ][j-1] + 1, // insertion
          distance[i-1][j-1] + 1  // substitution
        );
      }
    }
  }

  return distance[str1.length][str2.length];

}

/**
 * Based on Wagner-Fischer dynamic programming algorithm, optimized for speed and memory
 * https://github.com/gustf/js-levenshtein
 *
 */
const ll = (a, b) => {
  const _min = (d0, d1, d2, bx, ay) =>
  {
    return d0 < d1 || d2 < d1
        ? d0 > d2
            ? d2 + 1
            : d0 + 1
        : bx === ay
            ? d1
            : d1 + 1;
  }

  if (a === b) {
    return 0;
  }

  if (a.length > b.length) {
    let tmp = a;
    a = b;
    b = tmp;
  }

  let la = a.length;
  let lb = b.length;

  while (la > 0 && (a.charCodeAt(la - 1) === b.charCodeAt(lb - 1))) {
    la--;
    lb--;
  }

  let offset = 0;

  while (offset < la && (a.charCodeAt(offset) === b.charCodeAt(offset))) {
    offset++;
  }

  la -= offset;
  lb -= offset;

  if (la === 0 || lb < 3) {
    return lb;
  }

  let x = 0;
  let y;
  let d0;
  let d1;
  let d2;
  let d3;
  let dd;
  let dy;
  let ay;
  let bx0;
  let bx1;
  let bx2;
  let bx3;

  let vector = [];

  for (y = 0; y < la; y++) {
    vector.push(y + 1);
    vector.push(a.charCodeAt(offset + y));
  }

  let len = vector.length - 1;

  for (; x < lb - 3;) {
    bx0 = b.charCodeAt(offset + (d0 = x));
    bx1 = b.charCodeAt(offset + (d1 = x + 1));
    bx2 = b.charCodeAt(offset + (d2 = x + 2));
    bx3 = b.charCodeAt(offset + (d3 = x + 3));
    dd = (x += 4);
    for (y = 0; y < len; y += 2) {
      dy = vector[y];
      ay = vector[y + 1];
      d0 = _min(dy, d0, d1, bx0, ay);
      d1 = _min(d0, d1, d2, bx1, ay);
      d2 = _min(d1, d2, d3, bx2, ay);
      dd = _min(d2, d3, dd, bx3, ay);
      vector[y] = dd;
      d3 = d2;
      d2 = d1;
      d1 = d0;
      d0 = dy;
    }
  }

  for (; x < lb;) {
    bx0 = b.charCodeAt(offset + (d0 = x));
    dd = ++x;
    for (y = 0; y < len; y += 2) {
      dy = vector[y];
      vector[y] = dd = _min(dy, d0, dd, bx0, vector[y + 1]);
      d0 = dy;
    }
  }

  return dd;
};

/*
const test = (a, b) => {
  console.log(`Testing ${a} / ${b} = ${ll(a, b)}; ${ll2(a, b)}`);
}

test("acs","acs");

test("un","u");

test("sun","suns");

test("ģenitīvs","ģenetīvs");

test("transpozīcija","tranpsozīcija");

test("rtanspozicija","transpozicija");

test("rtanspozicija","tranpsozicija");

test("kokodu","kakadu");

test("maja","māja");

test("māja","maja");

test("mērs","mers");

test("kakis","kaķis");

test("mērkaķis","merkakis");

console.log('comparing ll and ll2');
console.time('ll');
for (let i = 0; i < 100000; i += 1) {
  // let x = ll("ģenitīvs","ģenetīvs");
  let x = ll("rtanspozicija","transpozicija");
}
console.timeEnd('ll');

console.time('ll2');
for (let i = 0; i < 100000; i += 1) {
  // let x = ll2("ģenitīvs","ģenetīvs");
  let x = ll2("rtanspozicija","transpozicija");
}
console.timeEnd('ll2');
*/

module.exports = {
  syntaxHighlight,
  prettifyString,
  // markdownDecoder: simpleMarkdownDecoder,
  markdownDecoder: fullMarkdownDecoder,
  preparePronunciations,
  preparePronunciation,
  prepareInflection,
  // asciify: asciify2,
  asciify: asciify3,
  soundex: soundex2,
  levenshtein_group,
  levenshtein_distance: ll2,
  getGuessedDerivatives,
};
