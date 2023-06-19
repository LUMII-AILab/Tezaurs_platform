const debug = require('debug')('queries');
const _ = require('lodash');

const {
  perform_validations,
} = require('./validate');

module.exports = {}

module.exports.q53 = async (db, dbschema) => {
  debug('q53 karogu validācijas');
  let codeResults = await perform_validations(db, dbschema);
  let _keys = Object.keys(codeResults);
  _keys.sort();
  return { results: codeResults, _keys };
}

// entry relations
module.exports.q64 = async (db, dbschema, type_id) => {
  // const baseQuery = `select * from ${dbschema}.entry_relations where type_id = ${type_id} order by id`;

  // const typeRow = await db.query(`select * from ${dbschema}.entry_rel_types where id = ${type_id};`)

  const typeConstraint = type_id ? `where r.type_id = ${type_id}` : '';
  const fullQuery = `select 
      r.id id,
      e1.id e1_id,
      e1.heading e1_heading,
      e1.human_key e1_human_key, 
      e2.id e2_id,
      e2.heading e2_heading,
      e2.human_key e2_human_key,
      t.name rel_type
    from ${dbschema}.entry_relations r 
    join ${dbschema}.entries e1 on e1.id = r.entry_1_id 
    join ${dbschema}.entries e2 on e2.id = r.entry_2_id 
    join ${dbschema}.entry_rel_types t on r.type_id = t.id
    ${typeConstraint}
    order by e1.heading, e2.heading, r.id`;

  const raw = await db.query(fullQuery);
  debug('result size', raw.length);
  if (raw.length > 0) {
    debug(raw[0]);
  }

  let results = raw.map(x => ({
    id: x.id,
    leftSide: {
      entityType: 'entry',
      id: x.e1_id,
      heading: x.e1_heading,
      human_key: x.e1_human_key,
    },
    rel_type: x.rel_type,
    rightSide: {
      entityType: 'entry',
      id: x.e2_id,
      heading: x.e2_heading,
      human_key: x.e2_human_key,
    }
  }));

  return results;
}

const prepareEntry = row => ({
  id: row.e_id,
  entityType: 'entry',
  heading: row.heading,
  human_key: row.human_key,
});

const prepareSense = row => ({
  id: row.s_id,
  entityType: 'sense',
  gloss: row.gloss,
  senseTag: row.ps_order_no ? `${row.ps_order_no}.${row.s_order_no}` : `${row.s_order_no}`,
  entry: prepareEntry(row),
});

const multiGroupBy = function (seq, keys) {
  if (!keys.length)
    return seq;
  const first = keys[0];
  const rest = keys.slice(1);
  return _.mapValues(_.groupBy(seq, first), value => multiGroupBy(value, rest));
};

// synsets
module.exports.q65 = async (db, dbschema) => {
  // const baseQuery = `select * from ${dbschema}.synsets yentry_relations where type_id = ${type_id} order by id`;
  // const typeRow = await db.query(`select * from ${dbschema}.entry_rel_types where id = ${type_id};`)

  const fullQuery = `select 
      s.synset_id id,
      e.id e_id,
      e.heading heading,
      e.human_key human_key, 
      s.gloss gloss,
      s.id s_id,
      s.order_no s_order_no,
      s.parent_sense_id ps_id,
      ps.order_no ps_order_no
    from ${dbschema}.senses s
    join ${dbschema}.entries e on s.entry_id = e.id
    left join ${dbschema}.senses ps on s.parent_sense_id = ps.id
    where s.synset_id is not null
    order by s.synset_id, e.heading, s.id`;

  const raw = await db.query(fullQuery);
  debug('result size', raw.length);
  if (raw.length > 0) {
    debug(raw[0]);
  }
  const bySynset = _.groupBy(raw, x => x.id);
  debug(`non-empty synsets: ${Object.keys(bySynset).length}`);

  let results = Object.keys(bySynset).map(y_id => ({
    synset: {
      id: y_id,
      entityType: 'synset',
      senses: bySynset[y_id].map(_s => prepareSense(_s))
        .sort((a, b) => a.entry.heading.localeCompare(b.entry.heading))
    },
    size: bySynset[y_id].length,
  }));

  results.sort((a, b) => { 
    if (b.size !== a.size) return b.size - a.size;
    return a.synset.senses[0].entry.heading.localeCompare(b.synset.senses[0].entry.heading);
  });

  return results;
}

