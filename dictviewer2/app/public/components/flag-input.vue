<template>
  <div>

    <div v-for="(item, index) in value" :key="index">
      <div class="d-flex">
        <label class="col-sm-3 text-right">{{index}}: </label>
        <v-select
          v-if="(this.values.flags.find(e => e.id === index) || {}).permitted_values === 'E'"
          :ref='index'
          class='w-100'
          :options="(this.values.flags.find(e => e.id === index) || {}).values || []"
          :multiple="(this.values.flags.find(e => e.id === index) || {}).is_multiple"
          v-model="value[index]"
        ></v-select>
        <text-input
          v-else
          :ref='index'
          class='pb-1 w-100'
          :multiple="(this.values.flags.find(e => e.id === index) || {}).is_multiple"
          v-model="value[index]"
        ></text-input>
        <div class="flex-shrink-1"><a class="btn btn-link btn-md text-danger" @click="removeFlag(index)"><i class="fas fa-trash"></i></a></div>
      </div>
    </div>
    <v-select
      ref='flagSelect'
      placeholder="Pievienot ..."
      :options="this.values.flags.filter(e => !this.scope || e.scope.includes(this.scope))"
      @input="this.addFlag"
      :reduce="e => e.id"
      label="id"
    ></v-select>
  </div>
</template>

<script>
  module.exports = {
    props: {
      value: {
        required: true
      },
      scope: {
        type: String
      }
    },

    watch: {
      value() {
          this.$emit('input', this.value);
      }
    },

    computed: {
      values: function () {return window.values;}
    },

    methods: {
      addFlag(flag) {
        if (flag) {
          this.$emit('input', {...this.value, [flag]: null});
          this.$nextTick(() => {
            this.$refs.flagSelect.clearSelection();

            // Wait a little bit while all inputs are rendered in next ticks
            setTimeout(() => {
              if (this.$refs[flag][0].$refs.search) {
                this.$refs[flag][0].$refs.search.focus();
              }
              else if (this.$refs[flag][0].$refs.input) {
                this.$refs[flag][0].$refs.input.focus();
              }
              else if (this.$refs[flag][0].$refs.inputs && this.$refs[flag][0].$refs.inputs.length) {
                this.$refs[flag][0].$refs.inputs[0].focus();
              }
            }, 50);
          })
        }
      },
      removeFlag(flag) {
        const newValue = {...this.value};
        delete newValue[flag];
        this.$emit('input', newValue);
      }
    }
  }
</script>
