<template>
  <vue-fragment>
    <b-dropdown-item-button v-if="this.dropdown" size="sm" v-b-modal="this.id"><slot><i class="fas fa-pen"></i></slot></b-dropdown-item-button>
    <b-button v-else size="sm" variant="success" v-b-modal="this.id" :title="this.title" :accessKey="getAccessKey()"><slot><i class="fas fa-pen"></i></slot></b-button>

    <b-modal :title="this.title"
             :id="this.id"
             :busy="this.submitting"
             @ok="this.submit"
             @hidden="this.reset"
             no-close-on-backdrop
             ok-title="Saglabāt"
             cancel-title="Atcelt"
             size="lg">
      <div class="alert alert-danger" v-if="error">{{error}}</div>
      <gloss-form v-on:update-entry="updateEntryGlossLink"
                  v-on:update-sense="updateSenseGlossLink"
                  v-on:add-link="addGlossLink"
                  v-on:update-gloss="g => data.gloss = g"
                  v-on:update-validity="v => valid = v"
                  :entry-id="entry_id"
                  :sense-id="sense_id"
                  :sense-gloss="data.gloss"
                  :gloss-links="data.gloss_links"
      ></gloss-form>

      <hr />

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
        <b-form-group label="Karodziņi"><flag-input v-model="data.data.Gram.Flags" scope="S"></flag-input></b-form-group>
        <b-form-group label="Ierobežojumi"><restrictions-input v-model="data.data.Gram.StructuralRestrictions"></restrictions-input></b-form-group>
      </template>

      <b-form-group><label><b-form-checkbox class="d-inline" v-model="data.hidden"></b-form-checkbox>Paslēpts</label></b-form-group>

      <pre v-if="this.$SHOW_DEBUG" style="max-height: 200px;">{{JSON.stringify(data, null, 2)}}</pre>
    </b-modal>
  </vue-fragment>
</template>

<script>
  const defaultData = {data: {Gram: {}}, gloss_links: {sense: [], entry: [], new: []}};
  module.exports = {
    props: ['idata', 'entry_id', 'sense_id', 'dropdown', 'title'],
    mixins: [App.mixins.modalFormSaveShortcut],
    data: function () {
      const parsed = JSON.parse(this.idata);
      return {
        data: extendDefault(defaultData, parsed),
        error: null,
        submitting: false,
        valid: true,
        id: uuid(),
      }
    },
    inject: ['setLoading', 'showWarning'],
    methods: {
      submit: function(e) {
        e.preventDefault();
        if (!this.validate()) return;
        if (this.data.id && this.$root.wordnetSenses.has(this.data.id)) {
          this.showWarning('Nozīmei ir WordNet saites! Vai turpināt darbību?', this.onSubmit);
        } else {
          this.onSubmit();
        }
      },
      onSubmit: function() {
        if (this.data.id) {
          if (this.sense_id) { // subsense
            submitForm(this, 'patch', `/api/entries/${this.entry_id}/senses/${this.sense_id}/senses/${this.data.id}`, this.id);
          } else { // sense
            submitForm(this, 'patch', `/api/entries/${this.entry_id}/senses/${this.data.id}`, this.id);
          }
        } else {
          if (this.sense_id) {
            submitForm(this, 'post', `/api/entries/${this.entry_id}/senses/${this.sense_id}/senses`, this.id);
          } else {
            submitForm(this, 'post', `/api/entries/${this.entry_id}/senses`, this.id);
          }
        }
      },
      validate: function() {
        this.error = null;
        if (!this.valid) {
          this.error = 'Nekorektas saites nozīmes skaidrojumā!';
          return false;
        }
        return true;
      },
      reset: function() {
        this.data = extendDefault(defaultData, JSON.parse(this.idata));
        this.error = null;
      },
      getAccessKey: function() {
        if (this.data.parent_sense_id) return null;
        if (this.data.order_no > 9) return null;
        return this.data.order_no;
      },
      addGlossLink: function (link) {
        this.data.gloss_links.new.push(link);
      },
      updateEntryGlossLink: function(type, index, entry) {
        this.data.gloss_links[type][index].entry = entry;
        this.data.gloss_links[type][index].entry_id = entry.id;
      },
      updateSenseGlossLink: function(type, index, sense) { // If sense is null then clear fields
        this.data.gloss_links[type][index].sense = sense;
        this.data.gloss_links[type][index].sense_2_id = sense ? sense.id : null;
      }
    },
  }
</script>