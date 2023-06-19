const debug = require('debug')('linkifier');
const config = '../config.js';

const word_qualifier = '';

const wordPlus = /^[\wāēīōūķļņģŗčšž\d]+( \d*([\d,]+))$/i;

const SIMPLE_WORD = /^([\wāēīōūķļņģŗčšž\d]+)$/i;

// const QUALIFIED_WORD = /^([\wāēīōūķļņģŗčš\d]+)( (\d*)(\(([\d\-, ]+)\))?)?$/i;
// const QUALIFIED_WORD = /^([\wāēīōūķļņģŗčšž\d]+)(?: (\d*)(?:\(([\d\-, ]+)\))?)?$/i;

// Kvalificēta vārda atpazīšana: 1: word, 2: homonym id; 3: sense list

// variants 1) der: "suns", "suns 2", "suns 2(3)", "suns 2(3,5-6)", "suns(3)"; neder: "suns (3)"
const QUALIFIED_WORD_1 = /^([\wāēīōūķļņģŗčšž\d]+)(?: (\d+))?(?:\(([\d\-, ]+)\))?$/i;

// 2) speciālvariants priekš "suns (3)"
const QUALIFIED_WORD_2 = /^([\wāēīōūķļņģŗčšž\d]+)() (?:\(([\d\-, ]+)\))$/i;

