const debug = require('debug')('morpho-utils');

const { fetchInflections } = require('./api-utils');

const { MorphologyTables } = require('./morphologytables');

const buildInflmisc = (givenParadigm, paradigmData, flags, structuralRestrictions) => {
  const inflmiscParts = [];

  let fl = flags || {};
  let pd = paradigmData || {};
  let sr = structuralRestrictions || {};

  let dzimte;
  let skaitlis;

  let SI = fl['Leksēmas pamatformas īpatnības'] || fl['Šķirkļavārda īpatnības'] || []; // š.ī. ir deprecated
  if (!Array.isArray(SI)) SI = [SI];  // FIXME: pagaidu hack kardinalitāšu izmaiņu dēļ

  // Skaitlis
  if (flags && flags['Lietvārda tips'] === 'Īpašvārds' && flags['Īpašvārda veids'] === 'Vietvārds') {
    skaitlis = 'Vienskaitlis';  // Rīga utt. lai nav daudzskaitļu, pēc https://github.com/PeterisP/morphology/issues/101
  }
  if (sr && sr["Restriction"] === 'Formā/atvasinājumā' && (!sr["Frequency"] || sr["Frequency"] === 'Tikai')
      && sr["Value"] && sr["Value"]["Flags"] && sr["Value"]["Flags"]["Skaitlis"] === "Vienskaitlis") {
    skaitlis = 'Vienskaitlis'; 
  }
  if (SI.includes('Daudzskaitlis')) {
    skaitlis = 'Daudzskaitlis';
  } else if (SI.includes('Vienskaitlis')) {
    skaitlis = 'Vienskaitlis';
  }

  if (skaitlis) inflmiscParts.push(skaitlis);

  // Dzimte
  if (SI.includes('Sieviešu dzimte')) { // SI dzimte ir stiprāka par Dzimte dzimti
    dzimte = 'Sieviešu_dzimte';
  } else if (fl.Dzimte === 'Sieviešu') {
    dzimte = 'Sieviešu_dzimte';
  } else if (fl.Dzimte === 'Vīriešu') {
    dzimte = 'Vīriešu_dzimte';
  }
  if (dzimte) inflmiscParts.push(dzimte);

  // noliegtie verbi
  if (sr && sr["Restriction"] === 'Formā/atvasinājumā' && (!sr["Frequency"] || sr["Frequency"] === 'Tikai')
      && sr["Value"] && sr["Value"]["Flags"] && sr["Value"]["Flags"]["Noliegums"] === "Jā") {
    inflmiscParts.push('Noliegums');
  }

  if (inflmiscParts.length > 0) return inflmiscParts.join(',');
  return null;
}

const getMorphoData = async (word, givenParadigm, paradigmData, stem1, stem2, stem3, flags, sr) => {
  // M: pirmos 3 nevajagot (tos nosedz vairākas paradigmas pie vienas leksēmas)
  // var cogender = false;
  // var secondThirdConj = false;
  // var optSoundChange = false;

  // 2)
  // var multiInflCompound = false;
  // e.g., "vecāmāte"
  // flags datos:
  // "Citi":["Vairākos punktos lokāms saliktenis"]
  const multiInflCompound = flags && flags["Citi"] && flags["Citi"].includes("Vairākos punktos lokāms saliktenis");

  // šo vairs nevajag, jo datos jau ir vairākas paradigmas, ja tas nepieciešams
  // var paradigms = multiParadigm(givenParadigm, cogender, optSoundChange, secondThirdConj);

  // FOR NOW: just ignore and to not inflect compounds that must
  //          be inflected in multiple points.
  // TODO: find something starting with "Šablons_salikteņa_vairākpunktu_locīšanai="
  //       in the inflmisc, and use pattern given there to obtain
  //       correct inflection table.
  // PROBLEM: morphology service currently do not support multipoint
  //          inflection.

  if (multiInflCompound) paradigms = [];

  const inflmisc = buildInflmisc(givenParadigm, paradigmData, flags, sr);

  let morphoData;
  try {
    morphoData = await fetchInflections(word, givenParadigm, stem1, stem2, stem3, inflmisc);
    
    if (!morphoData || morphoData.length === 0 || morphoData[0].length === 0) {
      debug('morpho API atgrieza tukšu rezultātu', morphoData);
      return null;
    }
    return morphoData;

  } catch(err) {
    console.log('error fetching inflections', morphoData);
    throw err;
  }

}