// gradsets
module.exports.q67 = async (db, dbschema) => {
  const fullQuery = `select
    g.id g_id,
    y.id y_id,
    s.id s_id,
    s.gloss gloss,
    s.order_no s_order_no,
    ps.order_no ps_order_no,
    e.id e_id,
    e.heading heading,
    e.human_key human_key

    from ${dbschema}.gradsets g
    join ${dbschema}.synsets y on y.gradset_id = g.id
    join ${dbschema}.senses s on s.synset_id = y.id
    left join ${dbschema}.senses ps on s.parent_sense_id = ps.id
    join ${dbschema}.entries e on s.entry_id = e.id
    `;
  const raw = await db.query(fullQuery);
  debug('raw len:', raw.length);

  let results = Object.entries(_.groupBy(raw, x => x.g_id)).map(([ g_id, _g ]) => ({
    gradset: {
      id: g_id,
      entityType: 'gradset',
      synsets: Object.entries(_.groupBy(_g, x2 => x2.y_id)).map(([ y_id, _y ]) => ({
        id: y_id,
        entityType: 'synset',
        senses: _y.map(_s => prepareSense(_s))
          .sort((a, b) => a.entry.heading.localeCompare(b.entry.heading))
      }))
    },
    size: _g.length,
  }));

  const namesQuery = `select
    g.id g_id,
    ny.id ny_id,
    ns.id s_id,
    ns.gloss gloss,
    ns.order_no s_order_no,
    nps.order_no ps_order_no,
    ne.id ne_id,
    ne.heading heading,
    ne.human_key human_key
    
    from ${dbschema}.gradsets g
    left join ${dbschema}.synsets ny on g.synset_id = ny.id
    join ${dbschema}.senses ns on ns.synset_id = ny.id
    left join ${dbschema}.senses nps on ns.parent_sense_id = nps.id
    join ${dbschema}.entries ne on ns.entry_id = ne.id
    `;
  const namesRaw = await db.query(namesQuery);
  const namesMap = {}
  for (let [g_id, _g] of Object.entries(_.groupBy(namesRaw, x => x.g_id))) {
    namesMap[g_id] = {
      id: _g.ny_id,
      entityType: 'synset',
      senses: _g.map(_s => prepareSense(_s)),
    }
  }

  for (let row of results) {
    row.size = row.gradset.synsets.length;
    if (namesMap[row.gradset.id]) {
      row.name = namesMap[row.gradset.id];
    }
  }

  results.sort((a, b) => b.size - a.size);

  return results;
}

// synset relations
module.exports.q68 = async (db, dbschema, type_id) => {
  const typeConstraint = type_id ? `where r.type_id = ${type_id}` : '';
  const baseQuery = `select 
      r.id id,
      r.synset_1_id y_1_id,
      r.synset_2_id y_2_id,
      t.name rel_type,
      t.description rel_role_right,
      t.description_inverse rel_role_left
    from ${dbschema}.synset_relations r 
    join ${dbschema}.synset_rel_types t on r.type_id = t.id
    ${typeConstraint}
    order by r.id desc`;

    const raw = await db.query(baseQuery);
    debug('result size', raw.length);
    if (raw.length > 0) {
      debug(raw[0]);
    }

    const leftQuery = `select 
      r.id id,
      r.synset_1_id y_id,
      s.id s_id,
      s.gloss gloss,
      s.order_no s_order_no,
      ps.order_no ps_order_no,
      e.id e_id,
      e.heading heading,
      e.human_key human_key

    from ${dbschema}.synset_relations r 
    join ${dbschema}.senses s on s.synset_id = r.synset_1_id 
    left join ${dbschema}.senses ps on s.parent_sense_id = ps.id 
    join ${dbschema}.entries e on s.entry_id = e.id 
    ${typeConstraint}
  `;
  const rawLeft = await db.query(leftQuery);
  const resultsLeft = _.groupBy(rawLeft, x => x.id);

  const rightQuery = `select 
      r.id id,
      r.synset_2_id y_id,
      s.id s_id,
      s.gloss gloss,
      s.order_no s_order_no,
      ps.order_no ps_order_no,
      e.id e_id,
      e.heading heading,
      e.human_key human_key

    from ${dbschema}.synset_relations r 
    join ${dbschema}.senses s on s.synset_id = r.synset_2_id 
    left join ${dbschema}.senses ps on s.parent_sense_id = ps.id 
    join ${dbschema}.entries e on s.entry_id = e.id 
    ${typeConstraint}
  `;
  const rawRight = await db.query(rightQuery);
  const resultsRight = _.groupBy(rawRight, x => x.id);

  let results = [];
  for (const x of raw) {
    let rinda = {
      id: x.id,
      rel_roles: x.rel_role_left === x.rel_role_right ? x.rel_role_left : `${x.rel_role_left}:${x.rel_role_right}`
    }
    if (resultsLeft[x.id]) {
      rinda.leftSide = {
        id: x.y_1_id,
        entityType: 'synset',
        senses: resultsLeft[x.id].map(_s => prepareSense(_s))
          .sort((a, b) => a.entry.heading.localeCompare(b.entry.heading))
      }
    }
    if (resultsRight[x.id]) {
      rinda.rightSide = {
        id: x.y_2_id,
        entityType: 'synset',
        senses: resultsRight[x.id].map(_s => prepareSense(_s))
          .sort((a, b) => a.entry.heading.localeCompare(b.entry.heading))
      }
    }

    results.push(rinda);
  }

  return results;
}

