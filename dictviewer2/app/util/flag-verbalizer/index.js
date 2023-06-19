const _ = require('lodash');
const debug = require('debug')('entry:verbalizer');
const c = require('ansi-colors');

const { preparePronunciation } = require('../misc-utils');

// FLAG NAMES
const F_GENDER = 'Dzimte'; // S
const FM_DOMAIN = 'Joma'; // M
const FM_CATEGORY = 'Kategorija'; // M
const FM_CONVERSION = 'Konversija'; // S->M
const FM_INFLECT_LIKE = 'Locīt kā'; // M
const FM_INFLECTION_PROPERTIES = 'Locīšanas īpatnības'; // M
const FM_PREFIX = 'Priedēklis'; // M
const FM_LANGUAGE = 'Valoda'; // M
const F_PATTERN_FOR_MULTIPOINT_INFLECTION = 'šablons salikteņa vairākpunktu locīšanai'; // S
// const FM_ENTRY_PROPERTIES = 'Šķirkļavārda īpatnības'; // M
const FM_LEXEME_PROPERTIES = 'Leksēmas pamatformas īpatnības'; // M
const F_CONJUGATION = 'Konjugācija'; // S
const FM_USAGE = 'Lietojums'; // M
const F_PLACEMENT = 'Novietojums'; // S
const FM_STYLE = 'Stils'; // M
const FM_TRANSITIVITY = 'Transitivitāte'; // M
const FM_DIALECT_FEATURES = 'Dialekta iezīmes'; // M
const FM_OTHER = 'Citi'; // M
const FM_NOTES = 'Piezīmes'; // M
const F_VOICE = 'Kārta'; // S
const FM_CASE = 'Locījums'; // M
const F_TENSE = 'Laiks'; // S
const F_DEGREE = 'Pakāpe'; // S
const F_PERSON = 'Persona'; // S
const FM_MOOD = 'Izteiksme'; // M
const F_NUMBER = 'Skaitlis'; // S
const F_DEFINITENESS = 'Noteiktība'; // S
const F_PREFIX_PRESENCE = 'Priedēkļa piemitība'; // S
const F_NOUN_TYPE = 'Lietvārda tips'; // S
const F_CONJUNCTION_TYPE = 'Saikļa tips'; // S
const F_NUMERAL_TYPE = 'Skaitļa vārda tips'; // S
const F_PRONOUN_TYPE = 'Vietniekvārda tips'; // S
const F_PROPER_NOUN_TYPE = 'Īpašvārda veids'; // S // TODO: veids -> tips
const FM_CATEGORY_FOR_WORD_PART = 'Kategorija (vārda daļai)'; // M
const F_CAPITALIZATION = 'Lielo/mazo burtu lietojums'; // S
const FM_PARSING_PROBLEMS = 'Gramatiku analīzes problēmas'; // M
const FM_PHRASE_SEMANTICAL_DESCRIPTION = 'Semantisks frāzes raksturojums'; // M
const FM_SYNTACTIC_CONSTRAINT = 'Sintaktisks ierobežojums'; // M
const FM_SENTENCE_COMMUNICATIVE_TYPE = 'Teikuma komunikatīvais tips'; // M
const F_POS = 'Vārdšķira'; // S
const F_NEGATION = 'Noliegums'; // S
const F_ABBREVIATION_TYPE = 'Saīsinājuma tips'; // S
const F_PARTICIPLE_TYPE = 'Divdabja veids';
const F_XX = 'Pamatforma morforīkiem';
const FM_NUMBER_PROPERTIES = 'Skaitļa īpatnības';
const F_CONJUNCTION_SYNTACTICAL_FUNCTION = 'Saikļa sintaktiskā funkcija';
const F_CONJUNCTION_SEMANTICAL_TYPE = 'Saikļa semantiskais tips';
const FM_COMPOUND_CONJUCTION_PART = 'Salikta saikļa daļa';
const F_PRONOUN_SYNTACTICAL_USAGE = 'Vietniekvārda sintaktiskais lietojums';
const F_RESIDUAL_TYPE = 'Reziduāļa tips';
const F_DECLENSION = 'Deklinācija'; // ??

// const F_USAGE_PROPERTIES = 'Lietošanas īpatnības';
// const F_VERB_TYPE = 'Darbības vārda tips';

const FM_PRONUNCIATIONS = 'Pronunciations';
const F_REFLEXIVE = 'Atgriezeniskums';
const F_MWE_TYPE = 'Vārdu savienojuma tips';

const F_DIMINUTIVE = 'Deminutīvs';
const F_HYPOTHESIS = 'Hipotēze';
const FM_SUBDIALECT = 'Izloksne';
const F_SUBDIALECT_GROUP = 'Izlokšņu grupa';
const FM_MORPHOTABLE_PROPERTIES = 'Morfotabulas attēlošana';
const F_INFLEXIBLE_WORD = 'Nelokāms vārds';
const F_COMPLETENESS = 'Pabeigtība';
const F_SCRIPT = 'Rakstība';
const F_LANGUAGE_NORMS = 'Valodas normēšana';
const FM_VERB_TYPE = 'Darbības vārda tips';
const F_TRANSLITERATION = 'Transliterācija';

const VF_USAGE_UNDESIRABLE = 'Nevēlams';

const VF_PARADIGM = 'Paradigma';

// FLAG VALUES - POS
const VERB = 'Darbības vārds';
const ADJECTIVE = 'Īpašības vārds';
const NUMERAL = 'Skaitļa vārds';
const NOUN = 'Lietvārds';
const PRONOUN = 'Vietniekvārds';
const ADVERB = 'Apstākļa vārds';
const PREPOSITION = 'Prievārds';
const CONJUNCTION = 'Saiklis';
const INTERJECTION = 'Izsauksmes vārds';
const ABBREVIATION = 'Saīsinājums';
const PARTICLE = 'Partikula';
const RESIDUAL = 'Reziduālis';

// OTHER FLAG VALUES
const V2 = 'Kopdzimtes';
const V2b = 'Kopdzimte';
const V3 = 'Nekārtns';
const V4_UNDESIRABLE = 'Nevēlams';

const UNK = 'unk';

