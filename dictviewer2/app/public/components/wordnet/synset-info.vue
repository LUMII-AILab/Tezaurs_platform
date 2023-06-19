<template>
  <div>
    <div :class="allowEdit ? 'card' : ''">
      <div :class="allowEdit ? 'card-body p-3' : ''">
        <div v-if="synset.score" class="font-weight-light small">{{synset.score}}</div>
        <div v-if="synset.display_relation" class="text-info font-weight-light small">{{synset.display_relation}}</div>
        <span v-if="synset.pos" class="text-info">({{synset.display_pos}})</span>
        <!--<span v-if="synset.synset_id">{</span>-->
        <span v-for="(s, i) in synset.senses" :key="i" class="synset-short">
          {{ s.text }}<sub>{{ s.parent_order_no ? `${s.parent_order_no}.${s.order_no}` : s.order_no }}</sub><b-icon v-if="edit"
                  icon="trash"
                  variant="secondary"
                  class="remove-sense"
                  v-b-tooltip.hover title="Izņemt no sinonīmu kopas"
                  @click="removeSense(s.sense_id)"
          ></b-icon><span v-if="synset.senses && i !== synset.senses.length - 1">, </span>
        </span>
        <!--<span v-if="synset.synset_id">}</span>-->

        <span v-if="allowEdit && synset.synset_id" class="synset-short">
          <b-button size="sm" variant="secondary" @click="edit = !edit" :title="edit ? 'Beigt rediģēt' : 'Rediģet'">
            <i class="fas" :class="edit ? 'fa-times' : 'fa-pen'"></i>
          </b-button>
        </span>

        <div v-if="synset.gloss" class="synset-gloss">{{synset.gloss}}</div>

        <synset-sense v-if="(details || edit) && synset.senses && !synset.gloss"
                      v-for="sense in synset.senses"
                      :key="sense.sense_id"
                      small
                      :sense="sense"></synset-sense>
      </div>
    </div>

    <dictionary title="Sinonīmu vārdnīca" :entries="synset.synonyms" :modes="['senses', 'subsenses']"></dictionary>
    <dictionary title="Tulkojumi" :entries="synset.translations" :modes="['pwn', 'pwn_prefix']"></dictionary>

  </div>
</template>

<script>
  module.exports = {
    props: ['synset', 'details', 'allowEdit'],
    data() {
      return {
        edit: false,
        data: {synset_id: null}
      }
    },
    watch: {
      synset: function(s) {
        if (!s.synset_id) this.edit = false;
      }
    },
    methods: {
      removeSense(sense_id) {
        this.data.sense_id = sense_id;

        submitForm(this, 'patch', `/api/wordnet/synset/change`, null, {
          onSuccess: () => {
            this.$emit('update-synset');
          }
        });
      }
    }
  }
</script>
<style scoped>
  .synset-short {
    font-weight: 500;
    font-size: 1rem;
  }

  .synset-gloss {
    font-size: 0.9rem;
    font-weight: 300;
  }

  .remove-sense:hover {
    color: red !important;
    cursor: pointer;
  }

  .synonym {
    cursor: pointer;
  }
  .synonym:hover {
    color: green;
  }
</style>

