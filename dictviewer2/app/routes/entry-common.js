const isPrimaryEntry = (entry) => {
  return [1, 5].includes(entry.type_id);
}

// TODO: tekstus ņemt no tipu tabulas
const relationForLexemeType = type_id => {
  switch (type_id) {
    case 1:
      return 'pamatleksēma šķirklī';
    case 4:
      return 'atvasinājums šķirklī';
    case 5:
      return 'rakstības variants šķirklī';
    case 6:
      return 'papildleksēma šķirklī';
    case 8:
      return 'saīsinājums šķirklī';
    case 9:
      return 'rakstības varianta atvasinājums šķirklī';
    default:
      return 'kaut kas šķirklī';
  }
}

// TODO: tekstus ņemt no tipu tabulas
const relationForSearchWordType = ({ word_type_id, target_type_id, target_subtype_id, inflected }) => {
  switch (target_type_id) {
    case 1: // entry
      switch (word_type_id) {
        case 1: // base
          return 'šķirkļvārds';
        case 4: // soundex
          return 'līdzīgi izrunājams';
        case 5: // maybeDerivative
          return 'atvasinājums no';
        case 6: // asciify
          return 'līdzīgi rakstāms';
        case 7: // lowercase
          return 'atšķirīgs burtu lielums';
        default:
          return 'cita līdzība ar';
      }

    case 2: // lexeme
      switch (word_type_id) {
        case 1:
          return `${inflected ? 'forma' : 'leksēma'} šķirklī`;
        case 4:
          return `līdzīgi skanošs kā ${inflected ? 'forma' : 'leksēma'} šķirklī`;
        case 5: // maybeDerivative
          return `atvasinājums no ${inflected ? 'formas' : 'leksēmas'} šķirklī`;
        case 6:
          return `līdzīgi rakstīts kā ${inflected ? 'forma' : 'leksēma'} šķirklī`;
        case 7:
          return `atšķirīgs burtu lielums ${inflected ? 'formai' : 'leksēmai'} šķirklī`;
        default:
          return `cita līdzība ar ${inflected ? 'formu' : 'leksēmu'} šķirklī`;
      }

  }
}

const relationForLDHit = code => {
  switch(code) {
    case 'ins':
      return 'iesprausts burts';
    case 'del':
      return 'izdzēsts burts';
    case 'ch1':
      return 'nomainīts burts';
    case 'swap':
      return 'vietām samainīti burti';
    default:
      return 'cita izmaiņa';
  }
}

/**
 * Iezīmē tos līdzīgos, kuri te ir ar vairākiem homonīmiem;
 * sakārto pēc human_key
 * @param {*} similars
 */
const prepareSimilars = similars => {
  if (!similars || similars.length === 0) return;
  let items = new Set();
  let items2 = new Set();
  for (let sm of similars) {
    let h = sm.entry.heading;
    if (items.has(h)) items2.add(h);
    items.add(h);
  }
  for (let sm of similars) {
    let h = sm.entry.heading;
    if (items2.has(h)) {
      sm.showIndex = true;
    }
  }
  similars.sort((a, b) => a.entry.human_key.localeCompare(b.entry.human_key, 'lv'));
}

module.exports = {
  isPrimaryEntry,
  relationForLexemeType,
  relationForSearchWordType,
  relationForLDHit,
  prepareSimilars,
}