// reused glosses
module.exports.q79 = async (db, dbschema) => {
  const fullQuery = `select 
    s.gloss,
    e.id e_id,
    e.heading heading,
    e.human_key human_key
  from ${dbschema}.senses s
  join ${dbschema}.entries e on s.entry_id = e.id
  where s.gloss is not null and length(s.gloss) > 0`;

  const raw = await db.query(fullQuery);
  debug('result size', raw.length);
  if (raw.length > 0) {
    debug(raw[0]);
  }
  const byGloss = _.groupBy(raw, x => x.gloss);
  debug(`non-empty sets: ${Object.keys(byGloss).length}`);

  let results = Object.keys(byGloss).map(gl => ({
    gloss: gl,
    entries: byGloss[gl].map(_s => prepareEntry(_s))
      .sort((a, b) => a.heading.localeCompare(b.heading)),
    size: byGloss[gl].length,
  }));
  results = results.filter(x => x.size > 1);

  results.sort((a, b) => {
    if (a.size !== b.size) {
      return b.size - a.size;
    }
    return a.gloss.localeCompare(b.gloss);
  });

  return results;
}

// sinonīmkopu ārējās saites
module.exports.q83 = async (db, dbschema) => {
  const baseQuery = `select
    r.id id, 
    r.url external_url,
    r.remote_id remote_id,
    coalesce(r.data->>'Relation', 'identity') relation,
    t.name ext_type,
    r.synset_id y_id
    from ${dbschema}.synset_external_links r 
    join ${dbschema}.external_link_types t on r.link_type_id = t.id
    order by relation, id`;
  const baseResults = await db.query(baseQuery);
  console.log(baseResults.length);

  const extQuery = `select
    r.id id,
    r.synset_id y_id,
    s.id s_id,
    coalesce(s.gloss, '') gloss,
    s.order_no s_order_no,
    ps.order_no ps_order_no,
    e.id e_id,
    e.heading heading,
    e.human_key human_key
 
    from ${dbschema}.synset_external_links r
    join ${dbschema}.senses s on s.synset_id = r.synset_id
    left join ${dbschema}.senses ps on s.parent_sense_id = ps.id
    join ${dbschema}.entries e on s.entry_id = e.id`;

  const rawResults = await db.query(extQuery);
  const groupedResults = _.groupBy(rawResults, x => x.id);
  console.log(Object.keys(groupedResults).length);

  let results = [];
  for (const x of baseResults) {
    if (!groupedResults[x.id]) continue;

    let rinda = {
      id: x.id,
      targetType: x.ext_type,
      relation: x.relation
    }

    rinda.rightSide = {
      entityType: 'link',
      url: x.external_url,
      slug: x.remote_id,
    }

    rinda.leftSide = {
      entityType: 'synset',
      id: x.y_id,
      senses: groupedResults[x.id].map(_s => prepareSense(_s))
        .sort((a, b) => a.entry.heading.localeCompare(b.entry.heading))
    }

    results.push(rinda);
  }
  console.log(results.length);
  console.log(JSON.stringify(results[0], null, 2));

  return results;
}

