<template>
  <b-form-input :value="this.mergedValue" @input="this.onInput"></b-form-input>
</template>

<script>
  module.exports = {
    props: {
      value: {
        required: true
      }
    },
    computed: {
      mergedValue: function() {return this.value ? this.value.join(' | ') : this.value}
    },
    methods: {
      onInput(v) {
        this.$emit('input', v ? v.replace(/^\s+|\s+$/g, '').split(/\s*\|\s*/g).filter(function(e) { return e}) : []);
      },
    }
  }
</script>
