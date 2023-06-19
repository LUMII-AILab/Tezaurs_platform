const fs = require('fs');
const _ = require('lodash');
const debug = require('debug')('db:cache');
const c = require('ansi-colors');
const ProgressBar = require('progress');

const { APP_MODE, app_mode, DICT } = require('../config');
const { prettifyString, soundex, asciify, levenshtein_group, getGuessedDerivatives } = require('./misc-utils');
const { linkifyGloss } = require('./linkifier');
const { buildMorphoTable, getMorphoData, buildMorphoTableFromData, doNotBuildMorphoTableIfEverythingIsBroken, } = require('./morpho-utils');
const { fetchCorporaExamples } = require('./api-utils');
const { outgoing_rel_names, incoming_rel_names, sense_entry_rel_names } = require('./text-constants');
const ws = require('./word-search');
const helper = require('./entry-helper');
const WordPOS = require('wordpos'),
  wordpos = new WordPOS({dictPath: require('path').join(__dirname, 'dict_3.0')});

// const RELEASE_ID = 2;
// const RELEASE_ID = process.env.RELEASE;

const PREV_NEXT_SIZE = 7;
const CORPORA_EXAMPLES_LIMIT = 3;

// -------
class DbCache {
  constructor(app) {
    this.app = app;
    this.db = app.get('db');
    this.dbschema = app.get('dbschema');

    this.entriesByHK = new Map();
    this.entriesById = new Map();
    this.entriesByHeading = new Map();
    this.entriesByHeadingInLowerCase = new Map();

    this.sensesById = new Map();

    this.lexemesByLemma = new Map();

    this.sourcesById = new Map();

    this.corporaExamplesMap = new Map();

    this.sources = null;

    this.entryQueryCache = {};
    this.useEntryQueryCache = true;

    this.searchWordBuffer = [];
    this.fullEntryBuffer = [];

    this.glossLinks = {sense: new Map(), entry: new Map()};

    this.ws = ws;
    ws.clear();

    global.__dbcache__ = this;
  }

  async init(app) {
    if (app.locals.isReady) {
      return;
    }

    // ...

    await this.db.withConnection(async db => {
      debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
      await this.initCodifiers(db);
      debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
  
  
      if ([APP_MODE.PUBLIC, APP_MODE.BUILD_CACHE].includes(app_mode)) {
        await this.initEntries(db);
        if (app_mode === APP_MODE.BUILD_CACHE) {
          await this.initExtras(db);
          await this.initMeta(db);
        }
      }
  
      // await this.initLazy(db); // TODO: izpildīt vēlāk
  
      app.locals.dbcache = this;
      app.locals.isReady = true;
      console.log('cache ready');
  
      if (app_mode === APP_MODE.BUILD_CACHE) {
        console.log('cache build mode, exiting');
        console.log('current time:', new Date());
        process.exit(0);
      }

    });


  }

  async initCodifiers(db) {
    console.log('current time:', new Date());
    console.time('loading codifiers');

    this.entry_types = await db[this.dbschema].entry_types.find();
    debug(`${this.entry_types.length} entry types loaded`);

    this.lexeme_types = await db[this.dbschema].lexeme_types.find();
    debug(`${this.lexeme_types.length} lexeme types loaded`);

    this.entry_rel_types = await db[this.dbschema].entry_rel_types.find();
    debug(`${this.entry_rel_types.length} e-e relation types loaded`);

    this.sense_rel_types = await db[this.dbschema].sense_rel_types.find();
    debug(`${this.sense_rel_types.length} s-s relation types loaded`);

    this.sense_entry_rel_types = await db[this.dbschema].sense_entry_rel_types.find();
    debug(`${this.sense_entry_rel_types.length} s-e relation types loaded`);

    this.grammar_flags = await db[this.dbschema].grammar_flags.find();
    debug(`${this.grammar_flags.length} grammar flags loaded`);

    this.grammar_flag_values = await db[this.dbschema].grammar_flag_values.find();
    debug(`${this.grammar_flag_values.length} grammar flag values loaded`);

    this.grammar_restriction_frequencies = await db[this.dbschema].grammar_restriction_frequencies.find();
    debug(`${this.grammar_restriction_frequencies.length} grammar restriction frequencies loaded`);

    this.grammar_restriction_types = await db[this.dbschema].grammar_restriction_types.find();
    debug(`${this.grammar_restriction_types.length} grammar restriction types loaded`);

    this.search_word_types = await db[this.dbschema].search_word_types.find();
    debug(`${this.search_word_types.length} search word types loaded`);

    this.entity_types = await db[this.dbschema].entity_types.find();
    debug(`${this.entity_types.length} entity types loaded`);

    this.sources = await db[this.dbschema].sources.find();
    debug(`${this.sources.length} sources loaded`);
    for (let s of this.sources) {
      this.sourcesById.set(s.id, s);
    }

    this.paradigms = await db[this.dbschema].paradigms.find();
    debug(`${this.paradigms.length} paradigms loaded`);

    console.timeEnd('loading codifiers');
  }  
 
  async initEntries0(db) {
    console.time('load entries');
    const ee = await db[this.dbschema].entries.find({ hidden: false });
    debug(`Ielasīti ${ee.length} šķirkļi`);
    for (let e of ee) {
      this.entriesByHK.set(e.human_key, e);
      let hl = this.entriesByHeading.get(e.heading);
      if (!hl) hl = [];
      hl.push(e);
      this.entriesByHeading.set(e.heading, hl);
    }
    console.timeEnd('load entries');
    console.log(`entryMap: ${this.entriesByHK.size}, headingsMap: ${this.entriesByHeading.size}`)
  }

