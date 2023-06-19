<template>
  <vue-fragment>
    <b-dropdown-item-button v-if="this.dropdown" size="sm" v-b-modal="this.id"><slot><i class="fas fa-arrows-alt-v"></i></slot></b-dropdown-item-button>
    <b-button v-else size="sm" variant="primary" v-b-modal="this.id" :title="this.title"><slot><i class="fas fa-arrows-alt-v"></i></slot></b-button>

    <b-modal
            :title="this.title"
            :id="this.id"
            :busy="this.submitting"
            @ok="this.submit"
            @hidden="this.reset"
            no-close-on-backdrop
            :ok-title="hide_input ? 'Jā' : 'Saglabāt'"
            cancel-title="Atcelt"
            size="lg"
            :body-class="(hide_input && !error) ? 'd-none' : ''"
    >
        <div class="alert alert-danger" v-if="error">{{error}}</div>
        <b-form-group :label="label" v-if="!hide_input"><b-form-input v-model="position" type="number" step="1" min="1" :max="this.max"></b-form-input></b-form-group>
    </b-modal>
  </vue-fragment>
</template>

<script>
  module.exports = {
    props: ['initial_position', 'max', 'entity_id', 'context_id', 'entity', 'title', 'dropdown', 'change_parent', 'hide_input'],
    mixins: [App.mixins.modalFormSaveShortcut],
    data: function () {
      return {
        position: parseInt(this.initial_position),
        error: null,
        submitting: false,
        id: uuid(),
        label: this.change_parent ? 'Vecāka kārtas numurs' : 'Kārtas numurs'
      }
    },
    inject: ['setLoading', 'setEntry', 'showWarning'],
    methods: {
      submit: function(e) {
        e.preventDefault();
        if ((this.entity === 'senses' || this.entity === 'sub_senses') && this.$root.wordnetSenses.has(this.entity_id)) {
          this.showWarning('Nozīmei ir WordNet saites! Vai turpināt darbību?', this.onSubmit);
        } else {
          this.onSubmit();
        }
      },
      onSubmit: function() {
        if (this.change_parent) {
          submitForm(this, 'put', `/api/${this.entity}/${this.entity_id}/change_parent/${this.context_id}/${this.position}`, this.id, {onSuccess: this.onChangeParentSuccess});
        } else {
          submitForm(this, 'put', `/api/${this.entity}/${this.entity_id}/move/${this.context_id}/${this.position}`, this.id);
        }
      },
      onChangeParentSuccess: function(data) {
        this.setEntry(data.entry);
        entryContent.reload();
      },
      reset: function() {
        this.position = this.initial_position;
        this.error = null;
      }
    },
  }
</script>
