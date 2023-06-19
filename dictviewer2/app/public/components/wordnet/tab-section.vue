<template>
  <div class="mt-1 mb-3">
    <div class="mb-2">
      <b-button size="sm" variant="outline-secondary" @click="change">
        <i class="fas" :class="visible ? 'fa-eye-slash' : 'fa-eye'"></i>
        {{visible ? 'Slēpt sadaļu' : 'Rādīt sadaļu'}}
      </b-button>
    </div>
    <b-collapse v-model="visible">
      <b-card no-body class="resize">
        <b-tabs card fill pills end active-tab-class="p-0 tab-item-wrapper">
          <b-tab title="Komentārs" active>
            <div class="embed-responsive embed-responsive-21by9">
              <wordnet-comment-form
                      class="embed-responsive-item"
                      :modal="false"
                      :wordnet-entry="wordnetEntry"
                      :entry-id="entryId"
                      :heading="heading"
              ></wordnet-comment-form>
            </div>
          </b-tab>
          <b-tab title="MLVV">
            <b-spinner class="spinner m-3" label="Spinning" variant="secondary"></b-spinner>
            <b-embed
                    type="embed"
                    aspect="21by9"
                    :src="mlvvLink"
            ></b-embed>
          </b-tab>
          <b-tab title="LLVV">
            <b-spinner class="spinner m-3" label="Spinning" variant="secondary"></b-spinner>
            <b-embed
                    id="llvv"
                    type="embed"
                    aspect="21by9"
                    :src="llvvLink"
            ></b-embed>
          </b-tab>
        </b-tabs>
      </b-card>
    </b-collapse>
  </div>
</template>

<script>
  module.exports = {
    props: ['heading', 'wordnetEntry', 'entryId'],
    data: function() {
      return {
        visible: true
      }
    },
    computed: {
      mlvvLink: function () {
        return 'https://mlvv.tezaurs.lv/' + this.heading;
      },
      llvvLink: function () {
        return 'https://llvv.tezaurs.lv/' + this.heading;
      }
    },
    methods: {
      change() {
        this.visible = !this.visible;
        document.getElementById('gridcontainer').classList.toggle('hidden-section', !this.visible);
      }
    }
  }
</script>
<style scoped>
  .spinner {
    position: absolute;
    z-index: -1
  }
  .resize {
    resize: horizontal;
    overflow: auto;
  }
</style>
