<template>
  <i class="fas toggle fa-bug ml-1"
     v-b-tooltip.hover title="Nekorekts piemērs"
     :style="{color: showAsError ? 'red' : 'lightgrey'}"
     v-b-hover="errorHover"
     @click="submitError"></i>
</template>

<script>
  module.exports = {
    props: ['sentence', 'query', 'corpname', 'example'],
    data: function () {
      return {
        isError: this.example.hasError,
        showAsError: this.example.hasError,
        data: {
          sentence: this.sentence,
          query: this.query,
          token_num: this.example.tokenNum,
          corpname: this.corpname,
          instance_found: this.example.instanceFound
        },
      }
    },
    inject: ['setLoading'],
    methods: {
      errorHover: function(isHovered) {
        this.showAsError = isHovered ? !this.isError : this.isError;
      },
      submitError: function() {
        this.isError = !this.isError;
        submitForm(this, 'post', `/api/wordnet/sketch_engine_error`, null, {onSuccess: () => {}});
      }
    },
  }
</script>
<style scoped>
  .toggle {
    cursor: pointer;
  }
</style>
