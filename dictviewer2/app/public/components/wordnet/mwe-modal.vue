<template>
  <b-modal
          title="Stabilie vārdu savienojumi"
          :id="id"
          body-class="mwe-modal"
          hide-footer>
    <b-form-input v-model="MWESearch" size="sm" autocomplete="off" placeholder="Meklēt"
    ></b-form-input>
    <div class="mwe-list mt-3">
      <b-list-group>
        <b-list-group-item
                v-if="mwe.senses.length"
                class="p-1"
                v-for="(mwe, mwe_idx) in searchQueryMWEs" :key="mwe.human_key">
          <div :class="`${id}-${mwe_idx}`">
            <span class="sv_FR">{{mwe.full_heading}}</span>
            <b-button
                    v-for="(sense, index) in mwe.senses"
                    :key="sense.id"
                    class="m-1 p-1"
                    size="sm"
                    :class="{ active: isActive(sense.id) }"
                    variant="outline-secondary"
                    @click="$emit('toggle-example-to-sense', sense.id, sense.entry_id, false)"
            >{{ index+1 }}
            </b-button>
            <div v-if="mwe.senses.length > 1"
                 v-for="(sense, index) in mwe.senses" :key="sense.id+ '1'">
              <small class="mwe_Gloss">{{index+1}}. {{sense.gloss}}</small>
            </div>
          </div>
        </b-list-group-item>
      </b-list-group>
    </div>
  </b-modal>
</template>

<script>
  module.exports = {
    props: ['mwes', 'id', 'activeSenseId'],
    data: function () {
      return {
        MWESearch: null,
        tippyConfig: {trigger: 'mouseenter', allowHTML: true, placement: 'left'}
      }
    },
    computed: {
      searchQueryMWEs: function () {
        if (this.MWESearch) {
          return this.mwes.filter((mwe) => {
            return this.MWESearch.toLowerCase().split(' ').every(v => mwe.full_heading.toLowerCase().includes(v))
          })
        }
        return this.mwes;
      }
    },
    methods: {
      isActive: function (id) {
        return this.activeSenseId && this.activeSenseId === id;
      }
    }
  }
</script>
<style scoped>
  .mwe-list {
    overflow-y: auto;
    max-height: 350px;
  }
  .mwe_Gloss {
    font-weight: 300;
  }
</style>