const GLOSS_LINK = /^\[(?<text>[^\[]*)\]\{(?<type>[esn])?\:?(?<id>[0-9]*)\}$/i;
const GLOSS_LINK_GLOBAL = /\[(?<text>[^\[]*)\]\{(?<type>[esn])?\:?(?<id>[0-9]*)\}/g;

const EXCLUSION_LIST = [
  'kas',
  'kā',
  'kam',
  'ko',
  'kur',
  'kāds',
  'kad',

  'tas',
  'tā',
  'tam',
  'to',
  'tur',
  'tāds',
  'tad',

  'tie',
  'tiem',
  'tos',
  'tajos',

  'tās',
  'tām',
  'tās',
  'tajās',

  'sev',
  'sevī',

  'aiz',
  'ap',
  'ar',
  'bez',
  'ka',
  'no',
  'pa',
  'par',
  'pār',
  'pie',
  'pret',
  'uz',
  'piemēram',
  'piem.',
  'sk.',
  'panākt',
];

// const wrapLink = (w, t) => `<a href="/w/${w.toLowerCase()}">${t || w}</a>`;
// const wrapLink = (w, t) => `<a href="/mlvv/${w.toLowerCase()}">${t || w}</a>`;
// const wrapLink = (w, t) => `<a href="/${w.toLowerCase()}">${t || w}</a>`;
const wrapLink = (w, t) => `<a href="/${w}">${t || w}</a>`;

/**
 * TODO: analizēt glosu un mēģināt ielikt saites uz citiem šķirkļiem
 * 1) sadalīt pa ; un (), kā arī noņemt beigu punktu; nedrīkst aiztikt mazās iekavas "suns (3)"
 * 2) ieeja -> skaidrojumi ((Dem.|Rezultāts|Divd.|Refl.) -> sth)
 * 3) sadalīt pa , // linkojam ar komatu atdalītus vienvārdus, e.g., tikle == "Tikumība, pieticība"
 * 3c) w un w
 * 3d) w (w) // aizplūdīt => Aizpludināt (kokmateriālus).
 * 3) w (w, w, ...)
 * 4) atstāt tos, kuri formā {w} vai {w}{space}{qualifier}, kur qualifier: {number}|{number}({reflist}),
 *   suns (2), suns 2, suns 2(2), suns 2(1,2, 4-5), arī suns(2);
 * reflist: saraksts no number un intervals
 * interval: number-number
 * salīdzināšanas case – visi burti, izņemot pirmo burtu, ir jāsalīdzina sensitīvi
 *
 * Ko vēl jāpamana:
 * - vietas, kur vajadzētu būt semikolam, bet ir komats: "Vispārināta īpašība → divnozīmīgs, šīs īpašības konkrēta izpausme."
 * - stabilus vairākvārdu savienojumus??
 */

const first_id_from_idlist = (idlist) => {
  let items = idlist.split(',');
  if (items[0].includes('-')) {
    let before = items[0].slice(0, items[0].indexOf('-')).trim();
  } else {
    return items[0].trim();
  }
}

const incrementCounter = () => {
  global.__n_syn += 1;
}

const linkifyGlossLink = (cache, w) => {
  let match = GLOSS_LINK.exec(w);
  if (match) {
    const type = match.groups.type === 'e' ? 'entry' : 'sense';
    const id = parseInt(match.groups.id);
    if (cache.glossLinks[type].has(id)) {
      const glossLink = cache.glossLinks[type].get(id);
      let linkText = match.groups.text;
      if (glossLink.entry.homonym_no !== 1) {
        linkText += `<sup>${glossLink.entry.homonym_no}</sup>`;
      }
      if (type === 'sense') {
        const fullOrderNo = (glossLink.sense.parent_order_no ? `${glossLink.sense.parent_order_no}.`: '') + glossLink.sense.order_no;
        linkText += `<sub>${fullOrderNo}</sub>`;
      }
      return wrapLink(glossLink.entry.human_key, linkText);
    } else {
      return match.groups.text; // The link has been deleted
    }
  }
  return null;
}

const linkifyWord = (cache, w) => {
  debug('word:', w);

  if (EXCLUSION_LIST.includes(w.toLowerCase())) return null;

  // TODO: iekļaut arī {w}šana -> {w}t un {w}šanās -> {w}ties

  let match = QUALIFIED_WORD_1.exec(w);
  if (!match) match = QUALIFIED_WORD_2.exec(w);
  if (!match) {
    let linkifiedAny = false;
    let linkifiedGlossLinks = [];
    const words = w.split(' ');
    for (const word of words) {
      let linkifiedGlossLink = linkifyGlossLink(cache, word);
      if (linkifiedGlossLink) {
        linkifiedGlossLinks.push(linkifiedGlossLink);
        linkifiedAny = true;
      } else {
        linkifiedGlossLinks.push(word);
      }
    }
    return linkifiedAny ? linkifiedGlossLinks.join(' ') : null;
  }
  // console.log('match: ', match);

  debug('match:', match[1], match[2], match[3]);

  let found;
  let word = match[1];
  if (match[2]) { // vai ir homonīma ID
    // let probe = `${word.toLowerCase()}:${match[2]}`;
    let probe = `${word}:${match[2]}`;
    // found = cache.find(e => e.human_key && e.human_key === probe);
    found = cache.entriesByHK.has(probe);
    if (found) {
      incrementCounter();
      return wrapLink(probe, w);
    }
    console.error(`norādīts vārds ar homonīma id: ${w}, bet tāda šķirkļa nav`);
    // found = cache.find(e => e.human_key === word.toLowerCase());
    // found = cache.entriesByHeading.has(word.toLowerCase());
    found = cache.entriesByHeading.has(word);
    if (found) {
      incrementCounter();
      return wrapLink(word, w);
    }
    return null;
  } else {
    // mēģinām atrast precīzu šķirkli
    // found = cache.find(e => e.human_key === word.toLowerCase());
    // found = cache.entriesByHK.has(`${word.toLowerCase()}:1`);
    found = cache.entriesByHK.has(`${word}:1`);
    if (found) {
      incrementCounter();
      // return wrapLink(`${word.toLowerCase()}:1`, w);
      return wrapLink(`${word}:1`, w);
    }
    // found = cache.entriesByHeading.has(word.toLowerCase());
    found = cache.entriesByHeading.has(word);
    if (found) {
      incrementCounter();
      // return wrapLink(word.toLowerCase(), w);
      return wrapLink(word, w);
    }
  }
  return null;
}

const linkifyInnerPart = (cache, innerPart) => {
  debug('inner:', innerPart);

  if (EXCLUSION_LIST.includes(innerPart.toLowerCase())) return null;

  if (innerPart.includes(' ')) {
    // vārdus šādi linkot ir bīstami, jo varam iegūt saiti no 'bedres' uz 'Bedres' (īpašvārds) utml.,
    //   un vārdiem lielie/mazie burti ir puslīdz ticami

    if (cache.entriesByHeading.has(innerPart)) {
      const target = cache.entriesByHeading.get(innerPart)[0];
      return wrapLink(target.human_key, innerPart);
    }

    // if (cache.entriesByHeadingInLowerCase.has(innerPart.toLowerCase())) {
    //   const target = cache.entriesByHeadingInLowerCase.get(innerPart.toLowerCase())[0];
    //   return wrapLink(target.human_key, innerPart);
    // }

    // if (cache.entriesByHeading.has(innerPart.toLowerCase())) {
    //   const target = cache.entriesByHeading.get(innerPart.toLowerCase())[0];
    //   return wrapLink(target.human_key, innerPart);
    // }

    if (cache.entriesByHeadingInLowerCase.has(innerPart)) {
      const target = cache.entriesByHeadingInLowerCase.get(innerPart)[0];
      return wrapLink(target.human_key, innerPart);
    }
  }

  // console.log(`inner part: ${part}`);
  let match, l;
  // TODO: citi, līdzīgi ievadvārdi: lai, kas, kad, ar,
  if (innerPart.startsWith('arī ')) {
    l = linkifyWord(cache, innerPart.slice(4));
    if (l) { return `arī ${l}`; }
  }

  return linkifyWord(cache, innerPart);
  /*
  // FIXME: quick and dirty apiešanās ar iekavām!
  if (part.startsWith('(')) {
    if (part.endsWith(')')) { // (suns)
      l = linkifyWord(cache, part.slice(1, part.length - 1));
      return l ? `(${l})` : null;
    } else { // (suns
      l = linkifyWord(cache, part.slice(1));
      return l ? `(${l}` : null;
    }
  } else if (part.endsWith(')')) { // suns)
    l = linkifyWord(cache, part.slice(0, part.length - 1));
    return l ? `${l})` : null;
  } else { // suns
    return linkifyWord(cache, part);
  }
  return null;
  */
}

const linkifyOuterPart = (cache, outerPart) => {
  debug('outer:', outerPart);

  if (EXCLUSION_LIST.includes(outerPart.toLowerCase())) return null;

  if (outerPart.includes(' ')) {
    if (cache.entriesByHeading.has(outerPart)) {
      const target = cache.entriesByHeading.get(outerPart)[0];
      return wrapLink(target.human_key, outerPart);
    }

    // if (cache.entriesByHeading.has(outerPart.toLowerCase())) {
    //   const target = cache.entriesByHeading.get(outerPart.toLowerCase())[0];
    //   return wrapLink(target.human_key, outerPart);
    // }

    // if (cache.entriesByHeadingInLowerCase.has(outerPart.toLowerCase())) {
    //   const target = cache.entriesByHeadingInLowerCase.get(outerPart.toLowerCase())[0];
    //   return wrapLink(target.human_key, outerPart);
    // }

    if (cache.entriesByHeadingInLowerCase.has(outerPart)) {
      const target = cache.entriesByHeadingInLowerCase.get(outerPart)[0];
      return wrapLink(target.human_key, outerPart);
    }
  }

  // let innerParts = outerPart.split(', ');
  // let innerParts = outerPart.split(/(,\s+|\s+\(|\)\s*)/);
  let innerParts = outerPart.split(/(,\s+|\s+\(.+\)\s*|\s+–\s+|\s+—\s+)/);
  debug('outer splitted:', innerParts);
  // ņemam tikai tādus, kur visas sastāvdaļas ir vārdi
  // if (!innerParts.every(ip => QUALIFIED_WORD.test(ip.trim()))) return null;

  let linkifiedAny = false;
  let linkifiedInnerParts = [];
  for (const ip of innerParts) {
    let linkifiedInnerPart = linkifyInnerPart(cache, ip.trim());
    if (linkifiedInnerPart) {
      linkifiedInnerParts.push(linkifiedInnerPart);
      linkifiedAny = true;
    } else {
      // linkifiedInnerParts.push(ip.trim());
      linkifiedInnerParts.push(ip);
    }
  }
  // return linkifiedAny ? linkifiedInnerParts.join(', ') : null;
  return linkifiedAny ? linkifiedInnerParts.join('') : null;
}

const REDIRECTION_1 = /^(.+) → (.+)$/i;

const linkifyRedirection = (cache, part) => {
  debug(';part', part)
  let match = REDIRECTION_1.exec(part);
  if (match) {
    let right = match[2];
    let linkified = linkifyOuterPart(cache, right);
    if (linkified) return `${match[1]} → ${linkified}`;
    return null;
  }
  return linkifyOuterPart(cache, part);
}

const linkifyGloss = (cache, g) => {
  // debug({ g, cache: Object.keys(cache) });
  let gloss = g.trim();
  // if (!gloss || gloss.includes('{')) return g;
  if (gloss.endsWith('.')) {
      gloss = gloss.slice(0, -1);
  }
  gloss = gloss.charAt(0).toLowerCase() + gloss.slice(1);
  let semicolonParts = gloss.split("; ");
  let linkifiedAny = false;
  let linkifiedSemicolonParts = [];
  semicolonParts.forEach(op => {
      let linkifiedSemicolonPart = linkifyRedirection(cache, op.trim());
      if (linkifiedSemicolonPart) {
          linkifiedSemicolonParts.push(linkifiedSemicolonPart);
          linkifiedAny = true;
          debug(`linkified: ${linkifiedSemicolonPart}`);
          // let nsyn = app.locals.dictstats.synonyms || 0;
          // nsyn += 1;
          // app.locals.dictstats.synonyms = nsyn;
          // app.locals.dictstats.synonymsStr = nsyn.toLocaleString();
      } else {
          linkifiedSemicolonParts.push(op.trim());
      }
  });
  return linkifiedAny ? linkifiedSemicolonParts.join('; ') + '.' : null;
}

/**
 * Remove all the gloss link formatting from the gloss so that it is just the plain text.
 *  To be clear: This doesn't convert gloss links to actual links;
 *  it does the opposite: removes them entirely.
 * @param g [string] The unprocessed gloss stored in the db
 */
const unlinkifyGloss = (g) => {
  let gloss = g.trim();

  const replacer = function (match, _, _, _, _, _, groups) {
    return groups.text;
  }
  gloss = gloss.replaceAll(GLOSS_LINK_GLOBAL, replacer);

  return gloss;
}

module.exports = { linkifyGloss, unlinkifyGloss };
