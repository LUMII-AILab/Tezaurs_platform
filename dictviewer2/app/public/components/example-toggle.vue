<template>
  <span class="ml-1">
    <i v-if="$root.editing"
       class="fas toggle" :class="showAsHidden ? 'fa-eye-slash' : 'fa-eye'"
       :style="{color: showAsHidden ? 'red' : 'lightgrey'}"
       v-b-hover="hover"
       @click="submit"></i>
    <i v-if="!$root.editing && data.hidden" class="fas fa-eye-slash" style="color: red"></i>
  </span>
</template>

<script>
  const defaultData = {data: {Gram: {}}};
  module.exports = {
    props: ['idata', 'entry_id', 'sense_id'],
    data: function () {
      const data = extendDefault(defaultData, JSON.parse(this.idata));
      return {
        data: data,
        showAsHidden: data.hidden,
        error: null,
        submitting: false,
        id: uuid(),
      }
    },
    inject: ['setLoading'],
    methods: {
      submit: function() {
        this.data.hidden = !this.data.hidden;
        submitForm(
          this, 'patch', `/api/entries/${this.entry_id}/senses/${this.sense_id}/examples/${this.data.id}`, this.id,
          {onSuccess: (data) => {this.data.hidden = data.hidden}}
        );
      },
      reset: function() {
        this.data = extendDefault(defaultData, JSON.parse(this.idata))
      },
      hover: function(isHovered) {
        this.showAsHidden = isHovered ? !this.data.hidden : this.data.hidden;
      }
    },
  }
</script>
<style scoped>
  .toggle {
    cursor: pointer;
  }
</style>
