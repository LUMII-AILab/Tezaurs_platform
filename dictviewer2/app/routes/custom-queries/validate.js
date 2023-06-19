const _ = require('lodash');
const color = require('ansi-colors');

const debug = require('debug')('flags');

// process.env.ENV_NAME = 'tezaurs_dv';
// const config = require('../../config-pgp');
const config = require('../../config');

const dbschema = process.env.DB_SCHEMA;

const TABLES = [
    'entries',
    'senses',
    'lexemes',
    'examples',
];

let DO_FLAG_VALIDATIONS;
let DO_SR_VALIDATIONS;
let DO_DATA_VALIDATIONS;

DO_FLAG_VALIDATIONS = true;
DO_SR_VALIDATIONS = true;
DO_DATA_VALIDATIONS = true;

let SR_RESTRICTION_TYPES;
let SR_RESTRICTION_FREQUENCIES;
let FLAGS;

let ENTRY_ID_TO_ENTRY;
let SENSE_ID_TO_ENTRY_ID;

let GROUPED_MESSAGES;

let n_flags = 0;
let n_sr = 0;

const entity_to_entry = (t, e) => {
  switch(t) {
    case 'senses':
    case 'senses-restrictions':
      return ENTRY_ID_TO_ENTRY.get(e.entry_id);
    case 'lexemes':
    case 'lexemes-restrictions':
      return ENTRY_ID_TO_ENTRY.get(e.entry_id);
    case 'examples':
    case 'examples-restrictions':
      if (e.entry_id) {
        return ENTRY_ID_TO_ENTRY.get(e.entry_id);
      } else {
        return ENTRY_ID_TO_ENTRY.get(SENSE_ID_TO_ENTRY_ID.get(e.sense_id));
      }
    case 'entries':
    case 'entries-restrictions':
      return e;
  }
}

const describe_entity = (t, e) => {
    switch(t) {
        case 'senses':
            return `sense '${e.gloss}' (${e.id}), entry ${ENTRY_ID_TO_ENTRY.get(e.entry_id).human_key} (${e.entry_id})`;
        case 'lexemes':
            return `lexeme '${e.lemma}' (${e.id}), entry ${ENTRY_ID_TO_ENTRY.get(e.entry_id).human_key} (${e.entry_id})`;
        case 'examples':
            if (e.entry_id) {
                return `example '${e.content}' (${e.id}), entry ${ENTRY_ID_TO_ENTRY.get(e.entry_id).human_key} (${e.entry_id})`;
            } else {
                return `example '${e.content}' (${e.id}), @ sense @ ${describe_entity('entries', ENTRY_ID_TO_ENTRY.get(SENSE_ID_TO_ENTRY_ID.get(e.sense_id)))}`;
            }
        case 'entries':
            return `entry ${e.human_key} (${e.id} - '${e.heading}')`;

        case 'senses-restrictions':
            return `sense (restrictions) '${e.gloss}' (${e.id}), entry ${ENTRY_ID_TO_ENTRY.get(e.entry_id).human_key} (${e.entry_id})`;
        case 'lexemes-restrictions':
            return `lexeme (restrictions) '${e.lemma}' (${e.id}), entry ${ENTRY_ID_TO_ENTRY.get(e.entry_id).human_key} (${e.entry_id})`;
        case 'examples-restrictions':
            if (e.entry_id) {
                return `example (restrictions) '${e.content}' (${e.id}), entry ${ENTRY_ID_TO_ENTRY.get(e.entry_id).human_key} (${e.entry_id})`;
            } else {
                return `example (restrictions) '${e.content}' (${e.id}), @ sense @ ${describe_entity('entries', ENTRY_ID_TO_ENTRY.get(SENSE_ID_TO_ENTRY_ID.get(e.sense_id)))}`;
            }
        case 'entries-restrictions':
            return `entry (restrictions) ${e.human_key} (${e.id} - '${e.heading}')`;
    }
    return t;
}

const report = (grp, t, ent) => {
  const ident = describe_entity(t, ent);
  const entry = entity_to_entry(t, ent);

  const cgrp = color.unstyle(grp);
  const cident = color.unstyle(ident);

  if (!GROUPED_MESSAGES[cgrp]) {
      GROUPED_MESSAGES[cgrp] = [];
  }
  GROUPED_MESSAGES[cgrp].push({slug: cident, entity: t, human_key: entry.human_key, heading: entry.heading });
}

