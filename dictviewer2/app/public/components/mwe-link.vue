<template>
  <b-link target="_blank" :href="link">
    <slot></slot>
  </b-link>
</template>

<script>
  module.exports = {
    props: ['human_key'],
    data() {
      const searchParams = new URLSearchParams(this.$root.searchParams);
      return {
        link: searchParams.word
          ? `/${encodeURIComponent(this.human_key)}?${searchParams.toString()}`
          : `/${encodeURIComponent(this.human_key)}`
      }
    },
    mounted() {
    },
    watch: {
      '$root.searchParams': function (newValue, oldValue) {
        const searchParams = new URLSearchParams(newValue);
        this.link = `/${this.human_key}?${searchParams.toString()}`
      }
    }
  }
</script>
