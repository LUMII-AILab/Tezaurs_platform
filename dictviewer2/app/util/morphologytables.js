const debug = require('debug')('morpho-table');

// backend-am nedaudz pielāgots kods no frontend morphologytables.js


var MorphologyTables = function() {
    var cases_without_vocative = [['Nominatīvs','Nom.'], ['Ģenitīvs','Ģen.'], ['Datīvs','Dat.'], ['Akuzatīvs','Akuz.'], ['Lokatīvs','Lok.']];
    var cases_vocative = [['Nominatīvs','Nom.'], ['Ģenitīvs','Ģen.'], ['Datīvs','Dat.'], ['Akuzatīvs','Akuz.'], ['Lokatīvs','Lok.'], ['Vokatīvs','Vok.']];
    var numbers_n = [['Nepiemīt','']];
    var numbers_2 = [['Vienskaitlis','Vsk.'], ['Daudzskaitlis','Dsk.']];
    var numbers_3 = [['Vienskaitlis','Vsk.'], ['Daudzskaitlis','Dsk.'], ['Nepiemīt','']];
    var defs_all = [['Nenoteiktā','Nenot.'], ['Noteiktā','Not.']];
    var genders_all = [['Vīriešu','Vīr.'], ['Sieviešu','Siev.']];
    var tenses = [['Tagadne','Tag.'], ['Pagātne','Pag.'], ['Nākotne','Nāk.']];

    var LONG = 0;
    var SHORT = 1;

    function add_word(words, key, value) {
        var previous_value = words[key];
        if (!previous_value)
            words[key] = value;
        else if (previous_value != value && !(previous_value.substr(-(value.length+1)) === ' '+value) && previous_value.indexOf(value+', ') === -1) {
            words[key] = previous_value + ', ' + value;
        }
    }

    function formatInflections(data, paradigmMMM, numbers, secondThirdConj, showVocative) {
        // if (paradigmMMM === 0) {
        if (!paradigmMMM) {
            return null;
        }

        // Papriekšu papildinam vārdus ar lietojuma paskaidrojumu - laukā kur ir pati vardforma pierakstam klāt span ar, piemēram, (Reti)
        for (var i = 0; i < data.length; i++) {
            if (data[i]['Lietojums'] || data[i]['Lietojuma biežums']) {
                label = '';
                if (data[i]['Lietojums'])
                    label = data[i]['Lietojums'].toLowerCase();
                if (data[i]['Lietojuma biežums']) {
                    if (label)
                        label += ', ';
                    label = data[i]['Lietojuma biežums'].toLowerCase();
                }
                data[i]['Vārds'] = data[i]['Vārds'] + '<span class="dict_MorphoTable_usage"> (' + label + ')</span>';
            }
        }

        // if ((paradigmMMM >= 1 && paradigmMMM <= 11) || (paradigmMMM >= 31 && paradigmMMM <= 35) || paradigmMMM === 44 || paradigmMMM === 47 || paradigmMMM === 48) { // Declinable nouns
        if (paradigmMMM.startsWith('noun-') && !['noun-0', 'noun-g'].includes(paradigmMMM)) { // Declinable nouns
          var gender = data[0]['Dzimte'].toLowerCase();
          var decl = data[0]['Deklinācija'];
          var morph = 'Lietvārds, ' + gender + ' dzimte, ';
          if (/^\d+$/.test(decl)) morph = morph + decl + '. deklinācija';
          else morph = morph + ' deklinācija: ' + decl.toLowerCase();
          var table = '<div class="items">' + formatNoun(data, numbers, showVocative) + '</div>';
          return { summary: morph, table: table };
        }

        // 12 - nelokāmie lietvārdi, kurus attiecīgi neloka

        // if (paradigmMMM === 13 || paradigmMMM === 14) { // Adjectives
        if (paradigmMMM.startsWith('adj-')) { // Adjectives
            var morph = 'īpašības vārds';
            var table = '<div class="items">' +
                            formatAdjective(data, 'Pamata') +
                            formatAdjective(data, 'Pārākā') +
                            formatAdjective(data, 'Vispārākā') +
                        '</div>';
            return { summary: morph, table: table };
        }

        // if (paradigmMMM === 42) { // Adjectives
        if (paradigmMMM === 'part-1') { // Adjectives
            var morph = 'adjektivizējies darāmās kārtas pagātnes divdabis';
            var table = '<div class="items">' +
                            formatAdjective(data, 'Pamata') +
                            formatAdjective(data, 'Pārākā') +
                            formatAdjective(data, 'Vispārākā') +
                        '</div>';
            return { summary: morph, table: table };
        }

    	// if (paradigmMMM === 43) { // Adjectives
    	if (paradigmMMM === 'part-2') { // Adjectives
            var morph = 'adjektivizējies darāmās kārtas pagātnes divdabis';
            var table = '<div class="items">' +
                            formatAdjective(data, 'Pamata', true) +
                        '</div>';
            return { summary: morph, table: table };
        }

        // if (paradigmMMM === 52 || paradigmMMM == 53) { // -dams/-dama
        if (paradigmMMM === 'part-3' || paradigmMMM === 'part-4') { // -dams/-dama
            var morph = 'patstāvīgs daļēji lokāmais divdabis';
            var table = '<div class="items">' +
                            formatParticiple(data) +
                        '</div>';
            return { summary: morph, table: table };
        }


    	// if (paradigmMMM === 30) { // Adjectives
    	if (paradigmMMM === 'adjdef-m') { // Adjectives
            var morph = 'substantivizējies īpašības vārds, pamata pakāpe, noteiktā galotne, vīriešu dzimte';
            var table = '<div class="items">' +
    						formatNoun(data, null, showVocative) +
                        '</div>';
            return { summary: morph, table: table };
        }

    	// if (paradigmMMM === 40 || paradigmMMM === 41) { // Adjectives
    	if (paradigmMMM === 'adjdef-f1' || paradigmMMM === 'adjdef-f2') { // Adjectives
            var morph = 'substantivizējies īpašības vārds, pamata pakāpe, noteiktā galotne, sieviešu dzimte';
            var table = '<div class="items">' +
    						formatNoun(data, null, showVocative) +
                        '</div>';
            return { summary: morph, table: table };
        }


        // if (paradigmMMM >= 15 && paradigmMMM <= 20 || paradigmMMM === 45 || paradigmMMM === 46 || paradigmMMM === 50) { // Verbs, non-reflexive and reflexive
        if (paradigmMMM.startsWith('verb-')) { // Verbs, non-reflexive and reflexive
            var conj = data[0]['Konjugācija'];
            if (!conj || conj === 'Nekārtns') conj = 'nekārtns'
            else if (secondThirdConj) conj = '2. un 3. konjugācija'
            else conj = conj + '. konjugācija';

            // hack - atgriezeniskuma detektēšana pēc -šanās formas pazīmes. TODO - izmainīt webservisu, lai to pasaka pie verba formām.
            var atgriezeniskums = '';
            for (var i = 0; i < data.length; i++) {
                if (data[i]['Deklinācija'] === 'Atgriezenisks')
                    atgriezeniskums = ', atgriezenisks';
            }
            var morph = 'darbības vārds, ' + conj + atgriezeniskums;
            var table = '<div class="items">' + formatVerb(data, paradigmMMM) +  '</div>';
            return { summary: morph, table: table };
        }

        // 21 - apstākļa vārdi, nelokāmi

        // if ((paradigmMMM >= 22 && paradigmMMM <= 24) || (paradigmMMM == 29 && data[0] && data[0]['Vārdšķira'] == 'Skaitļa vārds')) { // Numeral
        if (['ord', 'card-1', 'card-2'].includes(paradigmMMM) || (paradigmMMM === 'hardcoded' && data[0] && data[0]['Vārdšķira'] === 'Skaitļa vārds')) { // Numeral
            var noteiktiiba = '';
            if (data[0]['Noteiktība'] === 'Noteiktā') noteiktiiba = ', noteiktais';
            if (data[0]['Noteiktība'] === 'Nenoteiktā') noteiktiiba = ', nenoteiktais';

            var morph = 'skaitļa vārds' + noteiktiiba;

            var singular = false;
            var plural = false;
            for (var i = 0; i < data.length; i++) {
                if (data[i]['Skaitlis'] === 'Vienskaitlis') singular = true;
                if (data[i]['Skaitlis'] === 'Daudzskaitlis') plural = true;
            }
            var table;
            if (singular && plural) {
                table = '<div class="items">' + formatNumber(data) + '</div>';
            } else {
                table = '<div class="items">' + formatNumberOnePlurality(data) + '</div>';
            }
            return { summary: morph, table: table };
        }

        // if (paradigmMMM === 25) { // Pronouns
        if (paradigmMMM === 'pron') { // Pronouns
            var morph = 'Vietniekvārds';
            var table;
            if (data && data[0]['Skaitlis'] === 'Nepiemīt') {
                table = '<div class="items">' + formatNoun(data, numbers_n, showVocative) + '</div>';
            } else {
                table = '<div class="items">' + formatNoun(data, numbers, showVocative) + '</div>';
            }
            return { summary: morph, table: table };
        }

        // 26-29 - nelokāmās vārdu grupas

        return null; // ja nesaprotam, tad nerādam neko lai nav teksts kas ir masīvi no objektiem
    }

    function formatNoun(data, numbers, showVocative) {
        var words = {};

        for (var i = 0; i < data.length; i++) {
    		var item = data[i];
    		var key = item['Skaitlis'] + '-' + item['Locījums'];
    		var value = item['Vārds'];
            add_word(words, key, value);
        }

        return formatNumCaseTable(words, null, null, true, numbers, showVocative);
    }

    // Tabula skaitļu-locījumu kombinācijām
    function formatNumCaseTable(words, caption, prefix, tags, numbers, showVocative) {
        var result = '<table class="inflections"><thead>';
        if (!numbers) numbers = numbers_2;	

        if (caption != null) {
            result += '<tr>';
            if (tags) {
                result += '<th>&nbsp;</th>';
            }
            result += '<th colspan="2"><div class="sub-title">' + caption + '</div></th></tr>';
        }

        result += '<tr>';

        if (tags) {
            result += '<th class="case-indent">&nbsp;</th>';
        }

        for (var num = 0; num < numbers.length; num++) {
            result += '<th>' + numbers[num][SHORT] + '</th>';
        }

        result += '</tr></thead><tbody>';

        if (showVocative) {
            cases = cases_vocative;
        } else {
            cases = cases_without_vocative;
        }
        for (var c = 0; c < cases.length; c++) {
            result += '<tr>';

            if (tags) {
                result += '<th scope="row">' + cases[c][SHORT] + '</th>';
            }

            for (var num = 0; num < numbers.length; num++) {
                var key = numbers[num][LONG] + '-' + cases[c][LONG];
                if (prefix != null) {
                    key = prefix + key;
                }

                var word = words[key];
                // if (word === null) {
                if (!word) {
                    word = '&mdash;';
                }
                if (cases[c][LONG] === 'Vokatīvs') {
                    word = word + '!';
                }

                result += '<td>' + word + '</td>';
            }

            result += '</tr>';
        }

        return result + '</tbody></table>';
    }

    // Noformē īpašības vārda tabulu vienai pakāpei - noteiktā/nenoteiktā galotne, dzimtes, skaitļi, locījumi
    function formatAdjective(data, degree, only_indefinite = false) {
        var head = '<div class="sub-morphology">' + degree + ' pakāpe: ';

        if (degree === 'Pārākā') {
            return head + '<span class="sub-text">piedēklis <span class="inflection">-āk-</span></span></div>';
        }

        if (degree === 'Vispārākā') {
            return head + '<span class="sub-text">priedēklis <span class="inflection">vis-</span>, '
                        + 'piedēklis <span class="inflection">-āk-</span> '
                        + 'un noteiktā galotne</span></div>';
        }

        var words = {};

        for (var i = 0; i < data.length; i++) {
            item = data[i];

            if (item['Vārdšķira'] === 'Apstākļa vārds') continue;
            if (item['Pakāpe'] != null && item['Pakāpe'] != degree) continue;

            var key = item['Noteiktība'] + '-' + item['Dzimte'] + '-' + item['Skaitlis'] + '-' + item['Locījums'];
            add_word(words, key, item['Vārds'])
        }

        var result = head + '<div>';

        for (var def = 0; def < defs_all.length; def++) {
            if (only_indefinite && def === 1) continue;

            result += '<div class="sub-morphology" style="display:inline-block">';
            result += '<div class="sub-indent tab-title">' + defs_all[def][LONG] + ' galotne</div><div>';

            for (var gend = 0; gend < genders_all.length; gend++) {
                var tags = (gend === 0) ? true : false;

                result += '<div style="display:inline-block">';
                result += formatNumCaseTable(words, genders_all[gend][LONG] + ' dzimte', defs_all[def][LONG] + '-' + genders_all[gend][LONG] + '-', tags, false);
                result += '</div>';
            }

            result += '</div></div>';
        }

        return result + '</div></div>';
    }


    // Noformē tabulu daļēji lokāmam divdabim, nenodalot noteikto/nenoteikto galotni
    function formatParticiple(data) {
        var words = {};

        for (var i = 0; i < data.length; i++) {
            item = data[i];
            if (item['Vārdšķira'] === 'Apstākļa vārds') continue;

            var key = item['Dzimte'] + '-' + item['Skaitlis'] + '-' + item['Locījums'];
            add_word(words, key, item['Vārds'])
        }

        var result = '<div class="sub-morphology" style="display:inline-block">';

        for (var gend = 0; gend < genders_all.length; gend++) {
            var tags = (gend === 0) ? true : false;

            result += '<div style="display:inline-block">';
            result += formatNumCaseTable(words, genders_all[gend][LONG] + ' dzimte', genders_all[gend][LONG] + '-', tags, false);
            result += '</div>';
        }

        return result + '</div></div>';
    }


    function formatNumber(data) {
        var words = {};

        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var key = item['Dzimte'] + '-' + item['Skaitlis'] + '-' + item['Locījums'];
            add_word(words, key, item['Vārds'])
        }

        var result = '<div>';

        for (var gend = 0; gend < genders_all.length; gend++) {
            var tags = (gend === 0) ? true : false;

            result += '<div style="display:inline-block">';
            result += formatNumCaseTable(words, genders_all[gend][LONG] + ' dzimte', genders_all[gend][LONG] + '-', tags, false);
            result += '</div>';

            // hack - locījumu ģenerētājs nemāk tikt galā ar atšķirību starp vārdiem “viens” un “simts”, vienam ir sieviešu dzimtes formas bet simtam nav
            if (data[0]['Vārds'] === 'desmits' || data[0]['Vārds'] === 'simts' || data[0]['Vārds'] === 'miljons' || data[0]['Vārds'] === 'miljards')
                break;
        }

        return result + '</div></div>';
    }

    // Skaitļa vārdiem
    function formatNumberOnePlurality(data) {
        var words = {};

        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var key = item['Dzimte'] + '-' + item['Locījums'];
            add_word(words, key, item['Vārds'])
        }

        var result = '<table class="inflections"><thead>';
        result += '<tr><th class="case-indent">&nbsp;</th>';

        for (var gend = 0; gend < genders_all.length; gend++) {
            result += '<th>' + genders_all[gend][SHORT] + '</th>';
        }

        result += '</tr></thead><tbody>';
        cases = cases_without_vocative;
        for (var c = 0; c < cases.length; c++) {
            result += '<tr><th scope="row">' + cases[c][SHORT] + '</th>';

            for (var gend = 0; gend < genders_all.length; gend++) {
                var key = genders_all[gend][LONG] + '-' + cases[c][LONG];
                var word = words[key];
                if (word === null) {
                    word = '&mdash;';
                }
                result += '<td>' + word + '</td>';
            }
            result += '</tr>';
        }
        result = result + '</tbody></table>';

        return result;
    }

    function formatVerb(data, paradigm) {
        var has_nonnegated = false;
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            if (item['Noliegums'] == 'Jā') continue;
            has_nonnegated = true;
            break;
        }

        var words = {};
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            if (item['Vārdšķira'] != 'Darbības vārds') continue;
            if (has_nonnegated && item['Noliegums'] == 'Jā' && paradigm != 50) continue;

        		var value = item['Vārds'];
            if (!value) continue;

            var key = '';

            switch (item['Izteiksme']) {
                case 'Īstenības':
                    key = item['Izteiksme'] + '-' + item['Laiks'] + '-' + item['Persona'] + '-' + item['Skaitlis'];
                    break;
                case 'Pavēles':
                    key = item['Izteiksme'] + '-' + item['Skaitlis'];
                    break;
                case 'Atstāstījuma':
                    key = item['Izteiksme'] + '-' + item['Laiks'];
                    break;
                case 'Vēlējuma':
                case 'Vajadzības':
                case 'Vajadzības, atstāstījuma paveids':
                    key = item['Izteiksme'];
                    break;
                default:
                    continue;
            }

            add_word(words, key, value);
        }

        var result = '<div class="sub-morphology">Īstenības izteiksme:';
        result += '<table class="inflections">';
        result += '<thead><tr><th>&nbsp;</th>';

        for (var tense = 0; tense < tenses.length; tense++) {
            result += '<th colspan="2"><div class="sub-title">' + tenses[tense][LONG] + '</div></th>';
        }

        result += '</tr><tr><th>&nbsp;</th>';

        for (var tense = 0; tense < tenses.length; tense++) {
            for (var num = 0; num < numbers_2.length; num++) {
                result += '<th>' + numbers_2[num][SHORT] + '</th>';
            }
        }

        result += '</tr></thead><tbody>';

        for (var person = 1; person <= 3; person++) {
            result += '<tr><th scope="row">' + person + '.&nbsp;pers.</th>';

            for (var tense = 0; tense < tenses.length; tense++) {
                var wordlist = [];

                for (var num = 0; num < numbers_3.length; num++) {
                    var key = 'Īstenības-' + tenses[tense][LONG] + '-' + person + '-' + numbers_3[num][LONG];

                    if (words[key]) {
                        wordlist.push(words[key]);
                    } else if ((person === 1 || person === 2) && num != 2 ||
    							person === 3 && num === 2) {
    					wordlist.push('&mdash;');
    					// FIXME - kā smukāk realizēt, lai vajadzīgajiem un tikai vajadzīgajiem laukiem ieliek domuzīmes, ja tukši?
    				}
                }

                if (wordlist.length > 0) {
                    wordlist = wordlist.join('</td><td>');
                } else {
                    wordlist = '&mdash;';
                }

                if (person === 3) {
                    result += '<td colspan="2" style="text-align:center">';
                } else {
                    result += '<td>';
                }
                result += wordlist + '</td>';
            }
        }

        result += '</tbody></table></div>';

    	if (words['Pavēles-Vienskaitlis'] || words['Pavēles-Daudzskaitlis']) {
    		result += '<div class="sub-morphology">Pavēles izteiksme: <span class="sub-text">';
    		if (words['Pavēles-Vienskaitlis']) {
    			result += '<span class="inflection">' + words['Pavēles-Vienskaitlis'] + '</span> (vsk. 2. pers.)';
    		}
    		if (words['Pavēles-Vienskaitlis'] && words['Pavēles-Daudzskaitlis']) {
    			result += ', ';
    		}
    		if (words['Pavēles-Daudzskaitlis']) {
    			result += '<span class="inflection">' + words['Pavēles-Daudzskaitlis'] + '</span>  (dsk. 2. pers.)';
    		}
    		result += '</span></div>';

        // TODO: dsk. 1. pers.
    	}

    	if (words['Atstāstījuma-Tagadne'] || words['Atstāstījuma-Nākotne']) {
    		result += '<div class="sub-morphology">Atstāstījuma izteiksme: <span class="sub-text">';
    		if (words['Atstāstījuma-Tagadne']) {
    			result += '<span class="inflection">' + words['Atstāstījuma-Tagadne'] + '</span> (tag.)';
    		}
    		if (words['Atstāstījuma-Tagadne'] && words['Atstāstījuma-Nākotne']) {
    			result += ', ';
    		}
    		if (words['Atstāstījuma-Nākotne']) {
    			result += '<span class="inflection">' + words['Atstāstījuma-Nākotne'] + '</span> (nāk.)';
    		}
    		result += '</span></div>';
    	}

    	if (words['Vēlējuma']) {
    		result += '<div class="sub-morphology">Vēlējuma izteiksme: <span class="inflection">'
    				+ words['Vēlējuma'] + '</span></div>';
    	}

    	if (words['Vajadzības']) {
    		result += '<div class="sub-morphology">Vajadzības izteiksme: <span class="inflection">'
    				+ words['Vajadzības'] + '</span></div>';
    	}

        return result;
    }

    return {
        formatInflections : formatInflections
    }
}();

module.exports = { MorphologyTables };