const validate_flag_value = (t, ent, f, v) => {
    if (FLAGS[f].permitted_values === 'F') return;

    if (!FLAGS[f].values.includes(v)) {
        if (!FLAGS[f].deprecated_values.includes(v)) {
            report(`pavisam nederīga karoga vērtība: '${f}': '${v}'`, t, ent);
        } else {
            report(`novecojusi karoga vērtība: '${f}': '${v}'`, t, ent);
        }

    }
}

const format_flag_value = v => {
    if (Array.isArray(v)) return `[${v.join(', ')}]`;
    return v;
}

const validate_flags = (t, ent, ff) => {
    if (DO_FLAG_VALIDATIONS) {
        for (const f of Object.keys(ff)) {
            if (!FLAGS[f]) {
                report(color.red(`nepazīstams karogs '${f} : ${format_flag_value(ff[f])}'`), t, ent);
                continue;
            }
            if (FLAGS[f].is_deprecated) {
                if (FLAGS[f].permitted_values === 'F') {
                    report(color.yellow(`izmantots novecojis karogs '${f}'`), t, ent);
                } else {
                    report(color.yellow(`izmantots novecojis karogs '${f} : ${format_flag_value(ff[f])}'`), t, ent);
                }
            }
            let scopeLetter = t === 'entries' ? 'E' : t === 'senses' ? 'S' : t === 'lexemes' ? 'L' : t === 'examples' ? 'X' : 'R';
            if (!FLAGS[f].scope.includes(scopeLetter)) {
                report(color.red(`karogs neatļautā vietā: '${f}' @ '${t}'`), t, ent);
            }

            const vv = ff[f];
            if (Array.isArray(vv)) {
                if (!FLAGS[f].is_multiple) {
                    if (vv.length > 1) {
                        report(color.red(`skalāram karogam masīvs > 1, '${f} : ${format_flag_value(vv)}'`), t, ent);
                    } else {
                        report(color.yellow(`skalāram karogam masīvs = 1, '${f} : ${format_flag_value(vv)}'`), t, ent);
                    }
                }
                for (const v of vv) {
                    validate_flag_value(t, ent, f, v);
                }
            } else {
                if (FLAGS[f].is_multiple) {
                    report(color.red(`masīva karogam skalārs saturs : '${f} : ${vv}'`), t, ent);
                }
                validate_flag_value(t, ent, f, vv);
            }
        }
    }

    n_flags += 1;
}

const validate_simple_sr = (t, ent, sr) => {
    if (DO_SR_VALIDATIONS) {
        let srf = sr.Frequency;
        if (srf && !SR_RESTRICTION_FREQUENCIES.includes(srf)) {
            report(color.red(`neatļauta SR biežuma vērtība '${srf}'`), t, ent);
        }

        let srt = sr.Restriction;
        if (srt && !SR_RESTRICTION_TYPES.includes(srt)) {
            report(color.red(`neatļauta SR tipa vērtība '${srt}'`), t, ent);
        }

        let srflags = sr.Value && sr.Value.Flags;
        if (srflags) {
            validate_flags(`${t}-restrictions`, ent, srflags);
        }

        let srLM = sr.Value && sr.Value.LanguageMaterial;
        if (srLM && !Array.isArray(srLM)) {
            report(color.red(`valodas materiāls, kas nav saraksts: '${srLM}'`), t, ent);
        }

        if (!srflags && !srLM) {
            if (srt !== 'Vispārīgais lietojuma biežums'
                && srt !== 'Vārddarināšana (sastāvdaļa)'
                && srt !== 'Vārddarināšana (rezultāts)') {
                    report(color.red(`nav ne karogu, ne valodas materiāla`), t, ent);
                }
        }
    }

    n_sr += 1;
}

const validate_sr = (t, ent, sr) => {
    if (sr.AND) {
        for (const sr2 of sr.AND) {
            validate_sr(t, ent, sr2);
        }
    } else if (sr.OR) {
        for (const sr2 of sr.OR) {
            validate_sr(t, ent, sr2);
        }
    } else if (sr.NOT) {
        validate_sr(t, ent, sr.NOT);
    } else {
        validate_simple_sr(t, ent, sr);
    }
}