// paradigmu verbalizācijas šabloni
const PARADIGM_VERBALIZATION_PATTERNS = {
  'abbr': '$F_POS$',
  'adj-1': '$F_POS$',
  'adj-2': '$F_POS$',
  'adjdef-f1': f => f[F_POS] === ADJECTIVE ? '$F_POS$ ar noteikto galotni $F_GENDER$ dzimtē' : f[F_POS] === VERB ? 'divdabis ar noteikto galotni $F_GENDER$ dzimtē' : UNK,
  'adjdef-f2': 'divdabis ar noteikto galotni $F_GENDER$ dzimtē',
  'adjdef-m': f => f[F_POS] === ADJECTIVE ? '$F_POS$ ar noteikto galotni $F_GENDER$ dzimtē' : f[F_POS] === VERB ? 'divdabis ar noteikto galotni $F_GENDER$ dzimtē' : UNK,
  'adj-infl': 'nelokāms $F_POS$',
  'adverb': '$F_POS$',
  'adverb-2': '$F_POS$',
  'card-1': '$F_NUMERAL_TYPE$ $F_POS$',
  'card-2': f => f[F_POS] === NUMERAL ? '$F_NUMERAL_TYPE$ $F_POS$' : f[F_POS] === ADJECTIVE ? '$F_POS$ daudzskaitlī' : UNK,
  'card-infl': f => f[F_NUMERAL_TYPE] === 'Daļskaitlis' ? 'nelokāms $F_NUMERAL_TYPE$' : 'nelokāms $F_NUMERAL_TYPE$ $F_POS$',
  'conj': '$F_POS$',
  'excl': '$F_POS$',
  'foreign': '$F_RESIDUAL_TYPE$',
  'hardcoded': (f, l) => l !== 'trīs' && f[F_POS] === NUMERAL ? 'nelokāms $F_NUMERAL_TYPE$ $F_POS$' : l === 'trīs' ? '$F_NUMERAL_TYPE$ $F_POS$' : '$F_POS$',
  'noun-0': 'nelokāms $F_POS$',
  'noun-1a': f => f[F_POS] === PRONOUN ? '$F_PRONOUN_TYPE$ $F_POS$': '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-1b': f => f[F_POS] === PRONOUN ? '$F_PRONOUN_TYPE$ $F_POS$': '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-2a':  '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-2b': '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-2c':  '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-2d':  '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-3f': '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-3m':  '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-4f':  f => f[F_POS] === PRONOUN ? '$F_PRONOUN_TYPE$ $F_POS$': (f[FM_INFLECTION_PROPERTIES] && f[FM_INFLECTION_PROPERTIES].includes(V2b)) ? 'kopdzimtes $F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$' : '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-4m':  f => (f[FM_INFLECTION_PROPERTIES] && f[FM_INFLECTION_PROPERTIES].includes(V2b)) ? 'kopdzimtes $F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$' : '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-5fa':  f => (f[FM_INFLECTION_PROPERTIES] && f[FM_INFLECTION_PROPERTIES].includes(V2b)) ? 'kopdzimtes $F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$' : '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-5fb': f => (f[FM_INFLECTION_PROPERTIES] && f[FM_INFLECTION_PROPERTIES].includes(V2b)) ? 'kopdzimtes $F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$' : '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-5ma': f => (f[FM_INFLECTION_PROPERTIES] && f[FM_INFLECTION_PROPERTIES].includes(V2b)) ? 'kopdzimtes $F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$' : '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-5mb': f => (f[FM_INFLECTION_PROPERTIES] && f[FM_INFLECTION_PROPERTIES].includes(V2b)) ? 'kopdzimtes $F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$' : '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-6a': '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-6b': '$F_GENDER$ dzimtes $F_DECLENSION$. deklinācijas $F_POS$',
  'noun-g': 'nelokāms $F_POS$, ģenitīvenis',
  'noun-r1': 'atgriezenisks $F_POS$',
  'noun-r2': '$F_GENDER$ dzimtes atgriezeniskais $F_POS$',
  'noun-r3': '$F_GENDER$ dzimtes atgriezeniskais $F_POS$',
  'number': 'skaitlis',
  'ord': '$F_NUMERAL_TYPE$ $F_POS$',
  // 42: f => f[FM_CONVERSION] ? 'divdabis gen($FM_CONVERSION$) nozīmē' : 'divdabis',
  'part-1': f => f[FM_CONVERSION] ? gnfv(f, FM_CONVERSION).map(x => `divdabis gen(${x}) nozīmē`).join(', ') : 'divdabis',
  // 42: f => f[FM_CONVERSION] ? _.map(gnfv(f, FM_CONVERSION), x => `divdabis gen(${x}) nozīmē`).join(', ') : 'divdabis',
  // 43: f => f[FM_CONVERSION] ? 'divdabis gen($FM_CONVERSION$) nozīmē' : 'divdabis',
  'part-2': f => f[FM_CONVERSION] ? gnfv(f, FM_CONVERSION).map(x => `divdabis gen(${x}) nozīmē`).join(', ') : 'divdabis',
  // 43: f => f[FM_CONVERSION] ? _.map(gnfv(f, FM_CONVERSION), x => `divdabis gen(${x}) nozīmē`).join(', ') : 'divdabis',
  'part-3': f => (f[FM_CONVERSION] ? `daļēji lokāms divdabis ${get_genitive(f[FM_CONVERSION])} nozīmē` : 'daļēji lokāms divdabis'),
  'part-4': f => (f[FM_CONVERSION] ? `daļēji lokāms divdabis ${get_genitive(f[FM_CONVERSION])} nozīmē` : 'daļēji lokāms divdabis'),
  'particle': '$F_POS$',
  'prep': '$F_POS$',
  'pron': '$F_PRONOUN_TYPE$ $F_POS$',
  'punct': '$F_POS$',
  'verb-1': f => f[F_CONJUGATION] === V3 ? 'nekārtns $F_POS$' : '$F_CONJUGATION$. konjugācijas $F_POS$',
  'verb-1i': '$F_CONJUGATION$ $F_POS$',
  'verb-1r': f => f[F_CONJUGATION] === V3 ? 'atgriezenisks $F_CONJUGATION$ $F_POS$' : 'atgriezenisks $F_CONJUGATION$. konjugācijas $F_POS$',
  'verb-2': '$F_CONJUGATION$. konjugācijas $F_POS$',
  'verb-2r': 'atgriezenisks $F_CONJUGATION$. konjugācijas $F_POS$',
  'verb-3a': '$F_CONJUGATION$. konjugācijas $F_POS$',
  'verb-3ar': 'atgriezenisks $F_CONJUGATION$. konjugācijas $F_POS$',
  'verb-3b': '$F_CONJUGATION$. konjugācijas $F_POS$',
  'verb-3rb': 'atgriezenisks $F_CONJUGATION$. konjugācijas $F_POS$',
}

