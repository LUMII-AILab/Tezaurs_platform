<template>
  <b-dropdown-item-button v-if="this.dropdown" @click="confirm" :title="this.title"><slot><i class="fas fa-trash"></i></slot></b-dropdown-item-button>
  <b-button v-else variant="danger" :size="this.size" @click="confirm" :title="this.title"><slot><i class="fas fa-trash"></i></slot></b-button>
</template>

<script>
  module.exports = {
    props: ['url', 'title', 'dropdown', 'size'],
    data: function () {
      return {
        warning: null
      }
    },
    inject: ['setLoading'],
    methods: {
      beforeConfirm: function() {
        return axios.get(this.url + '/dependents')
          .then((r) => {
              if (r.data) {
                const h = this.$createElement;
                this.warning = h('div', { domProps: { innerHTML: r.data }, class: ['text-danger'] });
              } else {
                this.warning = null;
              }
            });
      },
      confirm: async function() {
          await this.beforeConfirm();

          this.$bvModal.msgBoxConfirm(
            this.warning || this.title || 'Vai esi pārliecināts?', {
              title: this.warning ? this.title : null,
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
                  location.reload();
                  this.$bvToast.toast(r.data.message || 'Izdzēsts', {variant: 'success'})
                  this.setLoading();
                }
              })
              .catch(e => this.$bvToast.toast(`Kļūda: ${e}`, {variant: 'danger'}))
          }
        })
      }
    },
  }
</script>
