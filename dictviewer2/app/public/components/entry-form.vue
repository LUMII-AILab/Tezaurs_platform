<template>
  <vue-fragment>
    <slot v-if="this.$scopedSlots.trigger" name="trigger" v-bind:id="this.id"></slot>
    <b-dropdown-item-button v-else-if="this.dropdown" size="sm" v-b-modal="this.id"><slot><i class="fas fa-pen"></i></slot></b-dropdown-item-button>
    <b-button v-else variant="primary" size="sm" v-b-modal="this.id" :title="this.title" accesskey="e"><slot><i class="fas fa-pen"></i></slot></b-button>

    <b-modal :title="this.title" :id="this.id" :busy="this.submitting" @ok="this.submit" @hidden="this.reset" no-close-on-backdrop size="lg">
      <div class="alert alert-danger" v-if="error">{{error}}</div>

      <b-form-group label="Šķirkļa vārds"><b-form-input v-model="data.heading" v-on:keyup="this.searchExistingDebounced" :disabled="data.id && data.heading_is_primary_lexeme"></b-form-input></b-form-group>
      <b-alert v-if="this.existing && this.existing.length > 0" variant="warning" show>
        Šāds šķirkļa vārds jau eksistē:
        <div v-for="e in this.existing" :key="e.human_key"><a :href="`/${e.human_key}`" target="_blank">{{ e.human_key }}</a></div>
      </b-alert>
      <b-form-group><label><b-form-checkbox class="d-inline" v-model="data.heading_is_primary_lexeme"></b-form-checkbox>Sakrīt ar galveno leksēmu</label></b-form-group>
      <b-form-group label="Homonīma numurs">
        <b-input-group>
          <b-form-input v-model="data.homonym_no" type="number" min="1" :disabled="!this.useManualHomonymNumber"></b-form-input>
          <b-input-group-append><b-button variant="outline-primary" @click="toggleManualHomonymNumber()"><i class="fas fa-pen"></i></b-button></b-input-group-append>
        </b-input-group>
      </b-form-group>
      <b-form-group label="Šķirkļa tips"><v-select v-model="data.type_id" :options="this.values.entry_types" label="label" :reduce="e => e.id"></v-select></b-form-group>
      <!--<b-form-group v-if="data.type_id == 3" label="Zin. Nosaukums"><array-input v-model="data.data.SciName"></array-input></b-form-group>-->
      <b-form-group label="Cilme"><b-form-input v-model="data.data.Etymology"></b-form-input></b-form-group>
      <b-form-group label="Normatīvais komentārs"><b-form-input v-model="data.data.Normative"></b-form-input></b-form-group>
      <b-form-group label="Zinātniskais nosaukums">
        <array-input class="sciname-input" v-model="data.data.SciName"></array-input>
        <b-form-text>
          <div>Vairāki nosaukumi tiek atdalīti ar | simbolu</div>
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

        <!-- <b-form-group label="Karodziņu teksts" v-if="data.data.Gram.FlagText">
          <b-input-group>
            <b-form-input :disabled="true" v-model="data.data.Gram.FlagText"></b-form-input>
            <b-input-group-append><b-button variant="outline-danger" @click="data.data.Gram.FlagText = null"><i class="fas fa-trash"></i></b-button></b-input-group-append>
          </b-input-group>
        </b-form-group> -->
      </template>

      <template v-else>
        <b-form-group label="Karodziņu teksts">
          <b-form-input v-model="data.data.Gram.FreeText"></b-form-input>
        </b-form-group>
      </template>

      <template v-if="!this.$IS_LLVV">
        <b-form-group label="Karodziņi"><flag-input v-model="data.data.Gram.Flags" scope="E"></flag-input></b-form-group>
        <b-form-group label="Ierobežojumi"><restrictions-input v-model="data.data.Gram.StructuralRestrictions"></restrictions-input></b-form-group>
      </template>

      <b-form-group><label><b-form-checkbox class="d-inline" v-model="data.hidden"></b-form-checkbox>Paslēpts</label></b-form-group>
      <b-form-group label="Komentārs" description="Paredzēts tikai iekšējai lietošanai, netiek publiskots."><b-form-textarea rows="3" max-rows="20" v-model="data.notes"></b-form-textarea></b-form-group>

      <pre v-if="this.$SHOW_DEBUG" style="max-height: 200px;">{{JSON.stringify(data, null, 2)}}</pre>

      <template v-slot:modal-footer="{ok, cancel, hide}">
        <b-button variant="secondary" @click="cancel()">Atcelt</b-button>
        <b-button variant="primary" @click="ok()">Saglabāt</b-button>
        <b-button v-if="!data.id" variant="primary" @click="submit(null, true)">Saglabāt un atvērt</b-button>
      </template>
    </b-modal>
  </vue-fragment>
