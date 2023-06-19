const relation_types = {
  'synonym': {text: 'Aptuvenie sinonīmi', search: 'sinonīms'},
  'hyperonym': {text :'Hiperonīmi', search: 'hiperonīms'},
  'hyponym': {text: 'Hiponīmi', search: 'hiponīms'},
  'holonym': {text: 'Holonīmi', search: 'holonīms'},
  'meronym': {text: 'Meronīmi', search: 'meronīms'},
  'antonym': {text: 'Antonīmi', search: 'antonīms'},
  'gradset': {text: 'Gradācijas jēdzienu grupa', search: 'gradācijas jēdzienu grupa'},
  'also': {text: 'Saistīts ar', search: null},
  // pievienots pēc izmaiņām synset_rel_types tabulā:
  'hypernym': {text :'Hiperonīmi', search: 'hiperonīms'},
  'similar': {text: 'Aptuvenie sinonīmi', search: 'sinonīms'},
};


/**
 * Orders relations in the same order as in the relation_types variable
 * @param relations
 * @returns {{}}
 */
function orderRelations(relations) {
  return Object.values(relation_types).reduce(
    (obj, key) => {
      if (relations[key.text])
        obj[key.text] = {data: relations[key.text], search: key.search};
      return obj;
    },
    {}
  );
}

function getSynsetsQuery(where) {
  return `
    SELECT s.id AS sense_id,
           e.id AS entry_id,
           e.heading AS text,
           e.human_key,
           ps.order_no AS parent_order_no,
           s.order_no,
           s.gloss,
           s.synset_id,
           s.data
    FROM dict.senses s
    JOIN dict.entries e ON e.id = s.entry_id
    LEFT JOIN dict.senses ps ON ps.id = s.parent_sense_id
    ${where}`;
}

module.exports = {
  relation_types,

  orderRelations,

  getSynsetsQuery
};