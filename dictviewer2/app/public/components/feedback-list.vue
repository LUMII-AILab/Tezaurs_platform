<template>
  <b-list-group>
    <b-list-group-item class="p-2" v-for="(feedback, i) in visibleFeedbacks" :key="feedback.id">
      <div class="d-flex w-100 justify-content-start">
        <div class="info-btn-box">
          <div v-if="feedback.status === 0">
            <small class="text-primary">Jauns</small>
            <br />
            <b-button size="sm" variant="outline-success"
                      v-b-tooltip.hover title="Salabots"
                      @click="updateFeedback(feedback, i, 'done')"
            ><b-icon icon="check"></b-icon></b-button>
            <b-button size="sm" variant="outline-secondary"
                      v-b-tooltip.hover title="Atlikt"
                      @click="updateFeedback(feedback, i, 'postpone')"
            ><b-icon icon="archive"></b-icon></b-button>
            <b-button size="sm" variant="outline-warning"
                      v-b-tooltip.hover title="Deleģēt"
                      @click="updateFeedback(feedback, i, 'delegate')"
            ><b-icon icon="forward"></b-icon></b-button>
            <b-button size="sm" variant="outline-danger"
                      v-b-tooltip.hover title="Atkritums"
                      @click="updateFeedback(feedback, i, 'spam')"
            ><b-icon icon="x"></b-icon></b-button>
          </div>
          <div v-else-if="feedback.status === 1" >
            <small class="text-success">Salabots</small>
          </div>
          <div v-else-if="feedback.status === 2" >
            <small class="text-secondary">Atlikts</small>
            <br />
            <b-button size="sm" variant="outline-success"
                      v-b-tooltip.hover title="Salabots"
                      @click="updateFeedback(feedback, i, 'done')"
            ><b-icon icon="check"></b-icon></b-button>
          </div>
          <div v-else-if="feedback.status === 3" >
            <small class="text-danger">Atkritums</small>
            <br />
            <b-button size="sm" variant="outline-primary"
                      v-b-tooltip.hover title="Jauns"
                      @click="updateFeedback(feedback, i, 'reset')"
            ><b-icon icon="arrow90deg-left"></b-icon></b-button>
          </div>
          <div v-else-if="feedback.status === 4" >
            <small class="text-warning">Deleģēts</small>
            <br />
            <b-button size="sm" variant="outline-success"
                      v-b-tooltip.hover title="Salabots"
                      @click="updateFeedback(feedback, i, 'done')"
            ><b-icon icon="check"></b-icon></b-button>
            <b-button size="sm" variant="outline-secondary"
                      v-b-tooltip.hover title="Atlikt"
                      @click="updateFeedback(feedback, i, 'postpone')"
            ><b-icon icon="archive"></b-icon></b-button>
          </div>
          <div v-else>
            <small class="text-danger">unk</small>
          </div>
        </div>
        <div class="wrap">
          <p class="message-text m-0" style="white-space: pre-line;">{{ feedback.text }}</p>
          <small class="d-block text-muted text-left mt-1 message-date">
            {{ new Date(feedback.created_at).toDateString().slice(4) }},
            {{ new Date(feedback.created_at).toTimeString().slice(0, 5) }}
          </small>
        </div>
      </div>
    </b-list-group-item>
  </b-list-group>
</template>

<script>
  module.exports = {
    props: ['feedbacks', 'visibleStatus'],
    computed: {
      visibleFeedbacks: function() {
        return this.feedbacks.filter(f => this.visibleStatus.includes(f.status))
      }
    },
    methods: {
      updateFeedback(feedback, index, action) {
        let url = `/_issues/api/feedback/${action}`;
        axios.post(url, feedback)
          .then((r) => {
            if (r.data.error) throw Error(r.data.error);
            this.feedbacks.splice(index, 1);
            if (this.feedbacks.length === 0) {
              this.$emit('no-feedbacks');
            }
          })
          .catch(e => this.$bvModal.msgBoxOk(`${'POST'} ${url}\n${e}`, {title: 'Kļūda', bodyTextVariant: 'danger'}))
      },
    }
  }
</script>
<style scoped>
  .btn-group-sm > .btn, .btn-sm {
    padding: .2rem .2rem;
    font-size: 0.8rem;
    line-height: 0.8;
    border-radius: .2rem;
  }
  .message-text {
    font-size: 90%;
  }
  .message-date {
    font-size: 70%;
  }
  .wrap {
    word-break: break-word;
  }
  .info-btn-box {
    min-width: 54px;
    margin-right: .75rem;
  }
</style>