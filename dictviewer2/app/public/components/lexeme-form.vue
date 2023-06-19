<template>
  <vue-fragment>
    <b-dropdown-item-button v-if="this.dropdown" size="sm" v-b-modal="this.id"><slot><i class="fas fa-pen"></i></slot></b-dropdown-item-button>
    <b-button v-else variant="warning" size="sm" v-b-modal="this.id" :title="this.title" accesskey="l"><slot><i class="fas fa-pen"></i></slot></b-button>

    <b-modal :title="this.title" :id="this.id" :busy="this.submitting" @ok="this.submit" @hidden="this.reset" no-close-on-backdrop ok-title="Saglabāt" cancel-title="Atcelt" size="lg">
      <div class="alert alert-danger" v-if="error">{{error}}</div>

      <b-form-group label="Pamatforma"><b-form-input v-model="data.lemma" v-on:keyup="this.searchExistingDebounced"></b-form-input></b-form-group>
      <b-alert v-if="this.existing && this.existing.length > 0" variant="warning" show>
        Šāda lemma jau eksistē:
        <div v-for="e in this.existing" :key="e.human_key"><a :href="`/${e.human_key}`" target="_blank">{{ e.human_key }} ({{ e.lemma }})</a></div>
      </b-alert>

      <b-form-group><label>
        <b-form-checkbox class="d-inline" v-model="data.primary" :disabled="data.entry_lexeme_count <= 1"></b-form-checkbox>
        Pamatvārds</label></b-form-group>
      <b-form-group label="Leksēmas tips"><v-select :options="this.values.lexeme_types" label="label" :reduce="e => e.id" v-model="data.type_id"></v-select></b-form-group>
      <b-form-group v-if="this.$IS_TEZAURS || this.$IS_LTG" label="Paradigma" required>
        <v-select :options="this.values.paradigms" label="label" :reduce="e => e.id" v-model="data.paradigm_id">
          <template #option="{ label }">
            <div class="paradigm-option">
              <span class="code">{{ label.split(':')[0] }}:</span>
              {{ label.split(':')[1] }}
            </div>
          </template>
        </v-select>
      </b-form-group>
      <b-form-group v-if="!this.$IS_TEZAURS && !this.$IS_LTG" label="Paradigmu teksts" description="Neklasificēta paradigmas vērtība, vēlams izmantot lauku Paradigma"><b-form-input v-model="data.data.Gram.Inflection"></b-form-input></b-form-group>
      <b-form-group v-if="showStem1Input()" label="Nenoteiksmes celms"><b-form-input v-model="data.stem1"></b-form-input></b-form-group>
      <b-form-group v-if="showStem23Inputs()" label="Tagadnes celms"><b-form-input v-model="data.stem2"></b-form-input></b-form-group>
      <b-form-group v-if="showStem23Inputs()" label="Pagātnes celms"><b-form-input v-model="data.stem3"></b-form-input></b-form-group>
      <b-form-group label="Izruna">
        <div class="sv_RU pb-1">{{ pronunciation }}</div>
        <array-input class="pronunciation-input" v-model="data.data.Pronunciations"></array-input>
        <b-form-text>
          <div>Vairākas izrunas tiek atdalītas ar | simbolu</div>
          <div class="pronunciation-help mt-1">
            <div>Krītošā intonācija: '\' pēc intonējamā burta</div>
            <div>Lauztā intonācija: '^' pēc intonējamā burta</div>
            <div>Stieptā intonācija: '~' pēc intonējamā burta</div>
            <div>Uzsvars: '!'</div>
            <div>Platais e: 'e,'</div>
          </div>
        </b-form-text>
      </b-form-group>

      <template v-if="this.$IS_TEZAURS || this.$IS_LTG">
        <b-form-group label="Importa piezīmes" v-if="data.data.ImportNotices">
          <b-input-group>
            <b-form-input :disabled="true" v-model="data.data.ImportNotices"></b-form-input>
            <b-input-group-append><b-button variant="outline-danger" @click="data.data.ImportNotices = null"><i class="fas fa-trash"></i></b-button></b-input-group-append>
          </b-input-group>
        </b-form-group>

        <b-form-group label="Pārpalikumi (Leftovers)" v-if="data.data.Gram.Leftovers">
          <b-input-group>
            <b-form-input :disabled="true" v-model="data.data.Gram.Leftovers"></b-form-input>
            <b-input-group-append><b-button variant="outline-danger" @click="data.data.Gram.Leftovers = null"><i class="fas fa-trash"></i></b-button></b-input-group-append>
          </b-input-group>
        </b-form-group>

        <b-form-group label="Karodziņu teksts" v-if="data.data.Gram.FreeText">
          <b-input-group>
            <b-form-input :disabled="true" v-model="data.data.Gram.FreeText"></b-form-input>
            <b-input-group-append><b-button variant="outline-danger" @click="data.data.Gram.FreeText = null"><i class="fas fa-trash"></i></b-button></b-input-group-append>
          </b-input-group>
        </b-form-group>
      </template>
      <template v-else-if="this.$IS_MLVV">
        <b-form-group label="Importa piezīmes" v-if="data.data.ImportNotices">
          <b-input-group>
            <b-form-input :disabled="true" v-model="data.data.ImportNotices"></b-form-input>
            <b-input-group-append><b-button variant="outline-danger" @click="data.data.ImportNotices = null"><i class="fas fa-trash"></i></b-button></b-input-group-append>
          </b-input-group>
        </b-form-group>

        <b-form-group label="Pārpalikumi (Leftovers)" v-if="data.data.Gram.Leftovers">
          <b-input-group>
            <b-form-input :disabled="true" v-model="data.data.Gram.Leftovers"></b-form-input>
            <b-input-group-append><b-button variant="outline-danger" @click="data.data.Gram.Leftovers = null"><i class="fas fa-trash"></i></b-button></b-input-group-append>
          </b-input-group>
        </b-form-group>

        <b-form-group label="Karodziņu teksts" v-if="data.data.Gram.FlagText && data.data.ImportNotices && data.data.ImportNotices.includes('MLVV karodziņu imports nav pilnīgs')">
          <b-input-group>
            <b-form-input :disabled="true" v-model="data.data.Gram.FlagText"></b-form-input>
            <b-input-group-append><b-button variant="outline-danger" @click="data.data.Gram.FlagText = null"><i class="fas fa-trash"></i></b-button></b-input-group-append>
          </b-input-group>
        </b-form-group>
      </template>

      <template v-else>
        <b-form-group label="Karodziņu teksts">
          <b-form-input v-model="data.data.Gram.FreeText"></b-form-input>
        </b-form-group>
      </template>

      <template v-if="!this.$IS_LLVV">
        <b-form-group label="Karodziņi"><flag-input v-model="data.data.Gram.Flags" scope="L"></flag-input></b-form-group>
        <b-form-group label="Ierobežojumi"><restrictions-input v-model="data.data.Gram.StructuralRestrictions"></restrictions-input></b-form-group>
      </template>

      <b-form-group><label><b-form-checkbox class="d-inline" v-model="data.hidden"></b-form-checkbox>Paslēpts</label></b-form-group>

      <pre v-if="this.$SHOW_DEBUG" style="max-height: 200px;">{{JSON.stringify(data, null, 2)}}</pre>
    </b-modal>
  </vue-fragment>