  async initEntries(db) {
    let QUERY_CRITERIA = null;
    if (app_mode === APP_MODE.PUBLIC || app_mode === APP_MODE.BUILD_CACHE) {
      QUERY_CRITERIA = { hidden: false };
    } else {
      QUERY_CRITERIA = {};
    }

    console.time('loading core data');
    let startTime = Date.now();
    this.entries = await db[this.dbschema].entries.find(QUERY_CRITERIA, { order: [{ field: 'heading', direction: 'asc' }, { field: 'human_key', direction: 'asc' }] });
    debug(`Ielasīti ${this.entries.length} šķirkļi`);
    for (let e of this.entries) {
      e.lexemes = [];
      e.senses = [];
      // e.examples = [];
      this.entriesByHK.set(e.human_key, e);
      this.entriesById.set(e.id, e);

      let hl = this.entriesByHeading.get(e.heading) || [];
      hl.push(e);
      this.entriesByHeading.set(e.heading, hl);

      // // aprisinājums sliktiem MWE
      // if (e.type_id === 4) {
      //   this.entriesByHeadingInLowerCase.set(e.heading.toLowerCase(), e);
      // }
      // // aprisinājuma beigas
      if (e.heading !== e.heading.toLowerCase()) {
        let hl2 = this.entriesByHeadingInLowerCase.get(e.heading.toLowerCase()) || [];
        hl2.push(e);
        this.entriesByHeadingInLowerCase.set(e.heading.toLowerCase(), hl2);
      }
      if ([1, 5].includes(e.type_id)) {
        ws.add_word(e.heading);
      }
    }
    console.log(`🏁 ${this.entries.length} entries loaded (${(Date.now() - startTime) / 1000} s.)`);
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    startTime = Date.now();

    this.lexemes = await db[this.dbschema].lexemes.find(QUERY_CRITERIA, { order: [{ field: 'hidden', direction: 'asc' }, { field: 'order_no', direction: 'asc' }] } );
    debug(`Ielasītas ${this.lexemes.length} leksēmas`);
    for (let l of this.lexemes) {
      let e = this.entriesById.get(l.entry_id);
      if (!e) continue; // ja vecāks ir hidden
      if (l.paradigm_id) {
        l.paradigm = this.paradigms.find(x => x.id === l.paradigm_id);
      }
      e.lexemes.push(l);
      if (e.primary_lexeme_id === l.id) {
        l.isPrimary = true;
        e.primaryLexeme = l;
      }
      let ll = this.lexemesByLemma.get(l.lemma) || [];
      ll.push(l);
      this.lexemesByLemma.set(l.lemma, ll);
      if ([1, 5].includes(e.type_id)) {
        ws.add_word(l.lemma);
      }
    }
    console.log(`🏁 🏁 ${this.lexemes.length} lexemes loaded (${(Date.now() - startTime) / 1000} s.)`);
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    startTime = Date.now();

    this.senses = await db[this.dbschema].senses.find(QUERY_CRITERIA, { order: [{ field: 'hidden', direction: 'asc' }, { field: 'order_no', direction: 'asc' }] } );
    debug(`Ielasītas ${this.senses.length} nozīmes`);
    for (let s of this.senses) {
      this.sensesById.set(s.id, s);
      let e = this.entriesById.get(s.entry_id);
      if (!e) continue; // ja vecāks ir hidden
      // s.examples = [];
      e.senses.push(s);
    }
    console.log(`🏁 🏁 🏁 ${this.senses.length} senses loaded (${(Date.now() - startTime) / 1000} s.)`);
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    startTime = Date.now();

    // todo: move this
    const pwn_relation_map = {
      'eq_has_hyperonym': 'LV šaurāka nozīme',
      'eq_has_hyponym': 'LV plašāka nozīme',
    };

    this.synsets = await this.getSynsets(db);
    debug(`Ielasītas ${this.synsets.length} sinonīmu kopas`);
    for (let synset of this.synsets) {
      if (synset.senses) {
        for (let synset_sense of synset.senses) {
          let s = this.sensesById.get(synset_sense.sense_id);
          if (!s) continue; // ja vecāks ir hidden
          s.synset = Object.assign({}, synset);
          s.synset.senses = synset.senses.filter(ss => ss.sense_id !== synset_sense.sense_id);
          if (synset.external_links) {
            let external_links = [];
            for (let l of synset.external_links) {
              let res = { url: l.url, display_relation: l.data && l.data.Relation ? pwn_relation_map[l.data.Relation] : null };
              let [offset, pos] = l.remote_id.split('-');
              external_links.push(Object.assign(res, await wordpos.seek(parseInt(offset), pos).then(s => ({
                remote_id: `${s.synsetOffset}-${s.pos === 's' ? 'a' : s.pos}`,
                gloss: s.gloss,
                senses: s.synonyms.map(syn => ({text: syn.split('_').join(' ')}))
              }))));
            }
            s.synset.external_links = external_links;
          }
        }
      }
    }
    console.log(`🏁 🏁 🏁 🏁 ${this.synsets.length} synsets loaded (${(Date.now() - startTime) / 1000} s.)`);
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    startTime = Date.now();

    this.examples = await db[this.dbschema].examples.find(QUERY_CRITERIA, { order: [{ field: 'hidden', direction: 'asc' }, { field: 'order_no', direction: 'asc' }] } );
    debug(`Ielasīti ${this.examples.length} piemēri`);
    for (let x of this.examples) {
      if (x.sense_id) {
        let s = this.sensesById.get(x.sense_id);
        if (!s) continue; // ja vecāks ir hidden
        if (!s.examples) s.examples = [];
        s.examples.push(x);
      } else {
        let e = this.entriesById.get(x.entry_id);
        if (!e) continue; // ja vecāks ir hidden
        if (!e.examples) e.examples = [];
        e.examples.push(x);
      }
    }
    console.log(`🏁 🏁 🏁 🏁 🏁 ${this.examples.length} examples loaded (${(Date.now() - startTime) / 1000} s.)`);
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    startTime = Date.now();

    const sls = await db[this.dbschema].source_links.find();
    for (let sl of sls) {
      let e = this.entriesById.get(sl.entry_id);
      let src = this.sourcesById.get(sl.source_id);
      if (!e || !src) continue;
      if (!e.sources) e.sources = [];
      if (sl.data) {
        let srcClone = { ...src };
        srcClone.data = sl.data;  // sourceDetails
        e.sources.push(srcClone);
      } else {
        e.sources.push(src);
      }
    }
    console.log(`🏁 🏁 🏁 🏁 🏁 🏁 source links loaded (${(Date.now() - startTime) / 1000} s.)`);
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    startTime = Date.now();

    const sers = await db[this.dbschema].sense_entry_relations.find();
    for (let ser of sers) {
      let e = this.entriesById.get(ser.entry_id);
      let s = this.sensesById.get(ser.sense_id);
      if (!e || !s) continue;

      let s_entry = this.entriesById.get(s.entry_id);
      if (!e.sidelinks) e.sidelinks = [];
      e.sidelinks.push({
        direction: 'nozīmes',
        relation: sense_entry_rel_names[ser.type_id],
        human_key: s_entry.human_key,
        heading: s_entry.heading,
        rel_id: ser.id,
      });

      switch (ser.type_id) {
        case 1: // hasMWE (41045)
          if (!s.MWEs) s.MWEs = [];
          s.MWEs.push(e);
          // if (!e.mweForSenses) e.mweForSenses = [];
          // e.mweForSenses.push(s);
          break;
        case 4: // gloss link
          ser.entry = e;
          this.glossLinks.entry.set(ser.id, ser);
          break;
      }
    }
    console.log(`🏁 🏁 🏁 🏁 🏁 🏁 🏁 s-e relations loaded (${(Date.now() - startTime) / 1000} s.)`);
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    startTime = Date.now();

    const ers = await db[this.dbschema].entry_relations.find();
    for (let er of ers) {
      let e1 = this.entriesById.get(er.entry_1_id);
      let e2 = this.entriesById.get(er.entry_2_id);
      if (!e1 || !e2) continue;

      if (!e2.incoming_entry_relations) e2.incoming_entry_relations = [];
      e2.incoming_entry_relations.push({ type_id: er.type_id, entry: e1 });

      // MWE šīs nevajag, jo tas pats jau ir MWEs[]
      if (er.type_id !== 3) {
        if (!e2.sidelinks) e2.sidelinks = [];
        e2.sidelinks.push({
          direction: 'ienākoša',
          relation: incoming_rel_names[er.type_id],
          human_key: e1.human_key,
          heading: e1.heading,
          rel_id: er.id,
        });
      }

      if (!e1.sidelinks) e1.sidelinks = [];
      e1.sidelinks.push({
        direction: 'izejoša',
        relation: outgoing_rel_names[er.type_id],
        human_key: e2.human_key,
        heading: e2.heading,
        rel_id: er.id,
      });

      switch (er.type_id) {
        case 1: // derivativeOf (0)
          break;
        case 2: // sameAs (0)
          break;
        case 3: // mweFor (12023)
          if (!e2.MWEs) e2.MWEs = [];
          e2.MWEs.push(e1);
          // if (!e1.mweForEntries) e1.mweForEntries = [];
          // e1.mweForEntries.push(e2);
          break;
        case 4: // seeAlso (0)
          break;
        case 5: // idiomFor (1)
          if (!e2.idioms) e2.idioms = [];
          e2.idioms.push(e1);
          // if (!e1.idiomFor) e1.idiomFor = [];
          // e1.idiomFor.push(e2);
          break;
      }
    }
    console.log(`🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 e-e relations loaded (${(Date.now() - startTime) / 1000} s.)`);
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    startTime = Date.now();

    const srs = await db[this.dbschema].sense_relations.find();
    for (let sr of srs) {
      sr.sense = this.sensesById.get(sr.sense_2_id);
      sr.entry = this.entriesById.get(sr.sense.entry_id);
      switch (sr.type_id) {
        case 4: // gloss link
          this.glossLinks.sense.set(sr.id, sr);
          break;
      }
    }
    console.log(`🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 s-s relations loaded (${(Date.now() - startTime) / 1000} s.)`);
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    startTime = Date.now();

    this.entriesById.forEach((e, id) => {
      this.prepareEntrySenses(e);
      if (e.MWEs) {
        e.MWEs.sort((a, b) => a.heading.localeCompare(b.heading, 'lv'));
      }
      if (e.incoming_entry_relations) {
        e.incoming_entry_relations.sort((a, b) => a.entry.heading.localeCompare(b.entry.heading, 'lv'));
      }
    });
    console.log(`🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 (${(Date.now() - startTime) / 1000} s.)`);
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    startTime = Date.now();

    this.sensesById.forEach((s, id) => {
      if (s.parent_sense_id && this.sensesById.has(s.parent_sense_id)) {
        s.parent_order_no = this.sensesById.get(s.parent_sense_id).order_no;
      }
      if (s.MWEs) {
        s.MWEs.sort((a, b) => a.heading.localeCompare(b.heading, 'lv'));
      }
    })
    console.log(`🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 (${(Date.now() - startTime) / 1000} s.)`);
    console.timeEnd('loading core data');
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);