</template>

<script>
  const defaultData = {data: {Gram: {}}, type_id: 1, heading_is_primary_lexeme: true};
  module.exports = {
    props: ['idata', 'dropdown', 'title', 'onSuccess'],
    mixins: [App.mixins.modalFormSaveShortcut],
    data: function () {
      return {
        data: extendDefault(defaultData, JSON.parse(this.idata)),
        changeId: 0,
        error: null,
        submitting: false,
        id: uuid(),
        existing: [],
        useManualHomonymNumber: false,
      }
    },
    watch: {
      'data.type_id' : function() {
        // taksons
        if (this.data.type_id !== 3) {
          Vue.set(this.data.data, 'SciName', null);
        }
      },
      'data.heading': function(v) {
        if (!v) {
          Vue.set(this.data, 'homonym_no', 1);
        } else if (v === this.initialData.heading) {
          Vue.set(this.data, 'homonym_no', this.initialData.homonym_no);
        } else {
          var localChangeId = this.changeId + 1;
          const that = this;
          axios.get('/api/entries/next_homonym/' + encodeURIComponent(v)).then(r => {
            if (localChangeId > this.changeId) {
              Vue.set(this.data, 'homonym_no', r.data.data.homonym_no);
              this.changeId = localChangeId;
            }
          });
        }
        this.existing = [];
        this.useManualHomonymNumber = false;
      }
    },
    inject: ['setLoading'],
    created() {
      this.searchExistingDebounced = Vue.prototype.$debounce(this.searchExisting, 250);
    },
    computed: {
      values: function () {return window.values;},
      initialData: function() {return extendDefault(defaultData, JSON.parse(this.idata))},
    },
    methods: {
      submit: function(bvModalEvt, redirectToNew) {
        console.log('submit', bvModalEvt, redirectToNew)
        bvModalEvt && bvModalEvt.preventDefault();
        if (this.data.id) {
          submitForm(this, 'patch', `/api/entries/${this.data.id}`, this.id, {
            onSuccess: ({result}) => {
                // console.log('entry submit onSuccess', JSON.stringify(result, null ,2));
                if (result.human_key !== this.initialData.human_key) {
                  window.location = `/${result.human_key}`;
                } else {
                  location.reload();
                }
                this.setLoading(true);
              }
          });
        } else {
          submitForm(this, 'post', `/api/entries`, this.id, {
            onSuccess: redirectToNew
              ? ((d) => {
                window.location = `/${d.data.human_key}`;
                this.setLoading(true)
              })
              : (() => {})
          });
        }
      },
      reset: function() {
        this.data = extendDefault(defaultData, JSON.parse(this.idata));
        this.error = null;
      },
      searchExisting: function(e) {
        axios.get(`/api/entries/existing?q=${e.target.value}`).then(e => this.existing = (e.data || []).filter(e => !this.data || e.human_key !== this.data.human_key));
      },
      toggleManualHomonymNumber: function() {
        if (!this.useManualHomonymNumber) {
          this.$bvModal.msgBoxConfirm('Vai tiešām vēlies manuāli norādīt homonīma numuru?', {okTitle: 'Jā', cancelTitle: 'Nē'})
            .then(value => {if (value) this.useManualHomonymNumber = !this.useManualHomonymNumber;})
        } else {
          this.useManualHomonymNumber = !this.useManualHomonymNumber;
        }
      }
    },
  }
</script>
