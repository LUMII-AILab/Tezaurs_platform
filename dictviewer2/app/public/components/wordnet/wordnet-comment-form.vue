<template>
  <div>
    <b-modal
            v-if="modal"
            :id="id"
            ref="modal"
            :title="title"
            ok-title="Saglabāt"
            ok-only
            centered
            @show="resetModal"
            @hidden="resetModal"
            @ok.prevent="submitWrapper"
    >
      <form ref="form" @submit.stop.prevent="submitWrapper">
        <b-form-textarea
                id="name-input"
                v-model="editedComments"
                rows="3"
                max-rows="12"
        ></b-form-textarea>
      </form>
    </b-modal>

    <form v-if="!modal" ref="form" @submit.stop.prevent="submitWrapper" class="p-2 text-right comment-form">
      <b-form-textarea
              class="mb-2"
              id="name-input"
              v-model="editedComments"
      ></b-form-textarea>
      <b-button type="submit"
                :variant="variant"
                size="sm" class="p-2">Saglabāt</b-button>
    </form>
  </div>
</template>

<script>
  module.exports = {
    props: ['wordnetEntry', 'entryId', 'heading', 'modal'],
    data() {
      return {
        editedComments: this.wordnetEntry ? this.wordnetEntry.comments : null,
        id: 'modal-comments',
        title: `Šķirkļa "${this.wordnetEntry ? this.wordnetEntry.entry : this.heading}" wordnet komentāri`,
        variant: 'outline-secondary',
        wEntry: this.wordnetEntry
      }
    },
    watch: {
      wEntry: 'update',
      wordnetEntry: function(newValue) {
        this.update();
        this.wEntry = newValue;
      },
      editedComments: 'checkVariant'
    },
    methods: {
      update (newValue) {
        if (newValue) {
          this.editedComments = newValue.comments;
          this.title = `Šķirkļa "${newValue.entry}" wordnet komentāri`;
        } else {
          this.title = `Šķirkļa "${this.heading}" wordnet komentāri`;
        }
      },
      checkVariant() {
        this.variant = ((this.wEntry && this.editedComments !== this.wEntry.comments) || (!this.wEntry && this.editedComments))
          ? 'outline-success'
          : 'outline-secondary';
      },
      resetModal() {
        this.editedComments = this.wEntry ? this.wEntry.comments : null;
      },
      submitWrapper() {
        if (this.wEntry.id == null)
          axios.post('/api/wordnet/wordnet_entry', {entry: this.wEntry.entry})
            .then(r => {
              if (r.data.error) throw Error(r.data.error);
              this.wEntry.id = r.data.id;
              this.$emit('update', r.data.id); // need to also update the list because this is a copy
            })
            .then(() => this.handleSubmit())
            .catch((e) => console.log('ERROR', e));
        else
          this.handleSubmit();
      },
      handleSubmit() {
        let url = this.wEntry
          ? `/api/wordnet/${this.wEntry.id}/comments`
          : `/api/wordnet/wordnet_comments/${this.entryId}`;
        let method = this.wEntry ? 'patch' : 'post';

        axios.request({method, url, data: {value: this.editedComments}})
          .then((r) => {
            if (r.data.error) throw Error(r.data.error);
            this.$bvModal.hide(this.id);
            this.wEntry = r.data;
            if (this.modal) this.wordnetEntry.comments = r.data.comments;
            this.checkVariant();
            this.$bvToast.toast('Saglabāts', {variant: 'success', autoHideDelay: 1000})
          })
          .catch((e) => console.log(e));
      }
    }
  }
</script>
<style scoped>
  .comment-form {
    height: 100%;
    display: grid;
    grid-template-rows: auto 28px;
  }
</style>