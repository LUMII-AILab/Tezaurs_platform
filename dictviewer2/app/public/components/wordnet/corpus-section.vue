<template>
  <b-card no-body>
    <b-card-header>
      <b-row>
        <b-col sm="3">
          <label>Šķirkļa vārds</label>
        </b-col>
        <b-col sm="9">
          <b-row>
            <b-col>
              <b-form-input size="sm" @keyup.enter="search()" v-model="word"></b-form-input>
            </b-col>
            <b-col>
              <b-form-radio-group size="sm"
                                  stacked
                                  v-model="searchType.selected"
                                  :options="searchType.options"
                                  name="radio-inline"
              ></b-form-radio-group>
            </b-col>
          </b-row>
        </b-col>
      </b-row>
      <b-row class="mt-1">
        <b-col sm="3">
          <label>Korpuss</label>
        </b-col>
        <b-col sm="9">
          <b-row>
            <b-col>
              <b-form-select
                      size="sm"
                      v-model="data.corpname"
                      :options="corpora">
              </b-form-select>
            </b-col>
            <b-col v-if="data.corpname === 'LVK2018' || data.corpname === 'LVK2022'">
              <b-form-select size="sm" v-model="LVKSections.selected" :options="LVKSections.options"></b-form-select>
            </b-col>
          </b-row>
        </b-col>
      </b-row>
    </b-card-header>

    <b-card-body class="p-0" v-if="!pagination.noResults || error">
      <div class="alert alert-danger" v-if="error">{{error}}</div>
      <b-overlay :show="loadingExamples">
        <p class="text-danger m-0 p-3" v-if="pagination.totalRows === 0 && !error">
          <span :style="{visibility: loadingExamples ? 'hidden' : 'visible'}">
            Neviens atbilstošs piemērs netika atrasts.
          </span>
        </p>
        <example-list
                v-if="pagination.totalRows > 0"
                class="m-0"
                :examples="examples"
                :senses="senses"
                :mwes="mwes"
                :active-examples="activeExamples"
                :corpname="data.corpname"
                :search-input="lastSearchInput"
                v-on:update-active-examples="onUpdateActiveExamples"
                v-on:change-page="onChangePage"
        ></example-list>
      </b-overlay>
    </b-card-body>

    <b-card-footer v-if="!pagination.noResults && pagination.totalRows > 0" class="d-flex justify-content-between">
      <div>
        <b-pagination
                class="m-0"
                v-model="pagination.currentPage"
                :total-rows="pagination.totalRows"
                :per-page="pagination.perPage"
                @change="onChangePage"
                first-number
                last-number
        ></b-pagination>
      </div>
      <b-form-input class="ml-3" style="width:60px" @change="onChangePage" v-model="pagination.currentPage"></b-form-input>
    </b-card-footer>
  </b-card>
</template>