const buildMorphoTableFromData = (morphoData, word, givenParadigm, paradigmData, stem1, stem2, stem3, flags, sr) => {
  if (!morphoData || morphoData.length === 0 || morphoData[0].length === 0) return null;

  // pēdējiem 2 ir jāskatās karodziņos (skat. piezīmes)

  // 1)
  // var pluralEntryWord = false;
  // e.g., "ļaudis"
  // flags datos:
  // "Lieto tikai noteiktā formā\/atvasinājumā":["Daudzskaitlis"]

  var numbers_vsk = [['Vienskaitlis','Vsk.']];
  var numbers_dsk = [['Daudzskaitlis','Dsk.']];
  var numbers_2 = [['Vienskaitlis','Vsk.'], ['Daudzskaitlis','Dsk.']];

  var numbers = numbers_2;

  // const pluralEntryWord = flags && flags["Lieto tikai noteiktā formā\/atvasinājumā"] && flags["Lieto tikai noteiktā formā\/atvasinājumā"].includes("Daudzskaitlis");
  // TODO: izveidot kaut kādu mini API darbam ar SR
  if (sr && sr.Frequency === 'Tikai' && sr.Restriction === 'Formā/atvasinājumā' &&
        sr.Value && sr.Value.Flags && (sr.Value.Flags['Skaitlis'] || []).includes('Daudzskaitlis'))
    numbers = numbers_dsk;

  if (flags && flags['Morfotabulas attēlošana'] && flags['Morfotabulas attēlošana'] === 'Nerādīt vienskaitli')
    numbers = numbers_dsk;

  if (flags && flags['Morfotabulas attēlošana'] && flags['Morfotabulas attēlošana'] === 'Nerādīt daudzskaitli')
    numbers = numbers_vsk;

  var show_vocative = false;
  if (flags && flags['Morfotabulas attēlošana'] && flags['Morfotabulas attēlošana'] === 'Rādīt vokatīvu')
    show_vocative = true;


  const inflections = morphoData[0];
  const formattedInflections = MorphologyTables.formatInflections(inflections, givenParadigm, numbers, false, show_vocative);
  return formattedInflections;
}

const buildMorphoTable = async (word, givenParadigm, paradigmData, stem1, stem2, stem3, flags, sr) => {

  // if (!givenParadigm || givenParadigm <= 0) return null;
  if (!givenParadigm) return null;

  let morphoData;

  try {
    morphoData = await getMorphoData(word, givenParadigm, paradigmData, stem1, stem2, stem3, flags, sr);
    if (!morphoData) return null;

    return buildMorphoTableFromData(morphoData, word, givenParadigm, paradigmData, stem1, stem2, stem3, flags, sr);

  } catch(err) {
    console.log('error building morphotable', morphoData);
    throw err;
  }
}

/**
 * Aprisinājums salūzušām locīšanas tabulām
 *
 * @param {*} lex Leksēma
 * @returns true, ja leksēmas karogi rāda, ka morfoloģija dos sliktu tabulu
 */
const doNotBuildMorphoTableIfEverythingIsBroken = (lex) => {
  if (lex.data && lex.data.Gram && lex.data.Gram.Flags && lex.data.Gram.Flags['Šablons salikteņa vairākpunktu locīšanai']) {
    return true;
  }
  return false;
}

module.exports = {
  getMorphoData,
  buildMorphoTableFromData,
  buildMorphoTable,
  doNotBuildMorphoTableIfEverythingIsBroken,
};
