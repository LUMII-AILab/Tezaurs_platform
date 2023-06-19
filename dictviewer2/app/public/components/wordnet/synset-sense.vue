<template>
  <div :class="small ? 'small' : ''">
    <span class="synset-sense">{{ sense.text }}<sub>{{ sense.parent_order_no ? `${sense.parent_order_no},${sense.order_no}` : sense.order_no }}</sub>
    </span>
    <span v-if="sense.verbalization" class="dict_Verbalization">{{sense.verbalization}}</span>
    <div v-if="sense.parent_gloss">
      <div class="synset-gloss">{{sense.parent_gloss}}</div>
      <div class="synset-gloss ml-2">// {{sense.gloss}}</div>
    </div>
    <div v-else class="synset-gloss">{{sense.gloss}}</div>

    <span v-if="sense.data && sense.data.Gram && sense.data.Gram.Flags">
      <span v-b-tooltip.html :title="boxify(format_kvp_table(sense.data.Gram.Flags))">
        <i class="fas fa-flag text-success"></i>
      </span>
    </span>
    <span v-if="sense.data && sense.data.Gram && sense.data.Gram.StructuralRestrictions">
      <span v-b-tooltip.html :title="boxify(rsr(sense.data.Gram.StructuralRestrictions))">
        <i class="fas fa-gavel text-success"></i>
      </span>
    </span>
  </div>
</template>

<script>
  module.exports = {
    props: {sense: Object, small: Boolean},
    methods: {
      format_kvp_table: flags => `<table class='tooltip-table'>${Object.keys(flags).map(k => `<tr><th>${k}:</th><td>${Array.isArray(flags[k]) ? flags[k].join(', ') : flags[k]}</td></tr>`).join('')}</table>`,
      boxify: text => `<div style='font-size: 0.8em;'>${text}</div>`,
      simple_sr(sr) { return `${sr.Frequency || ''} ${(sr.Restriction || '').toLowerCase()}${sr.Value ? ' ➤ ' : ''}${sr.Value && sr.Value.Flags ? ' karogi: ' + JSON.stringify(sr.Value.Flags) : ''}${sr.Value && sr.Value.LanguageMaterial ? ' LM: "' + sr.Value.LanguageMaterial + '"' : ''}` },
      rsr(sr) { return sr.AND ? this.andify(sr.AND) : (sr.OR ? this.orify(sr.OR) : (sr.NOT ? this.notify(sr.NOT) : this.simple_sr(sr))) },
      andify(srs) { return `(${srs.map(x => this.rsr(x)).join(' UN ')})` },
      orify(srs) { return `(${srs.map(x => this.rsr(x)).join(' VAI ')})`},
      notify(sr) { return `NE(${this.rsr(sr)})` }
    }
  }
</script>
<style scoped>
  .synset-sense {
    font-size: 1rem;
    font-weight: 500;
  }

  .synset-gloss {
    font-size: 0.9rem;
    font-weight: 300;
  }

  .small .synset-sense {
    font-size: .9rem;
    font-weight: 400;
  }

  .small .synset-gloss {
    font-size: .9rem;
    display: inline;
  }
</style>

