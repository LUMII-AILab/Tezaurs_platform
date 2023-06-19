<template>
  <vue-fragment>
    <b-dropdown-item-button v-if="this.dropdown" size="sm" v-b-modal="this.id"><slot><i class="fas fa-pen"></i></slot></b-dropdown-item-button>
    <b-button v-else variant="secondary" size="sm" v-b-modal="this.id" :title="this.title"><slot><i class="fas fa-pen"></i></slot></b-button>

    <b-modal :title="this.title" :id="this.id" :busy="this.submitting" @ok="this.submit" @hidden="this.reset" no-close-on-backdrop ok-title="Saglabāt" cancel-title="Atcelt" size="lg">
      <div class="alert alert-danger" v-if="error">{{error}}</div>

      <b-form-group label="Avots" description="Lai meklētu pēc avota nosaukuma, pielieciet &quot;!&quot; vaicājuma priekšā. Piemēram, &quot;!svešvārdu&quot;.">
        <v-select :options="this.values.sources"
                  label="label"
                  :reduce="e => e.id"
                  :filter-by="sourceFilter"
                  v-model="data.source_id"></v-select>
      </b-form-group>
      <b-form-group label="Detaļas"><b-form-input v-model="data.data.sourceDetails"></b-form-input></b-form-group>
      <pre v-if="this.$SHOW_DEBUG" style="max-height: 200px;">{{JSON.stringify(data, null, 2)}}</pre>
    </b-modal>
  </vue-fragment>
</template>

<script>
  const defaultData = {data: {}};
  module.exports = {
    props: ['idata', 'entry_id', 'lexeme_id', 'sense_id', 'dropdown', 'title'],
    mixins: [App.mixins.modalFormSaveShortcut],
    data: function () {
      return {
        data: Object.assign(extendDefault(defaultData, JSON.parse(this.idata)) , {
          lexeme_id: this.lexeme_id,
          sense_id: this.sense_id,
        }),
        error: null,
        submitting: false,
        id: uuid(),
      }
    },
    inject: ['setLoading'],
    computed: {
      values: function () {return window.values;}
    },
    methods: {
      submit: function(e) {
        e.preventDefault();
        if (this.data.id) {
          submitForm(this, 'patch', `/api/entries/${this.entry_id}/sources/${this.data.id}`, this.id);
        } else {
          submitForm(this, 'post', `/api/entries/${this.entry_id}/sources`, this.id);
        }
      },
      reset: function() {
        this.data = Object.assign(extendDefault(defaultData, JSON.parse(this.idata)) , {
          lexeme_id: this.lexeme_id,
          sense_id: this.sense_id,
        });
        this.error = null;
      },
      sourceFilter: function(option, label, search) {
        if (search === '!') return true;
        if (search.startsWith('!')) return (label || '').toLowerCase().indexOf(search.substring(1).toLowerCase()) > -1;
        return (label || '').toLowerCase().startsWith(search.toLowerCase());
      }
    },
  }
</script>