// sinseti, kam ir > 1 precīzā omw nozīme
module.exports.q85 = async (db, dbschema) => {
  const baseQuery = `select synset_id from synset_external_links where data is null and link_type_id = 1 group by synset_id having count(*) > 1`;
  const baseData = await db.query(baseQuery);

  if (!baseData || baseData.length === 0) {
    return [];
  }

  const remoteQuery = `select
    id, 
    synset_id,
    url external_url,
    remote_id
    from ${dbschema}.synset_external_links
    where synset_id in (${baseQuery})`;
  const remoteRows = await db.query(remoteQuery);
  const resultsRight = _.groupBy(remoteRows, x => x.synset_id);

  const synsetQuery = `select
    s.id s_id,
    s.synset_id synset_id,
    s.gloss gloss,
    s.order_no s_order_no,
    ps.id ps_id,
    ps.order_no ps_order_no,
    e.id e_id,
    e.heading heading,
    e.human_key human_key

    from ${dbschema}.senses s
    left join ${dbschema}.senses ps on s.parent_sense_id = ps.id 
    join ${dbschema}.entries e on s.entry_id = e.id
    where s.synset_id in (${baseQuery})`;
  const synsetRows = await db.query(synsetQuery);
  const resultsLeft = _.groupBy(synsetRows, x => x.synset_id);

  const results = [];
  for (const x of baseData) {
    let synset_id = x.synset_id;
    let rinda = {
      id: synset_id
    }

    if (resultsLeft[synset_id]) {
      rinda.leftSide = {
        id: synset_id,
        entityType: 'synset',
        senses: resultsLeft[synset_id].map(_s => prepareSense(_s))
          .sort((a, b) => a.entry.heading.localeCompare(b.entry.heading)),
      }
    }

    if (resultsRight[synset_id]) {
      rinda.rightSide = resultsRight[synset_id].map(_r => ({
        entityType: 'link',
        url: _r.external_url,
        slug: _r.remote_id,
      }))      
    }

    results.push(rinda);
  }

  console.log(results.length);
  console.log(JSON.stringify(results[0], null, 2));

  return results;
}

// vairākiem dažādiem sinsetiem ar precīzo OMW saiti ir pievilkts tas pats prinstonas ids
module.exports.q86 = async (db, dbschema) => {
  const baseQuery = `select remote_id from synset_external_links where data is null and link_type_id = 1 group by remote_id having count(*) > 1`;
  const baseData = await db.query(baseQuery);

  if (!baseData || baseData.length === 0) {
    return [];
  }

  const remoteQuery = `select
    id, 
    synset_id,
    url external_url,
    remote_id
    from ${dbschema}.synset_external_links
    where remote_id in (${baseQuery})`;
  const remoteRows = await db.query(remoteQuery);
  const resultsRight = _.groupBy(remoteRows, x => x.remote_id);

  const synsetQuery = `select
    l.remote_id,
    s.id s_id,
    s.synset_id synset_id,
    s.gloss gloss,
    s.order_no s_order_no,
    ps.id ps_id,
    ps.order_no ps_order_no,
    e.id e_id,
    e.heading heading,
    e.human_key human_key

    from ${dbschema}.synset_external_links l
    join ${dbschema}.senses s on l.synset_id = s.synset_id
    left join ${dbschema}.senses ps on s.parent_sense_id = ps.id 
    join ${dbschema}.entries e on s.entry_id = e.id

    where l.remote_id in (${baseQuery})`;

  const synsetRows = await db.query(synsetQuery);
  const resultsLeft = multiGroupBy(synsetRows, ['remote_id', 'synset_id']);

  const results = [];
  for (const x of baseData) {
    let remote_id = x.remote_id;
    let rinda = {
      id: remote_id
    }

    if (resultsLeft[remote_id]) {
      rinda.leftSide = Object.entries(resultsLeft[remote_id]).map(([synset_id, rows]) => ({
        id: synset_id,
        entityType: 'synset',
        senses: rows.map(_s => prepareSense(_s))
          .sort((a, b) => a.entry.heading.localeCompare(b.entry.heading)),
      }));
    }

    let remoteRow = resultsRight?.[remote_id]?.[0];
    if (remoteRow) {
      rinda.rightSide = {
        entityType: 'link',
        url: remoteRow.external_url,
        slug: remoteRow.remote_id,
      }
    }

    results.push(rinda);
  }

  console.log(results.length);
  console.log(JSON.stringify(results[0], null, 2));

  return results;


}
