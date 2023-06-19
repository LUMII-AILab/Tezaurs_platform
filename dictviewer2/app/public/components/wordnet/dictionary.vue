<template>
  <b-card v-if="entries" class="mt-3" body-class="p-2">
    <div class="text-right sv_Section m-0">{{title}}</div>
    <div v-for="(entriesForSense, i) in entries" :key="i" class="m-1">
      <div v-for="(entry, j) in entriesForSense" :key="j">
        <span class="synset-short">{{entry.left}}</span> -
        <small v-for="(word, k) in entry.right" :key="k"
               class="synonym"
               @click="$parent.$emit('fill', word.trim(), modes)">
          <span v-if="k!==0">,</span> {{word}}</small>
      </div>
    </div>
  </b-card>
</template>

<script>
  module.exports = {
    props: ['entries', 'title', 'modes']
  }
</script>
