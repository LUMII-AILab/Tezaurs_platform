<template>
  <div class="restriction-item-input">
    <b-form-group label="Ierobežojums"><v-select :options="this.values.grammar_restriction_types.map(e => e.caption)" :value="value.Restriction" @input="v => onRestrictionInput(v)"></v-select></b-form-group>
    <b-form-group label="Biežums"><v-select :options="this.values.grammar_restriction_frequencies.map(e => e.caption || '')" v-model="value.Frequency"></v-select></b-form-group>
    <b-form-group v-if="value.Restriction !== 'Vispārīgais lietojuma biežums'" label="Karodziņi"><flag-input :value="value.Value && value.Value.Flags" @input="v => $set(value, 'Value', Object.assign({}, value.Value, {Flags: v}))" scope="R"></flag-input></b-form-group>
    <b-form-group v-if="value.Restriction !== 'Vispārīgais lietojuma biežums'" label="Valodas materiāls"><b-form-input :value="value.Value && value.Value.LanguageMaterial && value.Value.LanguageMaterial.length > 0 && value.Value.LanguageMaterial.join(' | ')" @input="v => $set(value, 'Value', Object.assign({}, value.Value, {LanguageMaterial: v ? v.split(/\s*\|\s*/) : null}))"></b-form-input></b-form-group>
  </div>
</template>

<script>
  module.exports = {
    props: {
      value: {
        required: true
      },
    },
    computed: {
      values: function () {return window.values;}
    },
    methods: {
      onRestrictionInput: function (v) {
        Vue.set(this.value, 'Restriction', v);
        if (v === 'Vispārīgais lietojuma biežums') {
          Vue.set(this.value, 'Value', null);
        }
      }
    }
  }
</script>

<style>
  .restriction-item-input .form-group.form-group {margin-bottom: 5px;}
</style>
