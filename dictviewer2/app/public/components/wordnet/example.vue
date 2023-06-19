
<template>
    <li>
      <div class="mt-1 example-text" v-b-tooltip.hover.top.ds300 :title="example.reference">
        <span class="sv_PI" v-html="example.text"></span>
        <error-toggle
                :sentence="plainText"
                :query="searchInput"
                :corpname="corpname"
                :example="example"
        ></error-toggle>
      </div>
      <template v-for="sense in senses">
        <b-button @click="toggleExampleToSense(sense.id, sense.entry_id)"
                  variant="outline-secondary"
                  size="sm"
                  class="p-1"
                  :class="{ active: isActive(sense.id) }">{{ sense.order_no }}</b-button>
        <template v-for="ss in sense.subSenses">
          <b-button
                  @click="toggleExampleToSense(ss.id, ss.entry_id)"
                  variant="outline-secondary"
                  size="sm"
                  class="p-1 mr-1"
                  :class="{ active: isActive(ss.id) }">{{ sense.order_no }}.{{ ss.order_no }}</b-button>
        </template>
      </template>
      <b-button
              v-if="mwes.length > 0"
              class="p-1" :class="{ active: isMWEActive() }"
              size="sm"
              variant="outline-secondary"
              @click="openMWEList"
      >mwe</b-button>
      <mwe-modal
              v-if="mwes.length > 0"
              :mwes="mwes"
              :id="exampleKey"
              :active-sense-id="activeSenseId"
              v-on:toggle-example-to-sense="toggleExampleToSense"
      ></mwe-modal>
    </li>
</template>

<script>
  module.exports = {
    props: ['senses', 'mwes', 'corpname', 'activeExamples', 'exampleKey', 'searchInput', 'example'],
    data: function () {
      return {
        activeSenseId: this.getActiveSenseId(),
        data: {
          Gram: {},
          CitedSource: this.example.reference,
          sketchEngineTokenNum: this.example.tokenNum,
          sketchEngineCorpname: this.corpname,
          TokenLocation: null,
        }
      }
    },
    computed: {
      plainText: function() {
        let tmp = document.createElement('div');
        tmp.innerHTML = this.example.text.replace('<strong>', '<strong>|||');
        let res = tmp.textContent || tmp.innerText || '';
        this.data.TokenLocation = res.indexOf('|||');
        res = res.replace('|||', '');
        this.data.TokenLocation = res[this.data.TokenLocation] === ' ' ? this.data.TokenLocation + 1 : this.data.TokenLocation;
        return res;
      }
    },
    inject: ['setLoading', 'showError'],
    watch: {
      activeExamples: function () {
        this.activeSenseId = this.getActiveSenseId();
      }
    },
    methods: {
      getActiveSenseId: function () {
        return this.activeExamples[this.exampleKey] ? this.activeExamples[this.exampleKey].senseId : null;
      },
      isActive: function(id) {
        return this.activeSenseId && this.activeSenseId === id;
      },
      isMWEActive: function() {
        let subSenses = this.senses.flatMap(s => s.subSenses || []);
        return this.activeSenseId && !this.senses.concat(subSenses).map(s => s.id).includes(this.activeSenseId);
      },
      toggleExampleToSense: function (senseId, entryId, reload=true) {
        this.$bvModal.hide(this.exampleKey);

        let senseChanged = this.activeSenseId !== senseId;

        if (this.activeSenseId) { // example already attached to some sense
          reload = true;
          this.deleteExample(senseId, entryId, this.activeExamples[this.exampleKey].exampleId)
        }
        if (senseChanged) { // check to not add back to the same sense
          this.createExample(senseId, entryId);
        }

        this.activeSenseId = this.getActiveSenseId();
        if (reload) entryContent.reload();
      },
      createExample: function(senseId, entryId) {
        let formData = {
          content: this.plainText,
          data: this.data,
          hidden: true
        };

        axios.request({method: 'post', url: `/api/entries/${entryId}/senses/${senseId}/examples`, data: formData})
          .then((r) => {
            if (r.data.error) {
              this.showError(r.data.error);
            } else {
              this.$emit('update-active-examples', this.exampleKey, senseId, r.data.id);
              this.activeSenseId = this.getActiveSenseId();
            }
          })
          .catch(e => this.showError(e))
      },
      deleteExample: function (senseId, entryId, exampleId) {
        let url = `/api/entries/${entryId}/senses/${senseId}/examples/${exampleId}`;

        console.log("Deleting example with id", exampleId);

        axios.delete(url)
          .then(r => {
            if (r.data.error) {
              this.showError(r.data.error);
            } else {
              this.$emit('update-active-examples', this.exampleKey, senseId, exampleId, true);
              this.activeSenseId = this.getActiveSenseId();
            }
          })
          .catch(e => this.showError(e))
      },
      openMWEList: function() {
        this.$bvModal.show(this.exampleKey)
      }
    },
  }
</script>

<style scoped>
.example-text:hover {
  background-color: #FAFAFA;
  border-radius: 4px 0 0 4px;
  transition-delay:300ms;
}
</style>