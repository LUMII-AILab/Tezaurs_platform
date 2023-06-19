<template>
  <div>
    <div v-if="this.multiple">
      <div v-for="(item, index) in _value" class="d-flex">
        <div class="input-group input-group-sm">
          <div class="input-group-prepend">
            <a class="btn btn-outline-primary" @click="addItem(index)"><i class="fas fa-plus"></i></a>
            <a v-if="_value.length > 1" class="btn btn-outline-danger" @click="removeItem(index)"><i class="fas fa-trash"></i></a>
          </div>
          <b-form-input
            ref='inputs'
            :value="_value[index]"
            @input="setItem(index, arguments[0])"
            @keyup.enter="onEnter(index)"
            @keyup.delete="onDelete(index, arguments[0])"
          ></b-form-input>
          <div v-if="index + 1 === _value.length" class="input-group-append">
            <a class="btn btn-outline-primary" @click="addItem(_value.length)"><i class="fas fa-plus"></i></a>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <b-form-input ref='input' v-model="_value" class="form-control-sm"></b-form-input>
    </div>
  </div>
</template>

<script>
  module.exports = {
    props: ['value', 'multiple'],
    computed: {
      _value: {
        get: function () {
          return this.value || (this.multiple ? [''] : '')
        },
        set: function (value) {
          this.$emit('input', value)
        }
      }
    },
    methods: {
      setItem(index, value) {
        let newValue = [...(this.value || [])];
        newValue[index] = value;
        this.$emit('input', newValue);
      },
      addItem(index) {
        let newValue = [...(this.value || [])];
        newValue.splice(index, 0, '');
        this.$emit('input', newValue);
      },
      removeItem(index) {
        let newValue = [...(this.value || [])];
        newValue.splice(index, 1);
        this.$emit('input', newValue);
      },
      onDelete(index, e) {
        if (!e.target.value && this._value.length > 1) {
          let newValue = [...(this._value || [])];
          newValue.splice(index, 1);
          this.$emit('input', newValue);
          this.$nextTick(() => {
            this.$refs.inputs[Math.max(index - 1, 0)].focus();
          })
        }
      },
      onEnter(index) {
        if (!this._value || this._value.length === index + 1) {
          let newValue = [...(this._value || []), ''];
          this.$emit('input', newValue);
        }
        this.$nextTick(() => {
          this.$refs.inputs[index + 1].focus();
        })
      }
    }
  }
</script>
