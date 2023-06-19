<template>
  <vue-fragment>
    <b-dropdown-item-button v-if="this.dropdown" size="sm" v-b-modal="this.id"><slot><i class="fas fa-pen"></i></slot></b-dropdown-item-button>
    <b-button v-else variant="info" size="sm" v-b-modal="this.id" :title="this.title"><slot><i class="fas fa-pen"></i></slot></b-button>

    <b-modal :title="this.title" :id="this.id" :busy="this.submitting" @ok="this.submit" @hidden="this.reset" no-close-on-backdrop ok-title="Saglabāt" cancel-title="Atcelt" size="lg">
      <div class="alert alert-danger" v-if="error">{{error}}</div>

      <b-form-group label="Teksts"><b-form-textarea v-model="data.content" rows="3"></b-form-textarea></b-form-group>
      <b-form-group label="Avots"><b-form-input v-model="data.data.CitedSource"></b-form-input></b-form-group>

      <template v-if="this.$IS_TEZAURS || this.$IS_LTG">
        <b-form-group label="Karodziņu teksts" v-if="data.data.Gram.FreeText">
          <b-input-group>
            <b-form-input :disabled="true" v-model="data.data.Gram.FreeText"></b-form-input>
            <b-input-group-append><b-button variant="outline-danger" @click="data.data.Gram.FreeText = null"><i class="fas fa-trash"></i></b-button></b-input-group-append>
          </b-input-group>
        </b-form-group>
        <b-form-group label="Karodziņi"><flag-input v-model="data.data.Gram.Flags" scope="X"></flag-input></b-form-group>
      </template>
      <!-- <template v-else-if="this.$IS_MLVV">
        <b-form-group label="Karodziņu teksts" v-if="data.data.Gram.FlagText">
          <b-input-group>
            <b-form-input :disabled="true" v-model="data.data.Gram.FlagText"></b-form-input>
            <b-input-group-append><b-button variant="outline-danger" @click="data.data.Gram.FlagText = null"><i class="fas fa-trash"></i></b-button></b-input-group-append>
          </b-input-group>
        </b-form-group>
        <b-form-group label="Karodziņi"><flag-input v-model="data.data.Gram.Flags" scope="X"></flag-input></b-form-group>
      </template>
      <template v-else>
      </template> -->

      <b-form-group><label><b-form-checkbox class="d-inline" v-model="data.hidden"></b-form-checkbox>Paslēpts</label></b-form-group>

      <pre v-if="this.$SHOW_DEBUG" style="max-height: 200px;">{{JSON.stringify(data, null, 2)}}</pre>
    </b-modal>
  </vue-fragment>
</template>

<script>
  const defaultData = {data: {Gram: {}}};
  module.exports = {
    props: ['idata', 'entry_id', 'sense_id', 'dropdown', 'title'],
    mixins: [App.mixins.modalFormSaveShortcut],
    data: function () {
      return {
        data: extendDefault(defaultData, JSON.parse(this.idata)),
        error: null,
        submitting: false,
        id: uuid(),
      }
    },
    inject: ['setLoading'],
    methods: {
      submit: function(e) {
        e.preventDefault();
        if (this.data.id) {
          submitForm(this, 'patch', `/api/entries/${this.entry_id}/senses/${this.sense_id}/examples/${this.data.id}`, this.id);
        } else {
          submitForm(this, 'post', `/api/entries/${this.entry_id}/senses/${this.sense_id}/examples`, this.id);
        }
      },
      reset: function() {
        this.data = extendDefault(defaultData, JSON.parse(this.idata));
        this.error = null;
      }
    },
  }
</script>