</template>

<script>
  const defaultData = {type_id: 1, data: {Gram: {}}};
  module.exports = {
    props: ['idata', 'entry_id', 'dropdown', 'title'],
    mixins: [App.mixins.modalFormSaveShortcut],
    data: function () {
      return {
        data: extendDefault(defaultData, JSON.parse(this.idata)),
        error: null,
        submitting: false,
        id: uuid(),
        existing: [],
      }
    },
    watch: {
      'data.lemma': function(v) {
        this.existing = [];
      },
      'data.primary': function (v) {
        if (v) this.data.type_id = 1; // Pamatvārds
      }
    },
    inject: ['setLoading'],
    created() {
      this.searchExistingDebounced = Vue.prototype.$debounce(this.searchExisting, 250);
    },
    computed: {
      values: function () {return window.values;},
      pronunciation: function() {
        if (!this.data.data.Pronunciations || this.data.data.Pronunciations.length === 0) return '';

        const prepare_pronunciation = p => p.replace(/,/g, '\u0327').replace(/~/g, '\u0303').replace(/\^/g, '\u0302').replace(/\\/g, '\u0300').replace(/!/g, '\u02c8');
        return `[${this.data.data.Pronunciations.map(p => prepare_pronunciation(p)).join('], [')}]`;
      }
    },
    methods: {
      submit: function(e) {
        e.preventDefault();
        const onSuccess = ({result}) => {
          // console.log('lexeme submit onSuccess', JSON.stringify(result, null, 2))
          if (result.entry_human_key) {
            window.location = `/${result.entry_human_key}`;
          } else {
            location.reload();
          }
          this.setLoading(true)
        }
        if (this.data.id) {
          submitForm(this, 'patch', `/api/entries/${this.entry_id}/lexemes/${this.data.id}`, this.id, {onSuccess});
        } else {
          submitForm(this, 'post', `/api/entries/${this.entry_id}/lexemes`, this.id, {onSuccess});
        }
      },
      reset: function() {
        this.data = extendDefault(defaultData, JSON.parse(this.idata));
        this.error = null;
      },
      showStem23Inputs() {
        if ([15, 18, 50].includes(this.data.paradigm_id)) return true; // verb-1
        return [16, 19, 17, 20, 45, 46].includes(this.data.paradigm_id) // verb-2/3
          && this.data.data.Gram.Flags
          && this.data.data.Gram.Flags['Locīšanas īpatnības']
          && this.data.data.Gram.Flags['Locīšanas īpatnības'].some(s => s.startsWith('Pirmās'));
      },
      showStem1Input() {
        if ([15, 18, 50].includes(this.data.paradigm_id)) return true; // verb-1
        return this.showStem23Inputs();
      },
      searchExisting: function(e) {
        axios.get(`/api/lexemes/existing?q=${e.target.value}`).then(e => this.existing = (e.data || []).filter(e => e.id != this.entry_id));
      }
    },
  }
</script>

<style>
  .paradigm-option {
    white-space: normal;
  }
  .paradigm-option .code {
    font-weight: 600;
  }

  .pronunciation-help {
    display: none;
  }
  .pronunciation-input:focus + .form-text .pronunciation-help {
    display: block;
  }
</style>
