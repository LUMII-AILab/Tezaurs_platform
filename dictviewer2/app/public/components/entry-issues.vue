<template>
  <div>
    <a v-if="feedbacks.length > 0 || queries.length > 0"
       role="button" @click="visible = !visible">
      <span class="dict_Section">Problēmas un ziņojumi</span>
      <i class="fas link-icon" :class="[visible ? 'fa-minus-circle' : 'fa-plus-circle']"></i>
    </a>
    <b-collapse v-model="visible">
      <b-row>
        <b-col cols="6" v-if="feedbacks.length > 0">
          <div class="sv_Section">Lietotāju ziņojumi:</div>
          <feedback-list :feedbacks="feedbacks" :visible-status="visibleStatus"></feedback-list>
        </b-col>
        <b-col cols="6" v-if="queries.length > 0">
          <div class="sv_Section">No vaicājumiem:</div>
          <ul>
            <li v-for="(query, i) in queries" :key="i">
              <a :href=`/_q/${query.name}` target="_blank">{{query.caption}}</a>
            </li>
          </ul>
        </b-col>
      </b-row>
    </b-collapse>
  </div>
</template>

<script>
  module.exports = {
    props: ['entry_id'],
    data() {
      return {
        queries: [],
        feedbacks: [],
        visible: false,
        visibleStatus: [0]
      }
    },
    mounted() {
      this.getIssues()
    },
    watch: {
      visible: function (newValue) {
        if (newValue) {
          this.getIssues();
        }
      }
    },
    methods: {
      getIssues() {
        axios.get(`/_issues/api/list/${this.entry_id}/true`)
          .then((r) => {
            if (!r.data.error) {
              this.queries = r.data.queries[this.entry_id];
              this.feedbacks = r.data.feedbacks;
            }
          })
          .catch((r) => console.log(r))
      }
    }
  }
</script>
<style scoped>
  .link-icon {
    color: grey;
    margin-left: 0.3em;
  }
</style>
