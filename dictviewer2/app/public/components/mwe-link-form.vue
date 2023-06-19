<template>
  <vue-fragment>
    <b-dropdown-item-button v-if="this.dropdown" size="sm" v-b-modal="this.id"><slot><i class="fas fa-pen"></i></slot></b-dropdown-item-button>
    <b-button v-else variant="primary" size="sm" v-b-modal="this.id" :title="this.title"><slot><i class="fas fa-edit"></i></slot></b-button>

    <b-modal :title="this.title" :id="this.id" :busy="this.submitting" @ok="this.submit" @hidden="this.reset" no-close-on-backdrop ok-title="Saglabāt" cancel-title="Atcelt" size="lg">
      <div class="alert alert-danger" v-if="error">{{error}}</div>

      <b-form-group label="Šķirklis">
        <entry-link-input v-model="data.entry_id" entry_type_id="4" :entry_id="entry_id"></entry-link-input>
      </b-form-group>

      <pre v-if="this.$SHOW_DEBUG" style="max-height: 200px;">{{JSON.stringify(data, null, 2)}}</pre>
    </b-modal>
  </vue-fragment>
</template>

<script>
  module.exports = {
    props: ['entry_id', 'sense_id', 'dropdown', 'title'],
    mixins: [App.mixins.modalFormSaveShortcut],
    data: function () {
      return {
        data: {},
        error: null,
        submitting: false,
        id: uuid(),
      }
    },
    inject: ['setLoading'],
    methods: {
      submit: function(e) {
        e.preventDefault();
        submitForm(this, 'post', `/api/entries/${this.entry_id}/senses/${this.sense_id}/sense_mwe_link`, this.id);
      },
      reset: function() {
        this.data = {id: this.mwe_id};
        this.error = null;
      }
    },
  }
</script>