// karogi, kurus neverbalizēt šai paradigmai
const PD_SKIP_FLAGS = {
  'abbr': [ F_POS ],
  'adj-1': [ F_POS ],
  'adj-2': [ F_POS ],
  'adjdef-f1': [ F_POS, F_GENDER ],
  'adjdef-f2': [ F_POS, F_GENDER ],
  'adjdef-m': [ F_POS, F_GENDER ],
  'adj-infl': [ F_POS ],
  'adverb': [ F_POS ],
  'adverb-2': [ F_POS ],
  'card-1': [ F_POS, F_NUMERAL_TYPE ],
  'card-2': [ F_POS, F_NUMERAL_TYPE ],
  'card-infl': [ F_POS, F_NUMERAL_TYPE ],
  'conj': [ F_POS ],
  'excl': [ F_POS ],
  'foreign': [ F_POS, F_RESIDUAL_TYPE ],
  'hardcoded': [ F_POS, F_NUMERAL_TYPE ],
  'noun-0': [ F_POS ],
  'noun-1a':  [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-1b':  [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-2a':  [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-2b': [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-2c':  [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-2d':  [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-3f': [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-3m':  [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-4f':  [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-4m':  [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-5fa':  [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-5fb': [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-5ma': [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-5mb': [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-6a': [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-6b': [ F_POS, F_GENDER, F_DECLENSION ],
  'noun-g': [ F_POS ],
  'noun-r1': [ F_POS ],
  'noun-r2': [ F_POS, F_GENDER ],
  'noun-r3': [ F_POS, F_GENDER ],
  'number': [ F_POS, F_RESIDUAL_TYPE ],
  'ord': [ F_POS, F_NUMERAL_TYPE ],
  'part-1': [ F_POS, FM_CONVERSION ],
  'part-2': [ F_POS, FM_CONVERSION ],
  'part-3': [ F_POS, F_DEGREE ],
  'part-4': [ F_POS, F_DEGREE ],
  'particle': [ F_POS ],
  'prep': [ F_POS ],
  'pron': [ F_POS, F_PRONOUN_TYPE ],
  'punct': [ F_POS ],
  'verb-1': [ F_REFLEXIVE, F_POS, F_CONJUGATION ],
  'verb-1i': [ F_REFLEXIVE, F_POS, F_CONJUGATION ],
  'verb-1r': [ F_REFLEXIVE, F_POS, F_CONJUGATION ],
  'verb-2': [ F_REFLEXIVE, F_POS, F_CONJUGATION ],
  'verb-2r': [ F_REFLEXIVE, F_POS, F_CONJUGATION ],
  'verb-3a': [ F_REFLEXIVE, F_POS, F_CONJUGATION ],
  'verb-3ar': [ F_REFLEXIVE, F_POS, F_CONJUGATION ],
  'verb-3b': [ F_REFLEXIVE, F_POS, F_CONJUGATION ],
  'verb-3br': [ F_REFLEXIVE, F_POS, F_CONJUGATION ],
};

// atsevišķas karogu vērtības, kuras neverbalizēt šai paradigmai
const PD_SKIP_FLAG_VALUES = {};

const addSkipFlagValues = (pd, f, value_list) => {
  if (!PD_SKIP_FLAG_VALUES[pd]) {
    PD_SKIP_FLAG_VALUES[pd] = {};
  }
  PD_SKIP_FLAG_VALUES[pd][f] = value_list;
}

addSkipFlagValues('noun-4f', FM_INFLECTION_PROPERTIES, [V2b]);
addSkipFlagValues('noun-4m', FM_INFLECTION_PROPERTIES, [V2b]);
addSkipFlagValues('noun-5fa', FM_INFLECTION_PROPERTIES, [V2b]);
addSkipFlagValues('noun-5fb', FM_INFLECTION_PROPERTIES, [V2b]);
addSkipFlagValues('noun-5ma', FM_INFLECTION_PROPERTIES, [V2b]);
addSkipFlagValues('noun-5mb', FM_INFLECTION_PROPERTIES, [V2b]);

// Noklusētās īpašības (karogi), mantotas no paradigmas
let DEFAULT_VALUES_FOR_PARADIGM = {};
let FQ_VALUES = {};

const GENITIVES = {
  'apstākļa vārds': 'apstākļa vārda',
  'darbības vārds': 'darbības vārda',
  'īpašības vārds': 'īpašības vārda',
  'īpašvārds': 'īpašvārda',
  'izsauksmes vārds': 'izsauksmes vārda',
  'lietvārds': 'lietvārda',
  'nenoteiktais vietniekvārds': 'nenoteiktā vietniekvārda',
  'palīgdarbības vārds': 'palīgdarbības vārda',
  'pamata skaitļa vārds': 'pamata skaitļa vārda',
  'partikula': 'partikulas',
  'prievārds': 'prievārda',
  'saiklis': 'saikļa',
  'saitiņa': 'saitiņas',
  'skaitļa vārds': 'skaitļa vārda',
  'vietas apstākļa vārds': 'vietas apstākļa vārda',
  'vietniekvārds': 'vietniekvārda',
};

const SUBDIALECT_GROUP_GENITIVES = {
  'kurzemes lībiskās' : 'kurzemes lībisko',
  'sēliskās' : 'sēlisko',
  'latgaliskās' : 'latgalisko',
  'kursiskās' : 'kursisko',
  'zemgaliskās' : 'zemgalisko',
  'vidzemes vidus' : 'vidzemes vidus',
  'vidzemes lībiskās' : 'vidzemes lībisko',
};

const get_genitive = s => {
  if (s && GENITIVES[s.toLowerCase()]) return GENITIVES[s.toLowerCase()];
  if (s && SUBDIALECT_GROUP_GENITIVES[s.toLowerCase()]) return SUBDIALECT_GROUP_GENITIVES[s.toLowerCase()];
  return s;
};

function gnfv(ff, flag) {
  if (!ff || !flag) return;
  let v = ff[flag];
  if (!v) return;
  return Array.isArray(v) ? v : [ v ];
};

const join_disjunction = vv => {
  if (!Array.isArray(vv)) return vv;
  if (vv.length === 0) return null;
  if (vv.length === 1) return vv[0];
  return `${vv[0]} vai ${vv.slice(1).join(', vai ')}`;
}
//#region karogu verbalizatori

const DEFAULT_VERBALIZER = fv => (Array.isArray(fv) ? fv.join(', ') : fv);
const DEFAULT_NAME_VALUES_VERBALIZER = (fv, fn) => `${fn}: ${Array.isArray(fv) ? fv.join(', ') : fv}`;
const DEFAULT_VALUES_NAME_VERBALIZER = (fv, fn) => `${Array.isArray(fv) ? fv.join(', ') : fv} ${fn}`;

let VERBALIZERS = {};

// verbalizatoru signatūra: (this_flag_value, flag_name, all_flags, entity_type, paradigm_hk) -> string

VERBALIZERS[F_GENDER] = fv => {
  return `${fv} dzimte`;
};

VERBALIZERS[FM_DOMAIN] = fv => {
  if (!fv || fv.length === 0) return null;
  if (typeof fv === 'string') return `joma: ${fv}`;
  if (fv.length === 1) return `joma: ${fv[0]}`;
  return `jomas: ${fv.join(', ')}`;
};

VERBALIZERS[FM_CATEGORY] = DEFAULT_VERBALIZER;

VERBALIZERS[FM_CONVERSION] = (fv, fn, af, entity_type) => {
  let r = [];
  for (let x of gnfv(af, FM_CONVERSION)) {
    let prefix = (entity_type === 'sr' && !af[F_POS]) ? 'vārds ' : '';
    let v = x.toLowerCase();
    r.push(`${prefix}${get_genitive(v)} nozīmē`);
  }
  if (r.length > 0) return r.join(', ');
  return null;
};

VERBALIZERS[FM_INFLECTION_PROPERTIES] = fv => {
  let r = [];
  for (let x of fv) {
    let v = x.toLowerCase();
    switch (v) {
      case 'kopdzimte':
      case 'sastingusi forma':
        r.push(v);
        break;
      case 'vairākos punktos lokāms saliktenis':
        r.push('loka salikteņa abas daļas');
        break;
      default:
        break;
    }
  }
  if (r.length > 0) return r.join(', ');
  return null;
};

VERBALIZERS[FM_PREFIX] = fv => {
  let r = [];
  for (let x of fv) {
    r.push(`${FM_PREFIX} "${x}-"`)
  }
  if (r.length > 0) return r.join(', ');
  return null;
}

VERBALIZERS[FM_LANGUAGE] = DEFAULT_VERBALIZER;

VERBALIZERS[F_CONJUGATION] = fv => {
  const v = fv.toLowerCase();
  switch (v) {
    case 'nekārtns':
      return 'nekārtns darbības vārds';
    default:
      return null;
  }
};

VERBALIZERS[FM_USAGE] = (fv, fn, af, entity_type) => {
  if (entity_type === 'sense' && Array.isArray(fv)) {
    let fv2 = fv.filter(x => x !== V4_UNDESIRABLE);
    if (fv2.length > 0) return fv2.join(', ');
  }
  return DEFAULT_VERBALIZER(fv);
};

VERBALIZERS[VF_USAGE_UNDESIRABLE] = (fv, fn, af, entity_type) => {
  if (entity_type === 'sense' && Array.isArray(fv) && fv.includes(V4_UNDESIRABLE)) {
    return V4_UNDESIRABLE;
  }
  return null;
}

VERBALIZERS[F_PLACEMENT] = fv => {
  const v = fv.toLowerCase();
  // switch (v) {
  //   case 'postpozitīvs':
  //     return `${v} ${F_PLACEMENT}`;
  //   default:
  //     return null;
  // }
  return `${v} ${F_PLACEMENT}`;
};

VERBALIZERS[FM_STYLE] = DEFAULT_VERBALIZER;

VERBALIZERS[FM_TRANSITIVITY] = fv => {
  let r = [];
  for (let x of fv) {
    let v = x.toLowerCase();
    switch (v) {
      case 'intransitīvs':
      case 'transitīvs':
        r.push(v);
        break;
      default:
        break;
    }
  }
  return r.join(', ');
};

VERBALIZERS[FM_DIALECT_FEATURES] = fv => {
  if (typeof fv === 'string') {
    return `${DEFAULT_VERBALIZER(fv)} ${FM_DIALECT_FEATURES}`;
  }
  return fv.map(x => `${DEFAULT_VERBALIZER(x)} ${FM_DIALECT_FEATURES}`).join(', ');
};

VERBALIZERS[FM_OTHER] = (fv, fn, af, entity_type) => {
  const r = [];
  for (let x of fv) {
    let v = x.toLowerCase();
    switch (v) {
      // case 'daudzskaitļa formas lieto vienskaitļa formu nozīmē':
      // case 'daudzskaitļa formas parasti lieto vienskaitļa formu nozīmē':
      case 'deminutīvs':
      case 'imperfektīva forma':
      case 'lokāms vārds':
      case 'nelokāms vārds':
      // case 'vienskaitļa formas lieto daudzskaitļa formu nozīmē':
      // case 'vienskaitļa formas lieto dialektos':
      // case 'vienskaitļa formas lieto sarunvalodā':
        r.push(v);
        break;
      case 'hipotēze':
        if (entity_type === 'sense') r.push('hipotētiska nozīme');
        break;
      // case 'noliegums':
      //   r.push('noliegumā');
      //   break;
      case 'refleksīvs':
        r.push('atgriezenisks');
        break;

      case 'svešvārds':
        r.push(x);
        break;

      default:
        break;
    }

  }
  return r.join(', ');
};

VERBALIZERS[F_VOICE] = fv => {
  const v = fv.toLowerCase();
  switch (v) {
    case 'ciešamā':
      return `${v} ${F_VOICE}`;
    default:
      return null;
  }
};

VERBALIZERS[FM_CASE] = DEFAULT_VERBALIZER;

VERBALIZERS[F_TENSE] = DEFAULT_VERBALIZER;

VERBALIZERS[F_DEGREE] = fv => {
  return `${fv} ${F_DEGREE}`;
};

VERBALIZERS[F_PERSON] = fv => {
  const v = fv.toLowerCase();
  return `${v} ${F_PERSON}`;
};

VERBALIZERS[FM_MOOD] = fv => {
  let r = [];
  let has_specific_participle = false;
  let has_participle = false;
  for (let x of fv) {
    let v = x.toLowerCase();
    switch (v) {
      case 'atstāstījuma':
      case 'īstenības':
      case 'pavēles':
      case 'vajadzības':
      case 'vēlējuma':
        r.push(`${v} ${FM_MOOD}`);
        break;
      case 'daļēji lokāmais divdabis (-dams, -dama, -damies, -damās)':
      case 'lokāmais ciešamās kārtas pagātnes divdabis (-ts, -ta)':
      case 'lokāmais ciešamās kārtas tagadnes divdabis (-ams, -ama, -āms, -āma)':
      case 'lokāmais darāmās kārtas pagātnes divdabis (-is, -usi, -ies, -usies)':
      case 'lokāmais darāmās kārtas tagadnes divdabis (-ošs, -oša)':
      case 'nelokāmais divdabis (-ot, -oties)':
        has_specific_participle = true;
        r.push(v);
        break;
      case 'divdabis':
        has_participle = true;
        break;
      case 'nenoteiksme':
        r.push(v);
        break;
      default:
        break;
    }
  }
  if (!has_specific_participle && has_participle) r.push('divdabis');

  return r.join(', ');
};

VERBALIZERS[F_NUMBER] = DEFAULT_VERBALIZER;

VERBALIZERS[F_DEFINITENESS] = fv => {
  return `${fv} galotne`;
};

VERBALIZERS[F_PREFIX_PRESENCE] = DEFAULT_VERBALIZER;

VERBALIZERS[F_NOUN_TYPE] = DEFAULT_VERBALIZER;

VERBALIZERS[F_CONJUNCTION_TYPE] = fv => {
  const v = fv.toLowerCase();
  switch (v) {
    case 'pakārtojuma':
    case 'paskaidrojuma':
    case 'pieļāvuma':
    case 'pretstatījuma':
    case 'šķīruma':
    case 'vienojuma':
      return `${v} ${F_CONJUNCTION_TYPE}`;
    case 'pakārtojuma saikļa sastāvdaļa':
    case 'pāru saikļa sastāvdaļa':
    case 'pieļāvuma saikļa sastāvdaļa':
    case 'pretstatījuma pāru saikļa sastāvdaļa':
    case 'pretstatījuma saikļa sastāvdaļa':
    case 'vienojuma pāru saikļa sastāvdaļa':
    case 'vienojuma saikļa sastāvdaļa':
      return v;
    default:
      return null;
  }
};

VERBALIZERS[F_NUMERAL_TYPE] = (fv, fn, af) => {
  let t1 = af[F_POS] && af[F_POS].toLowerCase();
  if (t1 !== 'skaitļa vārds') return null;
  let t2 = _.map(gnfv(af, FM_CATEGORY), x => x.toLowerCase());
  if (!t2.includes('skaitļa vārds')) return null;

  const v = fv.toLowerCase();
  switch (v) {
    case 'daļskaitlis':
      return v;
    case 'kārtas':
    case 'pamata':
      return `${v} skaitļa vārds`;
    default:
      return null;
  }
};

VERBALIZERS[F_PRONOUN_TYPE] = fv => {
  return `${fv} vietniekvārds`;
};

VERBALIZERS[F_PROPER_NOUN_TYPE] = DEFAULT_VERBALIZER;

VERBALIZERS[FM_CATEGORY_FOR_WORD_PART] = DEFAULT_VERBALIZER;

VERBALIZERS[F_CAPITALIZATION] = DEFAULT_VERBALIZER;

VERBALIZERS[FM_PHRASE_SEMANTICAL_DESCRIPTION] = DEFAULT_VERBALIZER;

VERBALIZERS[FM_SYNTACTIC_CONSTRAINT] = DEFAULT_VERBALIZER;

VERBALIZERS[FM_SENTENCE_COMMUNICATIVE_TYPE] = DEFAULT_VERBALIZER;

VERBALIZERS[F_POS] = (fv, fn, af, entity_type, paradigm_hk) => {
  if (entity_type === 'sr') {
    if (af[FM_CATEGORY]) return null;
    if (af[F_PRONOUN_TYPE]) return null;
    if (af[F_NEGATION] === 'Jā') return `${fv} noliegumā`;
  } else {
    if (af[F_PRONOUN_TYPE]) return null;
    return fv;
  }
};

VERBALIZERS[F_NEGATION] = (fv, fn, af, entity_type, paradigm_hk) => {
  if (entity_type === 'sr') {
    if (af[FM_CATEGORY] || af[F_PRONOUN_TYPE] || !af[F_POS]) return F_NEGATION;
  } else {
    if (paradigm_hk && PARADIGM_VERBALIZATION_PATTERNS[paradigm_hk] && PARADIGM_VERBALIZATION_PATTERNS[paradigm_hk].includes('$F_POS$')) {
      // šo verbalizēs paradigma
    } else {
      return F_NEGATION;
    }
  }
  return null;
};

VERBALIZERS[F_PARTICIPLE_TYPE] = DEFAULT_VERBALIZER;

VERBALIZERS[FM_NUMBER_PROPERTIES] = DEFAULT_VERBALIZER;

VERBALIZERS[F_CONJUNCTION_SYNTACTICAL_FUNCTION] = (fv, fn, af, entity_type, paradigm_hk) => {
  if (!paradigm_hk && !af[F_POS] && !af[F_CONJUNCTION_SEMANTICAL_TYPE]) return `${fv} saiklis`;
  return fv;
}

VERBALIZERS[F_CONJUNCTION_SEMANTICAL_TYPE] = (fv, fn, af, entity_type, paradigm_hk) => {
  if (!paradigm_hk && !af[F_POS]) return `${fv} saiklis`;
  return fv;
}

VERBALIZERS[FM_COMPOUND_CONJUCTION_PART] = DEFAULT_VERBALIZER;

VERBALIZERS[F_PRONOUN_SYNTACTICAL_USAGE] = fv => fv === 'Adjektīvisks' ? 'aizstāj īpašības vārdu' : 'aizstāj lietvārdu';

VERBALIZERS[F_RESIDUAL_TYPE] = DEFAULT_VERBALIZER;

VERBALIZERS[FM_PRONUNCIATIONS] = () => null; // TODO:

VERBALIZERS[F_REFLEXIVE] = fv => {
  const v = fv.toLowerCase();
  switch (v) {
    case 'jā':
      return 'atgriezenisks';
    case 'nē':
      return 'tiešs';
    default:
      return null;
  }
};

VERBALIZERS[F_MWE_TYPE] = DEFAULT_VERBALIZER;

VERBALIZERS[F_SCRIPT] = DEFAULT_VERBALIZER;

VERBALIZERS[FM_SUBDIALECT] = DEFAULT_VALUES_NAME_VERBALIZER;

VERBALIZERS[F_SUBDIALECT_GROUP] = (fv, fn) => `${Array.isArray(fv) ? fv.map(x => get_genitive(x)).join(', ') : get_genitive(fv)} ${fn}`;

VERBALIZERS[F_COMPLETENESS] = fv => {
  const v = fv.toLowerCase();
  switch (v) {
    case 'jā':
      return 'pabeigtas darbības nozīme';
    case 'nē':
      return 'nepabeigtas darbības nozīme';
    default:
      return null;
  }
}

VERBALIZERS[F_DIMINUTIVE] = fv => {
  const v = fv.toLowerCase();
  switch (v) {
    case 'jā':
      return F_DIMINUTIVE;
    default:
      return null;
  }
}

VERBALIZERS[F_HYPOTHESIS] = (fv, fn, af, entity_type) => {
  const v = fv.toLowerCase();
  switch (v) {
    case 'jā':
      if (entity_type === 'sense') {
        return 'hipotētiska nozīme';
      } else if (entity_type === 'lexeme') {
        return 'hipotētisks vārds';
      }
    default:
      return null;
  }
}

VERBALIZERS[F_INFLEXIBLE_WORD] = (fv, fn, af, entity_type) => {
  const v = fv.toLowerCase();
  switch (v) {
    case 'nē':
      return entity_type === 'sr' ? 'lokāms vārds' : 'lokāms';
    case 'jā':
      return entity_type === 'sr' ? 'nelokāms vārds' : 'nelokāms';
    default:
      return null;
  }
}

VERBALIZERS[FM_PRONUNCIATIONS] = fv => `[${Array.isArray(fv) ? fv.map(x => preparePronunciation(x)).join('], [') : preparePronunciation(fv)}]`;

VERBALIZERS[F_LANGUAGE_NORMS] = DEFAULT_VERBALIZER;

VERBALIZERS[FM_VERB_TYPE] = fv => `sintaktiskā funkcija: ${join_disjunction(fv)}`;

VERBALIZERS[F_TRANSLITERATION] = (fv) => {
  const v = fv.toLowerCase();
  return v === 'jā' ? 'transliterēts' : null;
}
//#endregion

//#region ieslēgto karogu saraksti
const flagPriority = flag => {
  switch (flag) {
    case VF_USAGE_UNDESIRABLE:
      return 100;
    case F_PRONOUN_TYPE:
      return 50;
    case F_CONJUNCTION_SYNTACTICAL_FUNCTION:
      return 45;
    case F_CONJUNCTION_SEMANTICAL_TYPE:
      return 40;
    case FM_PRONUNCIATIONS:
      return 35;
    case VF_PARADIGM:
      return 30;
    case F_POS:
      return 25;
    case FM_CONVERSION:
      return 20;
    case FM_DOMAIN:
      return -10;
    default:
      return 0;
  }
}

const flagOrderComparer = (a, b) => flagPriority(a) - flagPriority(b);

const ENABLED_FLAG_VERBALIZERS = [
  VF_USAGE_UNDESIRABLE,
  F_GENDER,
  // FM_DOMAIN, // jomu pagaidām apstrādā īpaši
  FM_CATEGORY,
  FM_CONVERSION,
  // FM_INFLECT_LIKE,
  FM_INFLECTION_PROPERTIES,
  // FM_PREFIX,
  FM_LANGUAGE,
  // F_PATTERN_FOR_MULTIPOINT_INFLECTION,
  // FM_LEXEME_PROPERTIES,
  F_CONJUGATION,
  FM_USAGE,
  F_PLACEMENT,
  FM_STYLE,
  FM_TRANSITIVITY,
  FM_DIALECT_FEATURES,
  FM_OTHER,
  // FM_NOTES,
  // F_VOICE,
  // FM_CASE,
  // F_TENSE,
  F_DEGREE,
  // F_PERSON,
  // FM_MOOD,
  F_NUMBER,
  // F_DEFINITENESS,
  // F_PREFIX_PRESENCE,
  F_NOUN_TYPE,
  F_CONJUNCTION_TYPE,
  F_NUMERAL_TYPE,
  F_PRONOUN_TYPE,
  F_PROPER_NOUN_TYPE,
  FM_CATEGORY_FOR_WORD_PART,
  // F_CAPITALIZATION,
  // FM_PARSING_PROBLEMS,
  // FM_PHRASE_SEMANTICAL_DESCRIPTION,
  // FM_SYNTACTIC_CONSTRAINT,
  // FM_SENTENCE_COMMUNICATIVE_TYPE,
  F_POS,
  // F_NEGATION,
  // F_ABBREVIATION_TYPE,
  F_PARTICIPLE_TYPE,
  // F_XX,
  FM_NUMBER_PROPERTIES,
  F_CONJUNCTION_SYNTACTICAL_FUNCTION,
  F_CONJUNCTION_SEMANTICAL_TYPE,
  FM_COMPOUND_CONJUCTION_PART,
  F_PRONOUN_SYNTACTICAL_USAGE,
  F_RESIDUAL_TYPE,
  // F_DECLENSION, // ??
  // FM_PRONUNCIATIONS,
  F_REFLEXIVE,
  F_MWE_TYPE,
  // FM_MORPHOTABLE_PROPERTIES,
  F_DIMINUTIVE,
  F_INFLEXIBLE_WORD,
  F_HYPOTHESIS,
  F_COMPLETENESS,
  F_SUBDIALECT_GROUP,
  FM_SUBDIALECT,
  F_SCRIPT,
  F_LANGUAGE_NORMS,
  FM_VERB_TYPE,
].sort(flagOrderComparer);

const ENABLED_SR_VERBALIZERS = [
  // VF_USAGE_UNDESIRABLE,
  F_GENDER,
  // FM_DOMAIN,
  FM_CATEGORY,
  FM_CONVERSION,
  // FM_INFLECT_LIKE,
  // FM_INFLECTION_PROPERTIES,
  FM_PREFIX,
  // FM_LANGUAGE,
  // F_PATTERN_FOR_MULTIPOINT_INFLECTION,
  // FM_LEXEME_PROPERTIES,
  // F_CONJUGATION,
  // FM_USAGE,
  F_PLACEMENT,
  // FM_STYLE,
  // FM_TRANSITIVITY,
  // FM_DIALECT_FEATURES,
  FM_OTHER,
  // FM_NOTES,
  F_VOICE,
  FM_CASE,
  F_TENSE,
  F_DEGREE,
  F_PERSON,
  FM_MOOD,
  F_NUMBER,
  F_DEFINITENESS,
  F_PREFIX_PRESENCE,
  F_NOUN_TYPE,
  // F_CONJUNCTION_TYPE,
  F_NUMERAL_TYPE,
  F_PRONOUN_TYPE,
  F_PROPER_NOUN_TYPE,
  // FM_CATEGORY_FOR_WORD_PART,
  F_CAPITALIZATION,
  // FM_PARSING_PROBLEMS,
  FM_PHRASE_SEMANTICAL_DESCRIPTION,
  FM_SYNTACTIC_CONSTRAINT,
  FM_SENTENCE_COMMUNICATIVE_TYPE,
  F_POS,
  F_NEGATION,
  // F_ABBREVIATION_TYPE,
  F_PARTICIPLE_TYPE,
  // F_XX,
  // FM_NUMBER_PROPERTIES,
  // F_CONJUNCTION_SYNTACTICAL_FUNCTION,
  // F_CONJUNCTION_SEMANTICAL_TYPE,
  // FM_COMPOUND_CONJUCTION_PART,
  // F_PRONOUN_SYNTACTICAL_USAGE,
  // F_RESIDUAL_TYPE,
  // F_DECLENSION, // ??
  FM_PRONUNCIATIONS,
  F_REFLEXIVE,
  // F_MWE_TYPE,
  // FM_MORPHOTABLE_PROPERTIES,
  F_DIMINUTIVE,
  F_INFLEXIBLE_WORD,
  // F_HYPOTHESIS,
  F_COMPLETENESS,
  // F_SUBDIALECT_GROUP,
  // FM_SUBDIALECT,
  // F_SCRIPT,
  // F_LANGUAGE_NORMS,
  // FM_VERB_TYPE,
].sort(flagOrderComparer);
//#endregion

// const REGEXP = RegExp('\{$\w+\}', 'g');

const verbalize_lexeme_paradigm = (lemma, flags, paradigm_hk) => {

  let effective_flags = _.assign({}, DEFAULT_VALUES_FOR_PARADIGM[paradigm_hk], flags);
  let pattern = PARADIGM_VERBALIZATION_PATTERNS[paradigm_hk];

  if (typeof pattern === 'function') {
    pattern = pattern(effective_flags, lemma);
  }
  if (typeof pattern === 'string') {
    let pos_value = effective_flags[F_POS] 
      ? (effective_flags[F_NEGATION] === 'Jā'
        ? `${effective_flags[F_POS]} noliegumā` 
        : effective_flags[F_POS]) 
      : '';
    let s = pattern
      .replace(/\$F_POS\$/g, pos_value)
      .replace(/\$F_GENDER\$/g, effective_flags[F_GENDER] || '')
      .replace(/\$F_NUMERAL_TYPE\$/g, effective_flags[F_NUMERAL_TYPE] || '')
      .replace(/\$F_RESIDUAL_TYPE\$/g, effective_flags[F_RESIDUAL_TYPE] || '')
      .replace(/\$F_DECLENSION\$/g, effective_flags[F_DECLENSION] || '')
      // .replace(/\$F_USAGE_PROPERTIES\$/g, effective_flags[F_USAGE_PROPERTIES] || '')
      .replace(/\$FM_CONVERSION\$/g, effective_flags[FM_CONVERSION] || '')
      .replace(/\$F_CONJUGATION\$/g, effective_flags[F_CONJUGATION] || '')
      .replace(/\$F_PRONOUN_TYPE\$/g, effective_flags[F_PRONOUN_TYPE] || '');

    let mgen = s.match(/gen\(([^\)]+)\)/g);
    if (mgen) {
      for (const m of mgen) {
        s = s.replace(m, get_genitive(m.slice(4, m.length - 1).toLowerCase()));
      }
    }

    return s.toLowerCase();
  }

}

const verbalize_restriction_name = r => {
  switch (r.toLowerCase()) {
    case 'formā/atvasinājumā': return 'formā';
    case 'teikumos / noteikta veida struktūrās': return 'konstrukcijā';
    case 'vispārīgais lietojuma biežums': return 'lieto';
    case 'vārddarināšana (sastāvdaļa)': return 'darinot no';
    case 'vārddarināšana (rezultāts)': return 'darinot vārdu';
    default: return r;
  }
}

/**
 * Verbalizē SR.Value par string
 * @param {*} srValue
 * @param {*} entity_type
 */
const verbalize_sr_value = (srValue, entity_type) => {
  if (!srValue) return null;
  let ff = srValue.Flags;
  let fte = Array.from(ENABLED_SR_VERBALIZERS);
  let lvl3 = [];
  if (ff) {
    if (ff[F_PARTICIPLE_TYPE]) {
      if (ff[FM_MOOD] && ff[FM_MOOD].includes('Divdabis')) {
        ff[FM_MOOD] = ff[FM_MOOD].filter(x => x !== 'Divdabis');
        if (ff[FM_MOOD].length === 0) {
          delete ff[FM_MOOD];
        }
      }
      if (ff[F_POS] === 'Darbības vārds') {
        delete ff[F_POS];
      }
    }
    if (ff[F_POS]) {
      let v = VERBALIZERS[F_POS](ff[F_POS], F_POS, ff, 'sr');
      if (v) lvl3.push(v);
      fte = fte.filter(x => x !== F_POS);
    }
    if (ff[FM_CATEGORY]) {
      let v = VERBALIZERS[FM_CATEGORY](ff[FM_CATEGORY], FM_CATEGORY, ff, 'sr');
      if (v) lvl3.push(v);
      fte = fte.filter(x => x !== FM_CATEGORY);
    }
    if (ff[FM_CONVERSION]) {
      let v = VERBALIZERS[FM_CONVERSION](ff[FM_CONVERSION], FM_CONVERSION, ff, 'sr');
      if (v) lvl3.push(v);
      fte = fte.filter(x => x !== FM_CONVERSION);
    }
    if (ff[FM_SYNTACTIC_CONSTRAINT]) {
      let v = VERBALIZERS[FM_SYNTACTIC_CONSTRAINT](ff[FM_SYNTACTIC_CONSTRAINT], FM_SYNTACTIC_CONSTRAINT, ff, 'sr');
      if (v.toLowerCase() === 'vārdu savienojums') {
        lvl3.push(ff[FM_SYNTACTIC_CONSTRAINT]);
        fte = fte.filter(x => x !== FM_SYNTACTIC_CONSTRAINT);
      }
    }

  }
  if (srValue.LanguageMaterial) {
    lvl3.push(`"${srValue.LanguageMaterial}"`);
  }
  let lvl2 = [];
  if (lvl3.length > 0) {
    lvl2.push(lvl3.join(' '));
  }
  if (ff) {
    // let v = verbalize_flags(ff, entity_type, null, fte); // FIXME: novest paradigm_hk līdz šejienei
    let v = verbalize_flags(ff, 'sr', null, fte); // FIXME: novest paradigm_hk līdz šejienei
    if (v) lvl2.push(v);
  }

  if (lvl2.length > 0) return lvl2.join(', ');
  return null;
}

const verbalize_one_sr = (sr, entity_type) => {
  try {
    let lvl1 = [];
    if (sr.Value) {
      if (sr.Frequency) lvl1.push(sr.Frequency);
      if (sr.Restriction) lvl1.push(`${verbalize_restriction_name(sr.Restriction)}:`);

      let valueStr = verbalize_sr_value(sr.Value, entity_type);
      if (valueStr) lvl1.push(valueStr);
    } else {
      if (sr.Restriction) lvl1.push(`${verbalize_restriction_name(sr.Restriction)}:`);
      if (sr.Frequency) lvl1.push(sr.Frequency);
    }
    if (lvl1.length > 0) return lvl1.join(' ');
    return null;

  } catch (err) {
    console.error('Kļūda vienkārša ierobežojuma vebalizācijā', sr, entity_type, err);
    return null;
  }
}

const fq_order = fq => {
  if (!fq) return 6;
  let val = FQ_VALUES[fq.toLowerCase()];
  return val || 6;
}

// ja nu tiešām būs jāsāk ignorēt SR atkarībā no visādiem apkārtnes stāvokļiem
const sr_needs_skipping = (sr, entity_type, paradigm_hk) => {
  if (paradigm_hk === 'noun-g') {
    if (!sr.Frequency && sr.Restriction.toLowerCase() === 'formā/atvasinājumā' && sr.Value && sr.Value.Flags && sr.Value.Flags[FM_CASE] && sr.Value.Flags[FM_CASE].map(x => x.toLowerCase()).includes('ģenitīvs')) return true;
  }
  return false;
}

const is_short_form_possible = srArr => {
  if (!Array.isArray(srArr)) return false;
  if (srArr.length < 2) return false;
  let fq0 = srArr[0].Frequency;
  let rstr0 = srArr[0].Restriction;
  for (let sr of srArr) {
    if (sr.AND || sr.OR || sr.NOT) return false;
    if (sr.Frequency !== fq0) return false;
    if (sr.Restriction !== rstr0) return false;
  }
  return true;
}

const build_short_form = (srs, entity_type, joiner) => {
  let lvl1 = [];
  let head = srs[0];

  let lvl2 = [];
  for (let x of srs) {
    let y = verbalize_sr_value(x.Value, entity_type);
    if (y) lvl2.push(y);
  }

  if (lvl2.length > 0) {
    if (head.Frequency) lvl1.push(head.Frequency);
    if (head.Restriction) lvl1.push(`${verbalize_restriction_name(head.Restriction)}:`);
    if (lvl2.length <= 2) {
      lvl1.push(lvl2.join(joiner));
    } else {
      lvl1.push(`${lvl2[0]} ${joiner} ${lvl2.slice(1).join(',' + joiner)}`);
    }
  } else {
    if (head.Restriction) lvl1.push(`${verbalize_restriction_name(head.Restriction)}:`);
    if (head.Frequency) lvl1.push(head.Frequency);
  }
  if (lvl1.length > 0) return lvl1.join(' ')
  return null;
}

const verbalize_sr = (sr, entity_type, paradigm_hk, level = 0) => {
  try {
    // console.log(sr);
    if (sr.AND) {
      let srs = sr.AND;
      srs = srs.filter(x => !sr_needs_skipping(x, entity_type, paradigm_hk));
      srs.sort((a, b) => fq_order(b.Frequency) - fq_order(a.Frequency));

      if (is_short_form_possible(srs)) {
        return build_short_form(srs, entity_type, ' UN ');
      }

      let all = [];
      for (let x of srs) {
        let y = verbalize_sr(x, entity_type, paradigm_hk, level + 1);
        if (y) all.push(y);
      }

      // a UN b, UN c, UN d, ...
      if (all.length === 0) return null;
      if (all.length === 1) return all[0];
      if (level > 0) return all.join(' UN ');
      return all.join('; ');
    } else if (sr.OR) {
      let srs = sr.OR;
      srs = srs.filter(x => !sr_needs_skipping(x, entity_type, paradigm_hk));
      srs.sort((a, b) => fq_order(b.Frequency) - fq_order(a.Frequency));

      if (is_short_form_possible(srs)) {
        return build_short_form(srs, entity_type, ' VAI ');
      }

      let all = [];
      for (let x of srs) {
        let y = verbalize_sr(x, entity_type, paradigm_hk, level + 1);
        if (y) all.push(y);
      }

      // a VAI b, VAI c, VAI d, ...
      if (all.length === 0) return null;
      if (all.length === 1) return all[0];
      if (level > 0) {
        if (all.length === 2) return `(${all[0]} VAI ${all[1]})`;
        return `(${all[0]} VAI ${all.slice(1).join(', VAI ')})`;
      } else {
        if (all.length === 2) return `${all[0]} VAI ${all[1]}`;
        return `${all[0]} VAI ${all.slice(1).join(', VAI ')}`;
      }
    } else if (sr.NOT) {
      if (sr_needs_skipping(sr.NOT, entity_type, paradigm_hk)) return null;
      let y = verbalize_sr(sr.NOT, entity_type, paradigm_hk, level + 1);
      if (!y) return null;
      return `NE (${y})`;
    } else {
      if (sr_needs_skipping(sr, entity_type, paradigm_hk)) return null;
      return verbalize_one_sr(sr, entity_type);
    }
  } catch (err) {
    console.error('Kļūda salikta ierobežojuma verbalizācijā', sr, entity_type, paradigm_hk, err);
    return null;
  }
}

const verbalize_flags = (flags, entity_type, paradigm_hk, flag_list, flag_skip_list = [], flag_value_skip_info = {}) => {
  try {
    let r = [];
    for (let f of flag_list) {
      if (flag_skip_list.includes(f)) continue;

      let fv = flags[f];
      if (!fv) continue;

      let ffv = fv;
      let skip_info = flag_value_skip_info[f];
      if (skip_info) {
        if (Array.isArray(ffv)) {
          ffv = ffv.filter(v => !skip_info.includes(v));
        } else {
          if (skip_info.includes(fv)) continue;
        }
      }

      let verbalizer = VERBALIZERS[f];
      if (verbalizer) {
        let result = verbalizer(ffv, f, flags, entity_type, paradigm_hk);
        if (result) {
          r.push(result);
        }
      } else {
        console.error(`Nav definēta verbalizācija karogam '${f}'`);
      }
    }

    let out = r.join(', ');
    if (!flag_skip_list.includes(FM_DOMAIN)) {
      let domain_result = VERBALIZERS[FM_DOMAIN](flags[FM_DOMAIN], FM_DOMAIN, flags, entity_type);
      if (domain_result) {
        out = out ? `${out}; ${domain_result}` : domain_result;
      }
    }
    return out || null;

  } catch (err) {
    console.error('Kļūda karogu verbalizācijā', err);
    console.log({flags, entity_type})
    return null;
  }
}

const verbalize_lexeme = lex => {
  const lemma = lex.lemma;
  let flags = lex.data && lex.data.Gram && lex.data.Gram.Flags;
  let sr = lex.data && lex.data.Gram && lex.data.Gram.StructuralRestrictions;
  const paradigm_hk = lex.paradigm && lex.paradigm.human_key;

  let all = [];
  let flag_skip_list = [];
  let flag_value_skip_list = [];

  if (paradigm_hk) {
    let v_p = verbalize_lexeme_paradigm(lemma, flags, paradigm_hk);
    if (v_p) all.push(v_p);
    if (PD_SKIP_FLAGS[paradigm_hk]) flag_skip_list = PD_SKIP_FLAGS[paradigm_hk];
    if (PD_SKIP_FLAG_VALUES[paradigm_hk]) flag_value_skip_list = PD_SKIP_FLAG_VALUES[paradigm_hk];
  }

  if (flags) {
    flags = Object.assign({}, flags);
    let v_f = verbalize_flags(flags, 'lexeme', paradigm_hk, ENABLED_FLAG_VERBALIZERS, flag_skip_list, flag_value_skip_list);
    if (v_f) all.push(v_f);
  }

  if (sr) {
    sr = Object.assign({}, sr);
    let v_sr = verbalize_sr(sr, 'lexeme', paradigm_hk);
    if (v_sr) all.push(v_sr);
  }

  return all.join('; ').toLowerCase();
}

const verbalize_entity = (entity_type, flags, sr) => {
  let all = [];
  if (flags) {
    let v_f = verbalize_flags(Object.assign({}, flags), entity_type, null, ENABLED_FLAG_VERBALIZERS);
    if (v_f) all.push(v_f);
  }

  if (sr) {
    let v_sr = verbalize_sr(Object.assign({}, sr), entity_type);
    if (v_sr) all.push(v_sr);
  }

  return all.join('; ').toLowerCase();
}

const init = () => {
  debug('initializing verbalizer...');
  let cache = global.__dbcache__;
  if (!cache) {
    console.error('could not find the cache');
    process.exit(1);
  }
  let missing = !cache.paradigms ? 'paradigms' : null;
  if (missing) {
    console.error(`${missing} is missing in cache`);
    process.exit(1);
  }

  for (let p of cache.paradigms) {
    DEFAULT_VALUES_FOR_PARADIGM[p.human_key] = p.data;
  }

  for (let fq of cache.grammar_restriction_frequencies) {
    if (!fq.caption) continue;
    FQ_VALUES[fq.caption.toLowerCase()] = fq.compare_value;
  }

}

// console.log(verbalize_lexeme_with_paradigm('balts', {'Vārdšķira': 'Īpašības vārds'}, 13));

module.exports = {
  init,
  verbalize_lexeme,
  verbalize_entity,
};
