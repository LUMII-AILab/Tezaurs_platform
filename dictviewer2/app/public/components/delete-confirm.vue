<template>
  <b-dropdown-item-button v-if="this.dropdown" @click="confirm" :title="this.title"><slot><i class="fas fa-trash"></i></slot></b-dropdown-item-button>
  <b-button v-else variant="danger" :size="this.size" @click="confirm" :title="this.title"><slot><i class="fas fa-trash"></i></slot></b-button>
</template>

<script>
  module.exports = {
    props: ['url', 'title', 'description', 'dropdown', 'size'],
    inject: ['setLoading'],
    methods: {
      confirm: function() {
        this.$bvModal.msgBoxConfirm(this.title || 'Vai esi pārliecināts?', {
          title: this.description || null,
          okVariant: 'danger',
          okTitle: 'Jā',
          cancelTitle: 'Nē',
          autoFocusButton: 'ok',
        })
        .then(v => {
          if (v) {
            axios.delete(this.url)
              .then(r => {
                console.log('delete-confirm response', r);
                if (r.data.error) {
                  this.$bvToast.toast(r.data.error, {variant: 'danger'})
                } else {
                  entryContent.onSubmit(this);
                  this.$bvToast.toast(r.data.message || 'Izdzēsts', {variant: 'success'})
                }
              })
              .catch(e => this.$bvToast.toast(`Kļūda: ${e}`, {variant: 'danger'}))
          }
        })
      }
    },
  }
</script>
