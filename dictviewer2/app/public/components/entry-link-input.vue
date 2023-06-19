<template>
  <v-select
    :options="options"
    :filterable="false"
    label="text"
    :reduce="e => e.id"
    @search="this.onSearchDebounced"
    @input="this.onInput"
  >
    <span slot="no-options">Vaicājumam netika atrasts neviens atbilstošs šķirklis.</span>
  </v-select>
</template>

<script>
  console.log('te', Vue.prototype.$debounce)
  module.exports = {
    data: function () {
      return {
        options: [],
      }
    },
    props: {
      entry_type_id: {default: null},
      entry_id: {default: null}
      // value: {
      //   required: true
      //   default: null
      // }
      /*
        For this component it is enough to process change events, without a fully controlled
        component (with :value) and a way to retrieve label for initial value
       */
    },
    methods: {
      onSearch(search, loading) {
        console.log('onSearch', search);
        loading(true);
        axios.get('/api/suggest/entries', {params: {q: search, entry_type_id: this.entry_type_id, ignore: this.entry_id}})
          .then(r => this.options = r.data)
          .finally(() => loading(false))
      },
      onInput(v) {
        console.log('onInput', v);
        this.$emit('input', v, v ? this.options.find(o => o.id===v).text: null)
      }
    },
    created() {
      this.onSearchDebounced = Vue.prototype.$debounce(this.onSearch, 300);
    }
  }
</script>