const validate_data = (t, ent, data) => {
    if (DO_DATA_VALIDATIONS) {

    }
}

const numeral_ending = (n, singular_obj, plural_obj) => {
  if (n % 10 === 1 && n !== 11) return `${n} ${singular_obj}`;
  return `${n} ${plural_obj}`;
}

const init = async () => {
  GROUPED_MESSAGES = {};
  if (FLAGS) return;

  try {
    // const db = config.db;
    const db = (await config.dbconn).instance;

    FLAGS = {};
    const gf = await db.many(`select * from ${dbschema}.grammar_flags`)
    for (const x of gf) {
        FLAGS[x.name] = x;

        let gfv;
        if (x.permitted_values.includes('E')) {
            try {
              gfv = await db.many(`select * from ${dbschema}.grammar_flag_values where flag_id = $1`, [x.id]);
            } catch (e) {
              gfv = [];
            }
            FLAGS[x.name].values = Array.from(gfv.filter(z => !z.is_deprecated), y => y.value);
            FLAGS[x.name].deprecated_values = Array.from(gfv.filter(z => z.is_deprecated), y => y.value);
        }
    }
    console.log(`ielādēti ${Object.keys(FLAGS).length} karogi`);

    let entries_temp = await db.many(`select * from ${dbschema}.entries`);
    ENTRY_ID_TO_ENTRY = new Map();
    // console.log(entries_temp.length);
    for (const x of entries_temp) {
        ENTRY_ID_TO_ENTRY.set(x.id, x);
    }
    console.log(`ielādēti ${entries_temp.length} šķirkļu numuri`)
    entries_temp = null;

    let senses_temp = await db.many(`select * from ${dbschema}.senses`);
    SENSE_ID_TO_ENTRY_ID = new Map();
    for (const x of senses_temp) {
        SENSE_ID_TO_ENTRY_ID.set(x.id, x.entry_id);
    }
    console.log(`ielādēti ${senses_temp.length} nozīmju numuri`)
    senses_temp = null;

    // console.log(FLAGS);

    const grt = await db.many(`select * from ${dbschema}.grammar_restriction_types`);
    // console.log(grt.length);
    SR_RESTRICTION_TYPES = Array.from(grt, x => x.caption);
    // console.log(SR_RESTRICTION_TYPES);
    console.log(`ielādēti ${SR_RESTRICTION_TYPES.length} ierobežojumu veidi`);

    const grf = await db.many(`select * from ${dbschema}.grammar_restriction_frequencies`);
    // console.log(grf.length);
    SR_RESTRICTION_FREQUENCIES = Array.from(grf, x => x.caption);
    console.log(`ielādēti ${SR_RESTRICTION_FREQUENCIES.length} ierobežojumu biežumi`)
  } catch (err) {

  }
}

const clear = () => {
  FLAGS = null;
  ENTRY_ID_TO_ENTRY = null;
  SENSE_ID_TO_ENTRY_ID = null;
  SR_RESTRICTION_TYPES = null;
  SR_RESTRICTION_FREQUENCIES = null;
}

const perform_validations = async () => {
    try {
        // const db = config.db;
        const db = (await config.dbconn).instance;
        await init();

        for (const TABLE of TABLES) {
            console.log(color.green(`\nIelasām tabulu ${TABLE} ...`));
            const rows = await db.many(`select * from ${dbschema}.${TABLE} where data is not null`);
            console.log(color.green(`Apstrādājam tabulu ${TABLE} (${numeral_ending(rows.length, 'rinda', 'rindas')} ar datiem)\n`));

            for (let r of rows) {
                if (!r.data) continue;

                const f = r.data.Gram && r.data.Gram.Flags;
                if (f) {
                    validate_flags(TABLE, r, f);
                }

                const sr = r.data.Gram && r.data.Gram.StructuralRestrictions;
                if (sr) {
                    validate_sr(TABLE, r, sr);
                }

                validate_data(TABLE, r, r.data);
            }
        }
        console.log(n_flags, n_sr);

        // clear();

        if (!_.isEmpty(GROUPED_MESSAGES)) {
          return GROUPED_MESSAGES;
        }
        return {};

  } catch(err) {
    console.error(err)
    return {};
  }
}

module.exports = {
  perform_validations,
}