    console.log(`entryMap: ${this.entriesByHK.size}, headingsMap: ${this.entriesByHeading.size}`);
    console.log('current time:', new Date());
  }

  prepareEntrySenses(entry) {
    if (!entry.senses) return;

    const top_senses = [];
    const all_senses = entry.senses;

    for (let curr_sense of all_senses) {
      if (curr_sense.parent_sense_id) {
        let parent = all_senses.find(x => x.id === curr_sense.parent_sense_id);
        if (!parent) {
          // error
        } else {
          if (parent.subSenses) {
            parent.subSenses.push(curr_sense);
          } else {
              parent.subSenses = [curr_sense];
          }
        }
      } else {
        top_senses.push(curr_sense);
      }
    }
    entry.senses = top_senses;
  }

  async initExtras(db) {
    const DO_TEST = false;
    const TEST_LIMIT = 2000;

    await this.clearSearchWords(db);

    // -- lexemes --
    let lexeme_bar = new ProgressBar('[:bar] ( leksēmas - :current no :total, :percent (vēl :eta s) )', { total: this.lexemes.length, width: 100, incomplete: '.' });
    console.time('lexemes');

    let lexemes_to_inflect = [];
    for (let lex of this.lexemes) {
      lexeme_bar.tick();

      let entry = this.entriesById.get(lex.entry_id);
      if (!entry) continue;

      if (!entry.heading_is_primary_lexeme || !lex.isPrimary) {
        await this.saveLexemeBase(db, entry, lex);
      }

      if (!lex.paradigm) continue;
      // if (lex.paradigm.legacy_no === 0) continue;
      // if (lex.paradigm.legacy_no === 36) continue; // nelokām saīsinājumus
      // if ([0, 12, 21, 26, 27, 28, 29, 36, 38, 39, 49, 51, 54, 55, 56].includes(lex.paradigm.legacy_no)) continue;
      // 2023-04-27 no saraksta izņemta 51. paradigma, lai iegūtu formas drīz-drīzāk-visdrīzāk
      if ([0, 12, 21, 26, 27, 28, 29, 36, 38, 39, 49, 54, 55, 56].includes(lex.paradigm.legacy_no)) continue;

      /**
       *
       * 0  | dummy     | Pagātnes mantojums
       * 12 | noun-0    | Nelokāmi lietvārdi (kino)
       * 21 | adverb    | Apstākļa vārdi bez salīdzināmām pakāpēm (vienmēr, lielākoties)
       * 26 | prep      | Prievārdi (ar, uz, no, dēļ)
       * 27 | conj      | Saikļi (un, ka, jo)
       * 28 | particle  | Partikulas (jā, nē, varbūt)
       * 29 | hardcoded | Pārpalikumi - nelokāmie skaitļa vārdi, kā arī izņēmumgadījumi un atsevišķas formas, kas neiederas nevienā citā grupā (trīsarpus)
       * 36 | abbr      | Saīsinājumi (t.i., utt., u.c.)
       * 38 | excl      | Izsauksmes vārdi (ak, aha)
       * 39 | foreign   | Vārdi svešvalodā (company, adaggio)
       * 49 | noun-g    | Ģenitīveņi (augstpapēžu, milzu, pagaidu)
       * 51 | adverb-2  | Apstākļa vārdi ar salīdzināmām pakāpēm (ātri)
       * 54 | adj-infl  | Nelokāmi īpašības vārdi (lillā)
       *
       */

      lexemes_to_inflect.push(lex);
    }
    await this.saveSearchWord(db);
    console.timeEnd('lexemes');
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    // -- lexemes --

    // -- entry words --
    console.time('entryWords');
    let entry_word_bar = new ProgressBar('[:bar] ( :current entryWord no :total, :percent (vēl :eta s) )', { total: this.entries.length, width: 100, incomplete: '.' });
    for (let e of this.entries) {
      entry_word_bar.tick();
      // if (e.heading_is_primary_lexeme) continue;
      // if (e.type_id !== 1) continue; // ņemam tikai vārdus
      if (e.type_id === 4) continue; // ņemam vārdus un vārdu daļas

      await this.saveEntryBase(db, e);
    }

    await this.saveSearchWord(db);
    console.timeEnd('entryWords');
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    // -- end entry words --

    // -- prevNext--
    console.time('prevnext');
    this.entries.forEach(e => {
      e.prev = [];
      e.next = [];
    });
    let prevnext_bar = new ProgressBar('[:bar] ( :current prevnext no :total, :percent (vēl :eta s) )', { total: this.entriesByHeading.size, width: 100, incomplete: '.' });
    // let entry_types = [1, 4, 5];
    let heading_lists_by_type = [[], [], [], [], [], [], ];
    this.entriesByHeading.forEach((list, heading) => {
      heading_lists_by_type[list[0].type_id].push(list);
    });
    console.log(heading_lists_by_type.map(x => x.length));
    for (let one_type of heading_lists_by_type) {
      one_type.forEach((x, i) => {
        let item = _.pick(x[0], ['type_id', 'heading', 'human_key']);
        prevnext_bar.tick();
        for (let i2 = Math.max(0, i - PREV_NEXT_SIZE); i2 < i; i2 += 1) {
          for (let e of one_type[i2]) {
            e.next.push(item);
          }
        }
        for (let i2 = i + 1; i2 < Math.min(one_type.length, i + PREV_NEXT_SIZE+ 1); i2 += 1) {
          for (let e of one_type[i2]) {
            e.prev.push(item);
          }
        }
      })
    }
    console.timeEnd('prevnext');
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    // -- end prevNext--

    // -- morphology --
    if (this.app.locals.dict === 'tezaurs' || this.app.locals.dict === 'ltg') {
      console.time('build morphologies');
      let morpho_bar = new ProgressBar('[:bar] ( :current morpho leksēmas no :total, :percent (vēl :eta s) )', { total: lexemes_to_inflect.length, width: 100, incomplete: '.' });
      // let lexeme_bar = new ProgressBar('[:bar] ( :current leksēmas no :total, :percent )', { total: TEST_LIMIT, width: 100, incomplete: '.' });

      const now = new Date();
      const timestamp = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}-${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
      const MORPHO_LOGFILE_NO_DATA = fs.createWriteStream(`morpho-problems-no-data-${timestamp}.log`);
      const MORPHO_LOGFILE_NO_TABLE = fs.createWriteStream(`morpho-problems-no-table-${timestamp}.log`);

      let t1 = 0;
      for (let lex of lexemes_to_inflect) {
        try {
          let lex_entry = this.entriesById.get(lex.entry_id);
          const md = await getMorphoData(
            lex.lemma,
            // lex.paradigm.legacy_no,
            lex.paradigm.human_key,
            lex.paradigm.data,
            lex.stem1,
            lex.stem2,
            lex.stem3,
            lex.data && lex.data.Gram && lex.data.Gram.Flags,
            lex.data && lex.data.Gram && lex.data.Gram.StructuralRestrictions,
          );
          if (md) {
            await this.saveInflections(db, this.entriesById.get(lex.entry_id), lex, md);
            if (!doNotBuildMorphoTableIfEverythingIsBroken(lex)) {
              const mt = buildMorphoTableFromData(
                md,
                lex.lemma,
                // lex.paradigm.legacy_no,
                lex.paradigm.human_key,
                lex.paradigm.data,
                lex.stem1,
                lex.stem2,
                lex.stem3,
                lex.data && lex.data.Gram && lex.data.Gram.Flags,
                lex.data && lex.data.Gram && lex.data.Gram.StructuralRestrictions,
              );
              if (mt) {
                lex.morphology = mt;
              } else {
                debug(lex.lemma, lex.paradigm.legacy_no, 'dati bija, bet nesanāca morfotabula');
                // debug(md);
                MORPHO_LOGFILE_NO_TABLE.write(`Lemma ${lex.lemma}, paradigma ${lex.paradigm.legacy_no}, šķirklis ${lex_entry.human_key}\n`);
              }
            }
          } else {
            debug(`${lex.lemma}: paradigma bija (${lex.paradigm.legacy_no}), bet nesanāca morfodati`);
            MORPHO_LOGFILE_NO_DATA.write(`Lemma ${lex.lemma}, paradigma ${lex.paradigm.legacy_no}, šķirklis ${lex_entry.human_key}\n`);
          }
        } catch (err) {
          console.error('nosprāga morfoloģija', err);
        }
        morpho_bar.tick();
        t1++;
        if (DO_TEST && t1 >= TEST_LIMIT) break;
      }
      lexemes_to_inflect = null;
      MORPHO_LOGFILE_NO_DATA.end();
      MORPHO_LOGFILE_NO_TABLE.end();
      console.timeEnd('build morphologies');
      debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    }
    // -- end morphology --

    // -- corpora examples --
    if (this.app.locals.dict === 'tezaurs') {
      console.time('corpora examples');
      let word_headings = heading_lists_by_type[1];
      let corpora_bar = new ProgressBar('[:bar] ( :current corpora no :total, :percent (vēl :eta s) )', { total: word_headings.length, width: 100, incomplete: '.' });
      // let corpora_bar = new ProgressBar('[:bar] ( :current corpora no :total, :percent (vēl :eta s) )', { total: TEST_LIMIT, width: 100, incomplete: '.' });
      let t2 = 0;
      for (let wh of word_headings) {
        let word = wh[0].heading;

        let examples = await fetchCorporaExamples(word);
        if (examples) {
          examples = examples.slice(0, CORPORA_EXAMPLES_LIMIT);
          for (let e of wh) {
            e.corporaExamples = examples;
          }
        }

        corpora_bar.tick();
        t2++;
        if (DO_TEST && t2 >= TEST_LIMIT) break;
      }
      heading_lists_by_type = null;
      console.timeEnd('corpora examples');
      debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    }
    // -- corpora examples --

    // -- save full_entries --
    console.time('save fullentries');
    let fullentries_bar = new ProgressBar('[:bar] ( :current full_entries no :total, :percent (vēl :eta s) )', { total: this.entries.length, width: 100, incomplete: '.' });
    // let fullentries_bar = new ProgressBar('[:bar] ( :current full_entries no :total, :percent (vēl :eta s) )', { total: TEST_LIMIT, width: 100, incomplete: '.' });
    let t3 = 0;
    await this.clearFullEntries(db);
    for (let e of this.entries) {
      let insertable = {
        entry_id: e.id,
        human_key: e.human_key,
        heading: e.heading,
        homonym_no: e.homonym_no,
        data: e,
      };
      // await db[this.dbschema].full_entries.insert();
      try {
        let test = JSON.stringify(insertable);
      } catch(err) {
        console.error(`Problēma ar šķirkli ${e.human_key} – cikls`);
        continue;
      }
      await this.saveFullEntry(db, insertable);
      fullentries_bar.tick();
      t3++;
      if (DO_TEST && t3 >= TEST_LIMIT) break;
    }
    await this.saveFullEntry(db);
    console.timeEnd('save fullentries');
    debug(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    // -- end save full_entries --
  }

  async initMeta(db) {
    try {
      let d = new Date();
      let m = d.getMonth() + 1;
      let y = d.getFullYear();
      let menesis;
      let kvartals;

      switch (m) {
        case 1:
        case 2:
        case 3:
          kvartals = 2;
          menesis = 'Pavasara';
          break;
        case 4:
        case 5:
        case 6:
          kvartals = 3;
          menesis = 'Vasaras';
          break;
        case 7:
        case 8:
        case 9:
          kvartals = 4;
          menesis = 'Rudens';
          break;
        case 10:
        case 11:
        case 12:
          y += 1;
          kvartals = 1;
          menesis = 'Ziemas';
          break;
      }

      let title = `${menesis} versija ${y}`;
      let tag = `${DICT}_${y}_${kvartals}`;

      let result = await db[this.dbschema].metadata.update(1, {
        title,
        subtitle: '',
        is_editable: false,
        info: {
          dictionary: DICT,
          tag,
          counts: {
            entries: this.entries.length,
            senses: this.senses.length,
            lexemes: this.lexemes.length,
            examples: this.examples.length,
            synsets: this.synsets.length,
            // entry_relations: this.entry_relations.length,
            // sense_entry_relations: this.sense_entry_relations.length,
            // sense_relations: this.sense_relations.length,
          }

        },
        $set: {
          release_timestamp: 'current_timestamp',
        }
      });
      console.log('meta written: ', result);
 
    } catch (err) {
      console.error('Nevarēju ierakstīt db meta info', err)
    }
  }

  entryHasSiblings(heading) {
    if (app_mode === APP_MODE.PUBLIC) {
      let sl = this.entriesByHeading.get(heading);
      return sl && sl.length > 1;
    } else {
      // let siblings = await db[this.dbschema].entries.find({ heading });
      // return siblings.length > 1;
      return true;
    }
  }

  async saveSearchWord(db, insertable) {
    if (!insertable && this.searchWordBuffer.length > 0) { // flush
      await db[this.dbschema].search_words.insert(this.searchWordBuffer);
      this.searchWordBuffer = [];
      return;
    } else if (!insertable) {
      return;
    } else {
      this.searchWordBuffer.push(insertable);
      if (this.searchWordBuffer.length >= 100) {
        await db[this.dbschema].search_words.insert(this.searchWordBuffer);
        this.searchWordBuffer = [];
      }
    }
  }

  async saveFullEntry(db, insertable) {
    if (!insertable && this.fullEntryBuffer.length > 0) { // flush
      try {
        await db[this.dbschema].full_entries.insert(this.fullEntryBuffer);
      } catch(err) {
        console.error(err);
        process.exit(1);
      }
      this.fullEntryBuffer = [];
      return;
    } else if (!insertable) {
      return;
    } else {
      this.fullEntryBuffer.push(insertable);
      if (this.fullEntryBuffer.length >= 100) {
        try {
          await db[this.dbschema].full_entries.insert(this.fullEntryBuffer);
        } catch(err) {
          console.error(err);
          process.exit(1);
        }
        this.fullEntryBuffer = [];
      }
    }
  }

  async saveEntryBase(db, e) {
    let target_type_id = 1; // entry
    let target_subtype_id = e.type_id;
    let target_id = e.id;
    let entry_id = e.id;
    let original = e.heading;

    let insertable = {
      word: e.heading,
      word_type_id: 1,
      target_type_id,
      target_subtype_id,
      target_id,
      entry_id,
      original,
      // lvst_group: levenshtein_group(e.heading),
    }
    await this.saveSearchWord(db, insertable);

    if (e.heading !== e.heading.toLowerCase()) {
      let insertable2 = {
        word: e.heading.toLowerCase(),
        word_type_id: 7,
        target_type_id,
        target_subtype_id,
        target_id,
        entry_id,
        original,
      }
      await this.saveSearchWord(db, insertable2);
    }

    if (e.heading !== asciify(e.heading)) {
      let insertable3 = {
        word: asciify(e.heading),
        word_type_id: 6,
        target_type_id,
        target_subtype_id,
        target_id,
        entry_id,
        original,
      }
      await this.saveSearchWord(db, insertable3);
    }

    let insertable4 = {
      word: soundex(e.heading),
      word_type_id: 4,
      target_type_id,
      target_subtype_id,
      target_id,
      entry_id,
      original,
    }
    await this.saveSearchWord(db, insertable4);

    for (let { guess, guess_type} of getGuessedDerivatives(e.heading)) {
      let insertable5 = {
        word: guess,
        word_type_id: guess_type,
        target_type_id,
        target_subtype_id,
        target_id,
        entry_id,
        original,
      }
      await this.saveSearchWord(db, insertable5);
    }
  }

  async saveWordBase(db, entry, lex = null) {
    let target_type_id, target_subtype_id, target_id, original;
    let entry_id = entry.id;

    if (lex.isPrimary && entry.heading_is_primary_lexeme) {
      target_type_id = 1; // entry
      target_subtype_id = entry.type_id;
      target_id = entry.id;
      original = entry.heading;
    } else {
      target_type_id = 2; // lexeme
      target_subtype_id = lex.type_id;
      target_id = lex.id;
      original = lex.lemma;
    }

    let insertable = {
      word: lex.lemma,
      word_type_id: 1,
      // lvst_group: levenshtein_group(original),

      target_type_id,
      target_subtype_id,
      target_id,
      entry_id,
      original,
    };
    await this.saveSearchWord(db, insertable);

    let insertable2 = {
      word: soundex(original),
      word_type_id: 4, // soundex

      target_type_id,
      target_subtype_id,
      target_id,
      entry_id,
      original,
    };
    await this.saveSearchWord(db, insertable2);

    if (original !== original.toLowerCase()) {
      let insertable3 = {
        word: original.toLowerCase(),
        word_type_id: 7, // lowercase

        target_type_id,
        target_subtype_id,
        target_id,
        entry_id,
        original,
      };
      await this.saveSearchWord(db, insertable3);
    }

    if (original !== asciify(original)) {
      let insertable4 = {
        word: asciify(lex.lemma),
        word_type_id: 6, // asciify

        target_type_id,
        target_subtype_id,
        target_id,
        entry_id,
        original,
      };
      await this.saveSearchWord(db, insertable4);
    }

    for (let { guess, guess_type } of getGuessedDerivatives(original)) {
      let insertable5 = {
        word: guess,
        word_type_id: guess_type,

        target_type_id,
        target_subtype_id,
        target_id,
        entry_id,
        original,
      }
      await this.saveSearchWord(db, insertable5);
    }
  }

  async saveLexemeBase(db, entry, lex) {
    let target_type_id, target_subtype_id, target_id;
    let entry_id = entry.id;
    let original = lex.lemma;

    if (lex.isPrimary && entry.heading_is_primary_lexeme) {
      target_type_id = 1; // entry
      target_subtype_id = entry.type_id;
      target_id = entry.id;
    } else {
      target_type_id = 2; // lexeme
      target_subtype_id = lex.type_id;
      target_id = lex.id;
    }

    let insertable = {
      original: lex.lemma,
      word: lex.lemma,
      word_type_id: 1,
      target_type_id,
      target_subtype_id,
      target_id,
      entry_id,
      // lvst_group: levenshtein_group(lex.lemma),
    };
    await this.saveSearchWord(db, insertable);

    let insertable2 = {
      original: lex.lemma,
      word: soundex(lex.lemma),
      word_type_id: 4, // soundex
      target_type_id,
      target_subtype_id,
      target_id,
      entry_id,
    };
    await this.saveSearchWord(db, insertable2);

    if (lex.lemma !== lex.lemma.toLowerCase()) {
      let insertable3 = {
        original: lex.lemma,
        word: lex.lemma.toLowerCase(),
        word_type_id: 7, // lowercase
        target_type_id,
        target_subtype_id,
        target_id,
        entry_id,
      };
      await this.saveSearchWord(db, insertable3);
    }

    if (lex.lemma !== asciify(lex.lemma)) {
      let insertable4 = {
        original: lex.lemma,
        word: asciify(lex.lemma),
        word_type_id: 6, // asciify
        target_type_id,
        target_subtype_id,
        target_id,
        entry_id,
      };
      await this.saveSearchWord(db, insertable4);
    }

    for (let { guess, guess_type } of getGuessedDerivatives(lex.lemma)) {
      let insertable5 = {
        original: lex.lemma,
        word: guess,
        word_type_id: guess_type,
        target_type_id,
        target_subtype_id,
        target_id,
        entry_id,
      }
      await this.saveSearchWord(db, insertable5);
    }

  }

  async saveInflections(db, entry, lex, inflections) {
    let iSet = new Set();

    if (inflections && Array.isArray(inflections)) {
      for (let iii of inflections) {
        if (iii && Array.isArray(iii)) {
          for (let i of iii) {
            // console.log(i['Vārds']);
            if (i['Vārds'] === lex.lemma) continue;
            iSet.add(i['Vārds']);
          }
        }
      }
    }
    // inflectionCount += iSet.size;

    let inflected = Array.from(iSet);
    let to_insert = [];
    for (let x of inflected) {
      let insertable = {
          word: x,
          inflected: true,
          word_type_id: 1,
          target_type_id: 2, // lexeme
          target_subtype_id: lex.type_id,
          target_id: lex.id,
          entry_id: lex.entry_id,
          original: lex.lemma,
      };
      to_insert.push(insertable);

      // let insertable2 = {
      //   word: soundex(x),
      //   inflected: true,
      //   word_type_id: 4,
      //   target_type_id: 2, // lexeme
      //   target_subtype_id: lex.type_id,
      //   target_id: lex.id,
      //   entry_id: lex.entry_id,
      // };
      // to_insert.push(insertable2);

      // console.log('insertable', insertable);
      // await this.db[this.dbschema].search_words.insert(insertable); // TODO: insert in chunks
    }
    await db[this.dbschema].search_words.insert(to_insert);

  }

  async clearSearchWords(db) {
    console.log('deleting search_words...');
    console.time('search_words deleted');
    const r = await db.query(`DELETE FROM ${this.dbschema}.search_words`);
    console.timeEnd('search_words deleted');
  }

  async clearFullEntries(db) {
    console.log('deleting full_entries...');
    console.time('full_entries deleted');
    const r = await db.query(`DELETE FROM ${this.dbschema}.full_entries`);
    console.timeEnd('full_entries deleted');
  }

  async reloadEntry(entry_id) {
    // TODO:
    // 1) izmest visu esošo entry + saites uz to
    // 2) ielasīt no jauna entry un salikt saites
  }

  dropRelease() {
    debug('dropping release cache');
    this.entries = null;
  }

  dropAll() {

  }

  // async get(tableName, filter) {

  // }

  async getEntries(db, filter) {
    const entryFilter = filter || {};
    if (!typeof entryFilter === 'object') {
      console.error('filter should be empty or an object');
      return [];
    }

    // entryFilter['release_id'] = RELEASE_ID;
    const filterKey = JSON.stringify(entryFilter);

    if (!this.useEntryQueryCache || !this.entryQueryCache[filterKey]) {
    // const e = await db[dbschema].entries.find({ 'release_id': RELEASE_ID, 'human_key IS NOT': null });
      const result = await db[this.dbschema].entries.find(entryFilter);
      debug(`${result.length} entry stubs loaded for the key ${filterKey}`);
      this.entryQueryCache[filterKey] = result;
    }

    return this.entryQueryCache[filterKey];
  }

  async getEntryById(eid) {
    let e = await this.db[this.dbschema].entries.findOne(eid);
    if (!e) return null;
    e = _.omit(e, ['created_at', 'updated_at']);
    return e;
  }

  async getEntryById1(eid) {
    if (!this.entries) {
      this.entries = await this.db[this.dbschema].entries.find();
    }

    return this.entries.find(x => x.id === eid);
  }

  async getEntryById2(eid) {
    if (this.entriesByHK.size === 0) {
      if (!this.entries || this.entries.length === 0) {
        console.time('read entries');
        this.entries = await this.db[this.dbschema].entries.find();
        console.timeEnd('read entries');
      }
      console.time('map entries');
      for (let e of this.entries) {
        this.entriesByHK.set(e.id, e);
      }
      console.timeEnd('map entries');
      console.log(this.entries.length);
    }
    return this.entriesByHK.get(eid);
  }

  async getEntryById3(eid) {
    let e = this.entriesByHK.get(eid);
    if (e) return e;

    e = await this.db[this.dbschema].entries.findOne(eid);
    this.entriesByHK.set(eid, e);
    return e;
  }

  async getEntryBySenseId(sid) {
    const sense = await this.db[this.dbschema].senses.findOne(sid);
    return await this.db[this.dbschema].entries.findOne(sense.entry_id);
  }

  async getSynsets(db) {
    let synset_senses = await db.query(helper.getSynsetsQuery('WHERE s.synset_id IS NOT NULL'));
    synset_senses.forEach(s => s.gloss = prettifyString(s.gloss));
    let external_links = _.groupBy(await db[this.dbschema].synset_external_links.find({ link_type_id: 1}), 'synset_id');
    let relations = await this.getSynsetRelations(db);

    return _(synset_senses).groupBy('synset_id').map((senses, synset_id) => {
      return {
        synset_id, senses,
        sense_id: senses[0].sense_id,
        external_links: external_links[synset_id],
        relations: relations[synset_id]
      }
    }).value();
  }

  async getSynsetRelations(db) {
    let relations = await db.query(`
    SELECT rels.type_id AS rel_type_id,
           e.heading AS text,
           e.human_key,
           ps.order_no AS parent_order_no,
           rels.*
    FROM
      (SELECT r.synset_1_id AS synset_id,
              r.synset_2_id AS main_synset_id,
              r.id AS relation_id, *
       FROM dict.synset_relations r
       JOIN dict.senses s ON s.synset_id = r.synset_1_id
       UNION
       SELECT r.synset_2_id AS synset_id,
              r.synset_1_id AS main_synset_id,
              r.id AS relation_id, *
       FROM dict.synset_relations r
       JOIN dict.senses s ON s.synset_id = r.synset_2_id) rels
    LEFT JOIN dict.senses ps ON ps.id=rels.parent_sense_id
    JOIN entries e ON e.id=rels.entry_id`);

    let types = (await db[this.dbschema].synset_rel_types.find());

    relations = _(relations).groupBy('main_synset_id')
      .mapValues((s) => _(s).groupBy('relation_id')
        .mapValues((r) => ({senses: r, synset_id: r[0].synset_id}))
        .values()
        .groupBy((r) => {
            // let type = types[r.senses[0].rel_type_id - 1];
            let type = types.find(t => t.id === r.senses[0].rel_type_id);
            return (type.is_symmetric || r.senses[0].synset_1_id === r.senses[0].main_synset_id)
              ? helper.relation_types[type.name].text
              : helper.relation_types[type.name_inverse].text;
          })
        .value())
      .value();

    let gradsets = await this.getGradset(db);
    for (let g of gradsets) {
      for (let synset of g) {
        if (relations[synset.synset_id]) {
          relations[synset.synset_id]['Gradācijas jēdzienu grupa'] = g;
        } else {
          relations[synset.synset_id] = {'Gradācijas jēdzienu grupa': g};
        }
      }
    }

    for (let synset_id in relations) {
      relations[synset_id] = helper.orderRelations(relations[synset_id]);
    }

    return relations;
  }

  async getGradset(db) {
    let senses = await db.query(`
    SELECT ps.order_no AS parent_order_no,
           e.heading AS text,
           e.human_key,
           gradset_id,
           g.id AS attr_for_gradset_id,
           s.*
    FROM dict.senses s
    JOIN dict.synsets sy ON sy.id=s.synset_id
    LEFT JOIN dict.senses ps ON ps.id=s.parent_sense_id
    JOIN dict.entries e ON e.id=s.entry_id
    LEFT JOIN dict.gradsets g ON g.synset_id=s.synset_id
    WHERE gradset_id IS NOT NULL
      OR g.id IS NOT NULL
  `);
    return _(senses).groupBy('synset_id')
      .map((s) => ({
        senses: s,
        synset_id: s[0].synset_id,
        gradset_id: s[0].gradset_id || s[0].attr_for_gradset_id,
        display_info: s[0].attr_for_gradset_id !== null ? 'grupas nosaukums' : null
      }))
      .groupBy('gradset_id')
      .values()
      .value();
  }

}

let dbcache = null;

module.exports = async (app) => {
  if (!dbcache) {
    debug('initializing db cache...');
    dbcache = new DbCache(app);
    await dbcache.init(app);
  }
}
