<template>
  <div>
    <b-modal id="wordnetGraphModal"
             size="xl"
             :static="true"
             hide-footer>
      <wordnet-graph :synset-id="synsetId" :synset="synset" :lg="true"></wordnet-graph>
    </b-modal>
  </div>
</template>

<script>
  module.exports = {
    props: [],
    data: function () {
      return {
        synset: null,
        synsetId: null
      }
    },
    watch: {
      '$root.modals.wordnetGraphModal': function (data) {
        this.synset = data.synset;
        this.synsetId = data.synsetId;
      }
    }
  }
</script>

<style scoped>
  .modal {
    padding: 0 !important;
  }
  .modal .modal-dialog {
    width: 100%;
    max-width: none;
    height: 100%;
    margin: 0;
  }
  .modal .modal-content {
    height: 100%;
    border: 0;
    border-radius: 0;
  }
  .modal .modal-body {
    overflow-y: auto;
  }
</style>