<script>
  const defaultPagination = {
    noResults: true,
    totalRows: 0,
    perPage: 25,
    currentPage: 1
  };
  module.exports = {
    props: ['idata', 'dropdown', 'title', 'onSuccess'],
    data: function () {
      const data = JSON.parse(this.idata);
      this.setEntry(data);

      return {
        data: {
          corpname: this.$root.searchParams.corpname || this.$IS_LTG ? 'MuLa2022' : 'LVK2022',
          refs: 'doc.reference,doc.source,doc.title,doc.name,doc.date,doc.category,doc.file',
          format: 'json',
          viewmode: 'sen',
          pagesize: defaultPagination.perPage,
          fromp: defaultPagination.currentPage,
          attrs: 'word',
          ctxattrs: 'word,tag',
          kwicleftctx: "250#",
          kwicrightctx: "250#"
        },
        word: this.$root.searchParams.word || data.heading.replace(/<[^>]*>?/gm, ''),
        lastSearchInput: null,
        searchType: {
          selected: this.$root.searchParams.searchType || 'lemma',
          options: [
            {text: 'pēc lemmas', value: 'lemma', disabled: false},
            {text: 'pēc vārda formas', value: 'word'}
          ]
        },
        corpora: [
          {value: 'LVK2022', text: 'Līdzsvarotais 2022'},
          {value: 'LVK2018', text: 'Līdzsvarotais 2018'},
          {value: 'emuari', text: 'Emuāri'},
          {value: 'timeklis', text: 'Tīmeklis 2007'},
          {value: 'CommonCrawl', text: 'Tīmeklis 2020'},
          {value: 'saeima', text: 'Saeima'},
          {value: 'MuLa2022', text: 'MuLa2022'},
          {value: 'mula', text: 'MuLa2012'},
          {value: 'karogs', text: 'Karogs'},
          {value: 'sieviesu_isproza', text: 'ĪsprozaS'},
          {value: 'zinas', text: 'Ziņas'},
          {value: 'Vikipedija', text: 'Vikipēdija'},
        ],
        LVKSections: {
          selected: 'Daiļliteratūra',
          options: [
            { value: null, text: 'Visas'},
            { value: 'Daiļliteratūra', text: 'Daiļliteratūra'},
            { value: 'Normatīvie akti', text: 'Normatīvie akti'},
            { value: 'Periodika', text: 'Periodika'},
            { value: 'Zinātne', text: 'Zinātne'},
            { value: 'Saeimas stenogrammas', text: 'Saeimas stenogrammas'},
            { value: 'Citi', text: 'Citi'}
          ]
        },
        senses: data.senses,
        mwes: this.getMWEs(data),
        examples: [],
        error: null,
        id: uuid(),
        activeExamples: {},
        pagination: extendDefault(defaultPagination, {}),
        loadingExamples: false
      }
    },
    watch: {
      'data.corpname': 'onCorpnameChange',
      'LVKSections.selected': 'onCorpnameChange',
      'word': 'makeQuery',
      'searchType.selected': 'onSearchTypeChange',
      '$root.entry': 'onEntryDataChange',
      'examples': 'updateLastSearched'
    },
    inject: ['setLoading', 'setEntry'],
    computed: {
      values: function () {
        return window.wordnet;
      }
    },
    mounted: function () {
      this.setActiveExamples();
      this.makeQuery();
      this.search(this.$root.searchParams.page || 1);
    },
    methods: {
      updateLastSearched: function () {
        this.lastSearchInput = this.word;
      },
      getMWEs: function(entry) {
        let entryMWEs = entry.incoming_entry_relations.filter(r => r.entry.type_id === 4).map(r => r.entry);
        let entrySubSenses = entry.senses.flatMap(s => s.subSenses || []);
        entry.senses.concat(entrySubSenses).flatMap(s => s.MWEs).forEach(mwe => {
          if (!entryMWEs.some(m => m.id === mwe.id)) entryMWEs.push(mwe);
        });

        const capitalize_first_letter = s => s ? s.slice(0,1).toUpperCase() + s.slice(1) : '';
        const get_heading = mwe => mwe.lexemes.map(x => capitalize_first_letter(x.lemma)).join('; ');

        return entryMWEs.map(mwe => {
          mwe.full_heading = get_heading(mwe);
          mwe.entry_link = `/${encodeURIComponent(mwe.human_key).replace('%3A', ':')}`;
          return mwe;
        }).sort((a, b) => {
          return a.full_heading.localeCompare(b.full_heading, 'lv');
        });
      },
      onCorpnameChange: function () {
        if (!this.data.corpname) {
          this.clearSearchResults();
        } else {
          this.makeQuery();
          this.data.viewmode = this.data.corpname === 'saeima' ? 'kwic' : 'sen';
          if (!this.toggleAvailableSearchOptions()) {
            this.search();
          }
        }
      },
      onSearchTypeChange: function () {
        this.makeQuery();
        this.search();
      },
      clearSearchResults: function () {
        this.error = null;
        this.examples = [];
        this.pagination = extendDefault(defaultPagination, {});
      },
      makeQuery: function () {
        if (this.word != '' && this.data.corpname) {
          let type = this.searchType.selected === 'lemma' ? 'lemma' : 'lc';
          this.data.q = 'q' + this.word.replace('(', '').replace(')', '')
            .split(' ').map(e => `[${type}="${e}"]`).join('');
          if ((this.data.corpname === 'LVK2018' || this.data.corpname === 'LVK2022') && this.LVKSections.selected) {
            this.data.q += ` within <doc (section="${this.LVKSections.selected}") />`;
          }
          switch (this.data.corpname) {
            case 'MuLa2022':
              this.data.refs = 'doc.author,doc.year,doc.issue,doc.title';
              break;
            case 'mula':
              this.data.refs = 'doc.author,doc.source,doc.published,doc.title';
              break;
            case 'karogs':
              this.data.refs = 'doc.author,doc.title,doc.dateIssued,doc.issueNumber';
              break;
            case 'sieviesu_isproza':
              this.data.refs = 'doc.creator,doc.title,doc.dateIssued';
              break;
            case 'zinas':
              this.data.refs = 'doc.url,doc.title,doc.publish_time';
              break;
            case 'Vikipedija':
              this.data.refs = 'doc.url,doc.title';
              break;
            default:
              this.data.refs = 'doc.reference,doc.source,doc.title,doc.name,doc.date,doc.category,doc.file';
              break;
          }
        } else {
          this.data.q = '';
        }
      },
      /**
       * @returns {boolean} - whether selected search type was changed
       */
      toggleAvailableSearchOptions: function () {
        let selectedChanged = false;
        let nonLemmaSelected = false; // currently all corpora are tagged

        if (nonLemmaSelected && this.searchType.selected === 'lemma') {
          this.searchType.selected = 'word';
          selectedChanged = true;
        }
        this.searchType.options[this.searchType.options.findIndex(o => o.value === 'lemma')].disabled = nonLemmaSelected;
        return selectedChanged;
      },
      fixSentence: function (sentence, corpname) {
        sentence = sentence.replace(/\s+([^A-Za-z0-9āčēģīķļņšūžŗĀČĒĢĪĶĻŅŠŪŽŖ(\[_—“"–])/g, '$1')
          .replace(/([(\[=“„])\s+/g, '$1')
          .replace(/" (.*) "/g, '"$1"')
          .replace('</p>', '').replace('<p>', '');
        if (corpname === 'timeklis' && !['!', '?', '.'].includes(sentence.slice(-1))) {
          return sentence + '.'
        }
        return sentence;
      },
      processLines: function (data) {
        let middle = '', sentence = '',
          corpname = data.request.corpname;

        return data.Lines.map(line => {
          let left = '', right = '';
          for (const el of line.Left) {
            left += el.class === 'attr' ? '' : el.str;
            if (el.class === 'attr' && el.str === '/zs') left = '';
          }
          for (const el of line.Right) {
            right += el.class === 'attr' ? '' : el.str;
            if (el.class === 'attr' && el.str === '/zs') break;
          }
          middle = line.Kwic.reduce((acc, v) => acc + v.str, '');
          sentence = `${left}<strong>${middle}</strong>${right}`;

          return {
            instanceFound: middle.trim(),
            text: this.fixSentence(sentence, corpname),
            tokenNum: line.toknum,
            reference: this.getReference(line.Refs, corpname)
          };
        });
      },
      getReference: function (refs, corpname) {
        extractValue = function (prefix) {
          let ref = refs.find(ref => ref.startsWith(prefix)),
            value = ref ? ref.substring(prefix.length) : '';

          return value === '===NONE===' ? '' : value;
        };

        switch (corpname) {
          case 'emuari': {
            let source = extractValue('Avots='),
              title = extractValue('Virsraksts=');
            return title ? `${title}, ${source}` : source;
          }
          case 'saeima': {
            let name = extractValue('Vārds='),
              date = extractValue('Datums='),
              cat = extractValue('Kategorija='),
              saeima = cat.substring(0, 10),
              party = cat.indexOf('|') ? cat.substring(cat.indexOf('|') + 1) : null,
              year = date.substring(0, 4),
              month = date.indexOf('|') ? date.substring(date.indexOf('|') + 1) + '.' : null;

            return `${name}. ${saeima}. ${party}. ${year}.${month}`;
          }
          case 'CommonCrawl':
            return extractValue('Avota URL=');
          case 'timeklis':
            // return extractValue('doc.file=');
            return extractValue('Datnes nosaukums=');
          case 'MuLa2022': {
            let author = extractValue('Autors='),
              year = extractValue('Gads='),
              issue = extractValue('Izdevums='),
              title = extractValue('Teksta nosaukums=');

            return `"${title}", ${author}, ${issue}, ${year}`;
          }
          case 'mula': {
            let author = extractValue('Autors='),
              source = extractValue('Avots='),
              published = extractValue('Publicēts='),
              title = extractValue('Nosaukums=');

            return `"${title}", ${author}, ${source}, ${published}`;
          }
          case 'karogs': {
            let author = extractValue('Autors='),
              title = extractValue('Nosaukums='),
              dateIssued = extractValue('Izdošanas gads='),
              issueNumber = extractValue('Žurnāla numurs=');

            return `${author}, "${title}" – Karogs, ${dateIssued}-${issueNumber}`;
          }
          case 'sieviesu_isproza': {
            let creator = extractValue('Autors='),
              title = extractValue('Nosaukums='),
              dateIssued = extractValue('Izdošanas gads=');

            return `${creator}, "${title}", ${dateIssued}`;
          }
          case 'zinas': {
            let url = extractValue('Avots='),
              title = extractValue('Nosaukums='),
              publish_time = extractValue('Datums=');

            return `"${title}", ${publish_time}, ${url}`;
          }
          case 'Vikipedija': {
            let url = extractValue('Avots='),
              title = extractValue('Nosaukums=');

            return `Vikipēdija, "${title}", ${url}`;
          }
          default:
            return extractValue('Atsauce=');
        }

      },
      updatePagination: function (data) {
        let title = data.Desc[0].nicearg,
          count = data.Lines.length,
          total = data.concsize;

        this.pagination.totalRows = total;
        this.pagination.noResults = false;

        return data;
      },
      setActiveExamples: function () {
        this.activeExamples = {};

        const extractExamples = senses => senses.flatMap(sense => sense.examples)
          .filter(ex => ex.data && ex.data.sketchEngineTokenNum)
          .forEach(ex => {
            let key = `${ex.data.sketchEngineCorpname}_${ex.data.sketchEngineTokenNum}`;
            this.activeExamples[key] = {senseId: ex.sense_id, exampleId: ex.id}
          });

        extractExamples(this.senses);
        extractExamples(this.senses.flatMap(s => s.subSenses || []));
        extractExamples(this.mwes.flatMap(m => m.senses));
      },
      onUpdateActiveExamples: function (key, senseId, exampleId, toRemove) {
        if (toRemove && this.activeExamples[key] && this.activeExamples[key].exampleId === exampleId) {
          delete this.activeExamples[key];
        } else if (!toRemove) {
          this.activeExamples[key] = {senseId, exampleId};
        }
      },
      search: function (page = 1) {
        if (this.data.q) {
          this.data.fromp = page;
          this.pagination.currentPage = page;
          this.pagination.noResults = false;
          this.error = null;
          this.loadingExamples = true;
          this.saveSearchParams();

          axios.post('api/wordnet/examples', this.data)
            .then((r) => {
              if (r.data.error) {
                throw new Error(r.data.error);
              }
              return r.data;
            })
            .then(this.updatePagination)
            .then(this.processLines)
            .then(this.addErrors)
            .then(lines => {
              this.examples = lines;
            })
            .catch((e) => {
              this.clearSearchResults();
              this.error = e;
            })
            .finally(() => this.loadingExamples = false);
        }
      },
      onChangePage: function (page) {
        this.search(page);
      },
      onEntryDataChange: function (newEntry, oldEntry) {
        this.senses = newEntry.senses;
        this.mwes = this.getMWEs(newEntry);
        this.setActiveExamples();
      },
      saveSearchParams: function () {
        this.$root.searchParams = {
          corpname: this.data.corpname,
          word: this.word,
          searchType: this.searchType.selected,
          page: this.data.fromp
        }
      },
      addErrors: function (examples) {
        let tokenNums = examples.map(e => e.tokenNum);
        return axios.post('/api/wordnet/sketch_engine_error/list', tokenNums)
          .then((r) => {
            if (!r.data.errors) return examples;
            return examples.map((e) => {
              e.hasError = r.data.errors.includes(e.tokenNum);
              return e;
            });
          }).catch(() => {return examples});
      }
    },
  }
</script>