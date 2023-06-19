<template>
  <vue-fragment>
    <b-dropdown-item-button v-if="this.dropdown" size="sm" v-b-modal="this.id">
      <slot><i class="fas fa-pen"></i></slot>
    </b-dropdown-item-button>
    <b-button v-else size="sm" v-b-modal="this.id"
              v-b-tooltip.hover.html="synsetDisplayString"
              :variant="synset.synset_id ? 'success' : 'secondary'">
      <i class="fas fa-project-diagram"></i>
    </b-button>

    <b-modal :title="this.title" :id="this.id"
             @show="this.updateSynset" @hidden="this.reset"
             no-close-on-backdrop hide-footer
             :size="showAllRelations ? 'xl' :'lg'">

      <template #modal-header="{ close }">
        <div class="mr-auto"></div>
        <b-form-checkbox v-model="showAllRelations" switch class="position-absolute">
          Rādīt visas saites
        </b-form-checkbox>
        <h5 class="m-auto">{{ title }}</h5>
        <button type="button" aria-label="Close" class="close" @click="close()">×</button>
      </template>

      <div class="alert alert-danger" v-if="error">{{error}}</div>
      <b-row class="mb-3">
        <b-col>
          <synset-info :synset="synset"
                       :allow-edit="true"
                       :details="true"
                       class="mb-3"
                       v-on:update-synset="updateSynset"
                       v-on:fill="fill"
          ></synset-info>
        </b-col>
        <b-col v-show="showAllRelations && showSynsetRelations">
          <synset-relation-list
                  :synset-id="synset.synset_id"
                  :synset="synset"
                  :small="true"
                  :fullscreen="fullscreen"
                  v-on:has-eq-omw="has => hasEqOmw = has"
                  v-on:list-changed="(show) => {showSynsetRelations = show}"></synset-relation-list>
        </b-col>
      </b-row>

      <hr/>

      <div class="mb-2 row">
        <b-col cols="6">
          <b-form-input
                  class="d-inline-block"
                  placeholder="Meklēt"
                  autocomplete="off"
                  v-model="input"
                  @change="searchDebounced"
                  @keyup.enter="searchDebounced"
          ></b-form-input>
        </b-col>
        <b-col>
          <b-form-radio-group
                  class="mt-2"
                  v-model="modes.selected"
                  :options="modes.all"
                  name="radio-inline"
          ></b-form-radio-group>
        </b-col>

        <!--<b-form-checkbox class="d-inline-block ml-2"-->
                         <!--v-model="subsenses">Ar apakšnozīmēm-->
        <!--</b-form-checkbox>-->
        <!--<b-form-checkbox class="d-inline-block ml-2"-->
                         <!--v-model="pwn">Angliski-->
        <!--</b-form-checkbox>-->

      </div>

      <div class="text-center">
        <b-spinner class="mt-2" v-if="loading"></b-spinner>
      </div>

      <b-row v-if="!loading">
        <b-col v-if="senses.length > 0">
          <synset-list
                  title="Nozīmes"
                  :items="senses"
                  :add-title="synset.synset_id ? 'Pievienot sinonīmu kopai' : 'Izveidot sinonīmu kopu'"
                  :main-synset="synset"
                  v-on:error="e => error = e"
                  v-on:open-relations="openRelations"
                  v-on:update-synset="updateSynset">
            <template v-slot:default="props">
              <synset-sense :sense="props.item"></synset-sense>
            </template>
          </synset-list>
        </b-col>

        <b-col v-if="synsets.length > 0">
          <synset-list
                  title="Sinonīmu kopas"
                  :items="synsets"
                  add-title="Pievienot sinonīmu kopai"
                  :main-synset="synset"
                  :show-relations="showAllRelations"
                  :has-eq-omw="hasEqOmw"
                  v-on:error="e => error = e"
                  v-on:open-relations="openRelations"
                  v-on:update-synset="updateSynset">
            <template v-slot:default="props">
              <synset-info :synset="props.item" :details="true"></synset-info>
            </template>
          </synset-list>
        </b-col>

        <b-col v-show="showAllRelations && synsets.length > 0">
          <synset-relation-list :synset-id="relationSynsetId" :external-link-type="relationExternalLinkType" :display-only="true"></synset-relation-list>
        </b-col>
      </b-row>
    </b-modal>
  </vue-fragment>
