<template>
  <div>
    <div v-if="value == null">
      <b-button @click="addItem()" size="sm"><i class="fas fa-plus"></i></b-button>
    </div>
    <div v-else-if="value.hasOwnProperty('AND')" class="item-wrapper">
      <div class="item-header-wrapper">
        <div class="item-header">
          <div>AND</div>
          <b-button-group size="sm">
            <b-button @click="andItem()"><i class="fas fa-plus"></i></b-button>
            <b-button v-if="this.parent !== 'OR'" @click="orItem()">OR</b-button>
            <b-button @click="deleteItem()"><i class="fas fa-trash"></i></b-button>
          </b-button-group>
        </div>
      </div>
      <div class="item item-group">
        <div v-for="(item, i) in value['AND']" :key="i">
          <restrictions-input v-model="value['AND'][i]" :index="i" @delete-item="onDeleteItem" parent="AND"></restrictions-input>
        </div>
      </div>
    </div>
    <div v-else-if="value.hasOwnProperty('OR')" class="item-wrapper">
      <div class="item-header-wrapper">
        <div class="item-header">
          <div>OR</div>
          <b-button-group size="sm">
            <b-button @click="orItem()"><i class="fas fa-plus"></i></b-button>
            <b-button v-if="this.parent !== 'AND'" @click="andItem()">AND</b-button>
            <b-button @click="deleteItem()"><i class="fas fa-trash"></i></b-button>
          </b-button-group>
        </div>
      </div>
      <div class="item item-group">
        <div v-for="(item, i) in value['OR']" :key="i">
          <restrictions-input v-model="value['OR'][i]" :index="i" @delete-item="onDeleteItem" parent="OR"></restrictions-input>
        </div>
      </div>
    </div>
    <div v-else class="item-wrapper">
      <div class="item-header-wrapper">
        <div class="item-header">
        <div>●</div>
        <b-button-group size="sm">
        <b-button v-if="this.parent !== 'OR'" @click="orItem()">OR</b-button>
        <b-button v-if="this.parent !== 'AND'" @click="andItem()">AND</b-button>
        <b-button @click="deleteItem()"><i class="fas fa-trash"></i></b-button>
      </b-button-group>
        </div>
      </div>
<!--      <div class="item">{{ JSON.stringify(value, null, 2) }}</div>-->
      <div class="item item-leaf">
        <restrictions-item-input v-model="this.value"></restrictions-item-input>
      </div>
    </div>

  </div>

</template>

<script>
  module.exports = {
    props: {
      value: {required: true},
      index: {},
      parent: {},
    },

    methods: {
      addItem() {
        this.$emit('input', {});
      },
      andItem() {
        console.log('andItem()')
        let newValue = _.cloneDeep(this.value);
        if (newValue.hasOwnProperty('AND')) {
          newValue['AND'].push({});
        } else {
          newValue = {AND: [newValue, {}]}
        }
        console.log('andItem() result', newValue)
        this.$emit('input', newValue);
      },
      orItem() {
        let newValue = _.cloneDeep(this.value);
        if (newValue.hasOwnProperty('OR')) {
          newValue['OR'].push({});
        } else {
          newValue = {OR: [newValue, {}]}
        }
        this.$emit('input', newValue);
      },
      deleteItem() {
        console.log('deleteItem', this.index, this.value)
        if (this.index == null) {
          this.$emit('input', null);
        } else {
          this.$emit('delete-item', this.index);
        }
      },
      onDeleteItem(index) {
        console.log('onDeleteItem', index)
        let newValue = _.cloneDeep(this.value);
        (newValue.OR || newValue.AND).splice(index, 1)
        if ((newValue.OR || newValue.AND).length === 0) {
          this.$emit('delete-item', this.index);
        } else if ((newValue.OR || newValue.AND).length === 1) {
          this.$emit('input', (newValue.OR || newValue.AND)[0]);
        } else {
          this.$emit('input', newValue);
        }
      }
    }
  }
</script>

<style>
  .item-wrapper {
  }

  .item-header-wrapper {
    display: flex;
  }

  .item-wrapper .item-wrapper .item-header-wrapper::before {
    content: '';
    width: 10px;
    border-top: 1px solid #ccc;
    top: 13px;
    position: relative;
  }

  .item-header {
    flex: 1;
    padding-left: 5px;
    background: #6c757d;
    color: #fff;
    /*background: #3c3c3c42;*/
    display: flex;
    justify-content: space-between;
    flex-direction: row;
  }

  .item-wrapper .item-wrapper .item-header {
    margin-top: 6px;
  }

  .item {
    margin-left: 20px;
  }

  .item-group {
    border-left: 1px solid #3c3c3c42;
  }

  .item-leaf > div {
    padding-left: 5px;
  }
</style>
