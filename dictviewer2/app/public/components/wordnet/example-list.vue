<template>
  <ul class="example-list">
    <li
            is="example"
            v-for="example in examples"
            :key="example.tokenNum"
            :senses="senses"
            :mwes="mwes"
            :active-examples="activeExamples"
            :example-key="`${corpname}_${example.tokenNum}`"
            :corpname="corpname"
            :search-input="searchInput"
            :example="example"
            v-on:update-active-examples="onUpdateActiveExamples"
    ></li>
  </ul>
</template>

<script>
  module.exports = {
    props: ['examples', 'senses', 'corpname','activeExamples', 'mwes', 'searchInput'],
    methods: {
      onUpdateActiveExamples: function (key, senseId, exampleId, toRemove = false) {
        this.$emit('update-active-examples', key, senseId, exampleId, toRemove);
      }
    }
  };
</script>

<style scoped>
.example-list {
  height: 65vh;
  max-height: 65vh;
  overflow-y: scroll;
}
.example-list .sv_PI p {
  margin: 0;
}
</style>