</template>

<script>
  module.exports = {
    props: ['dropdown', 'title', 'sense', 'loadedSynset'],
    data: function () {
      return {
        synset: this.loadedSynset || {},
        senses: [],
        synsets: [],

        input: null,
        showAllRelations: true,
        showSynsetRelations: false,
        relationSynsetId: null,
        relationExternalLinkType: null,
        modes: {
          selected: 'senses',
          all: [
            { text: 'Tikai nozīmes', value: 'senses' },
            { text: 'Ar apakšnozīmēm', value: 'subsenses' },
            { text: 'Angliski', value: 'pwn' },
            { text: 'Angliski*', value: 'pwn_prefix' },
          ]
        },
        hasEqOmw: false,
        fullscreen: false,

        loading: false,
        error: null,
        id: uuid()
      }
    },
    computed: {
      synsetDisplayString() {
        if (this.synset && this.synset.synset_id) {
          return this.synset.senses.map((s) => {
            return `${ s.text }<sub>${ s.parent_order_no ? (s.parent_order_no + '.' + s.order_no) : s.order_no }</sub>`
          }).join(', ');
        }
        return null;
      }
    },
    inject: ['setLoading'],
    watch: {
      'modes.selected': 'search',
      synset: {immediate: true, handler: 'addToWordnetSenseList'}
    },
    created() {
      this.searchDebounced = Vue.prototype.$debounce(this.search, 200);
    },
    mounted() {
      const saveListener = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
          e.preventDefault();
          this.fullscreen = !this.fullscreen;
          // document.getElementById('wordnetGraphButton').click();
        }
      };
      this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
        if (modalId === this.id) {
          document.addEventListener('keydown', saveListener);
        }
      });
      this.$root.$on('bv::modal::hidden', (bvEvent, modalId) => {
        if (modalId === this.id) {
          document.removeEventListener('keydown', saveListener);
        }
      })
    },
    methods: {
      clearResults() {
        this.senses = [];
        this.synsets = [];
      },
      search() {
        if (!this.input) {
          this.clearResults();
          return;
        }

        let url = ['pwn', 'pwn_prefix'].includes(this.modes.selected)
          ? '/api/wordnet/suggest/pwn'
          : '/api/wordnet/suggest/synset';

          this.relationSynsetId = null;
          this.loading = true;
          axios.post(url, {
            q: this.input,
            filter: {
              subsenses: this.modes.selected === 'subsenses',
              prefix: this.modes.selected === 'pwn_prefix',
              ignore: {
                sense_id: this.sense.id,
                synset_id: this.synset.synset_id,
                entry_id: this.sense.entry_id
              }
            }
          })
            .then(r => {
              this.senses = r.data.senses || [];
              this.synsets = r.data.synsets || [];
            })
            .finally(() => this.loading = false)
      },
      reset: function () {
        this.input = null;
        this.error = null;
      },
      updateSynset() {
        this.synset.synset_id = null;
        axios.get(`/api/wordnet/sense/synset/${this.sense.id}`)
          .then(r => {
            this.synset = r.data;
            this.input = null;
            this.clearResults();
            // todo: don't always clear results ??
          })
      },
      fill(synonym, modes) {
        if (!modes.includes(this.modes.selected))
          this.modes.selected = modes[0];

        this.input = synonym;
        this.search();
      },
      openRelations(synsetId, externalLinkType) {
        this.relationSynsetId = synsetId;
        this.relationExternalLinkType = externalLinkType;
      },
      addToWordnetSenseList() {
        if (this.synset && this.synset.synset_id)
          this.$root.wordnetSenses.add(this.sense.id);
        else
          this.$root.wordnetSenses.delete(this.sense.id);
      }
    },
  }
</script>

<style>
  .custom-control-label {
    cursor: pointer;
  }
</style>

