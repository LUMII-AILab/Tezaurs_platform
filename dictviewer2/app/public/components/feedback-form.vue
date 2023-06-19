<template>
  <div>
    <input v-if="!showForm" type="button" @click="showForm = !showForm" class="feedback-button" value="Ziņot">
    <input v-if="showForm" type="button" @click.prevent="submit" class="feedback-button" value="Nosūtīt">
    <div class="feedback-status">
      <span v-if="ok" class="status-ok">Paldies!</span>
      <span v-if="error" class="status-fail">Neizdevās...</span>
    </div>
    <textarea v-if="showForm" cols="30" rows="10" v-model="data.text" class="feedback-text mt-1"
              placeholder='Vai pamanījāt šajā šķirklī kādu kļūdu vai nepilnību?'>
    </textarea>
  </div>
</template>

<script>
  module.exports = {
    props: ['entry_id'],
    data: function () {
      return {
        data: {
          entry_id: this.entry_id,
          text: null,
        },
        showForm: false,
        error: null,
        ok: null
      }
    },
    watch: {
      error: function () {
        setTimeout(() => this.error = null, 3000);
      }
    },
    methods: {
      submit() {
        submitForm(this, 'post', `/_issues/api/feedback/create`, this.id,
          {onSuccess: this.success, withoutToast: true}
        );
      },
      success(data) {
        this.showForm = false;
        this.data.text = null;
        this.ok = true;
        setTimeout(() => this.ok = null, 3000);
      }

    }
  }
</script>