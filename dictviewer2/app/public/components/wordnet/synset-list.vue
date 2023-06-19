<!--
A list of synset relations.
Has three modes:
1. each synset has a dropdown for adding a relation
2. each synset has a button for removing it as a relation
3. no buttons - just display
-->
<template>
  <div>
    <p class="sv_Section title mb-2" v-if="title">{{title}}</p>
    <div class="synset-list-wrapper" :class="relationList ? '' : 'min'">
      <b-list-group class="synset-list mr-2">
        <div
                v-for="(item, index) in items"
                :key="index"
                :class="((item.synset_id || item.remote_id) && !relationList && showRelations) ? 'show-list' : ''"
                class="synset-list-item pl-3">
          <div class="d-flex justify-content-between p-2 pl-0 list-content"
               @click="openRelations(item)">
            <slot v-bind:item="item"></slot>

            <div class="ml-1" v-if="!displayOnly">
              <b-button-group vertical>
                <b-button v-if="!relationList && item.pwn"
                          size="sm" variant="outline-success"
                          v-b-tooltip.hover.left :title="addTitle"
                          @click="addRelation(item, 'omw')"
                ><b-icon icon="link"></b-icon>
                </b-button>
                <b-dropdown v-if="!relationList && item.pwn"
                            v-b-tooltip.hover.left title="Plašāka/šaurāka"
                            size="sm" variant="outline-success" class="m-0">
                  <b-dropdown-item-button @click="addRelation(item, 'eq_has_hyperonym')">LV šaurāka nozīme</b-dropdown-item-button>
                  <b-dropdown-item-button @click="addRelation(item, 'eq_has_hyponym')">LV plašāka nozīme</b-dropdown-item-button>
                </b-dropdown>
                <b-button v-if="!relationList && !item.pwn"
                          size="sm" variant="outline-success"
                          v-b-tooltip.hover.left :title="addTitle"
                          @click="addRelation(item, 'synset')"
                ><b-icon icon="plus"></b-icon>
                </b-button>
                <b-button v-if="relationList && !item.pwn && item.senses[0].relation_id"
                          size="sm" variant="outline-danger"
                          v-b-tooltip.hover.left title="Noņemt saiti"
                          @click="removeRelation(item.senses[0].relation_id)"
                ><b-icon icon="trash"></b-icon>
                </b-button>
                <b-button v-if="relationList && item.pwn && item.link_id"
                          size="sm" variant="outline-danger"
                          v-b-tooltip.hover.left title="Noņemt saiti"
                          @click="removeExternalLink(item.link_id)"
                ><b-icon icon="trash"></b-icon>
                </b-button>
                <b-button v-if="relationList && !item.pwn && item.gradset_attribute === false"
                          size="sm" variant="outline-danger"
                          v-b-tooltip.hover.left title="Izņemt no grupas"
                          @click="removeFromGradset(item.synset_id)"
                ><b-icon icon="trash"></b-icon>
                </b-button>
                <b-button v-if="relationList && !item.pwn && item.gradset_attribute"
                          size="sm" variant="outline-danger"
                          v-b-tooltip.hover.left title="Noņemt grupas nosaukumu"
                          @click="addRelation(null, 'gradset_attribute')"
                ><b-icon icon="trash"></b-icon>
                </b-button>
                <b-dropdown v-if="!relationList && !item.pwn"
                            v-b-tooltip.hover.left title="Pievienot ar saiti"
                            size="sm" variant="outline-success" class="m-0">
                  <b-dropdown-item-button @click="addRelation(item, 'hypernymy')">Hiperonīms/Virsjēdziens</b-dropdown-item-button>
                  <b-dropdown-item-button @click="addRelation(item, 'hyponymy')">Hiponīms/Apakšjēdziens</b-dropdown-item-button>
                  <b-dropdown-item-button @click="addRelation(item, 'holonymy')">Holonīms/Veselums</b-dropdown-item-button>
                  <b-dropdown-item-button @click="addRelation(item, 'meronymy')">Meronīms/Daļa</b-dropdown-item-button>
                  <b-dropdown-item-button @click="addRelation(item, 'antonymy')">Antonīms</b-dropdown-item-button>
                  <b-dropdown-item-button @click="addRelation(item, 'similarity')">Aptuvens sinonīms</b-dropdown-item-button>
                  <b-dropdown-item-button @click="addRelation(item, 'see also')">Saistīts ar</b-dropdown-item-button>
                  <b-dropdown-item-button @click="addRelation(item, 'gradset')">Gradācijas jēdzienu grupa</b-dropdown-item-button>
                  <b-dropdown-item-button @click="addRelation(item, 'gradset_attribute')">Gradācijas jēdzienu grupas nosaukums</b-dropdown-item-button>
                </b-dropdown>
              </b-button-group>
            </div>
          </div>
        </div>
      </b-list-group>
    </div>
  </div>
</template>

<script>
  module.exports = {
    props: ['items', 'addTitle', 'mainSynset', 'title', 'relationList', 'displayOnly', 'showRelations', 'hasEqOmw'],
    data: function () {
      return {
        data: {
          a: this.getSynsetIds(this.mainSynset),
          b: {sense_id: null, synset_id: null},
          type: 'synset'
        },
        error: null
      }
    },
    inject: ['showWarning'],
    watch: {
      mainSynset: function (newValue) {
        this.data.a = this.getSynsetIds(newValue);
      },
      error: function (newValue) {
        this.$emit('error', newValue);
      }
    },
    methods: {
      getSynsetIds(synset) {
        if (synset && synset.sense_id) {
          return {sense_id: synset.sense_id, synset_id: synset.synset_id};
        } else {
          return {sense_id: null, synset_id: null};
        }
      },
      submitAddRelation(item, type) {
        this.data.b = (item && item.remote_id) ? {synset_id: item.remote_id} : this.getSynsetIds(item);
        this.data.type = type;

        submitForm(this, 'post', `/api/wordnet/synset/create`, null, {
          onSuccess: () => {
            if (item) this.$emit('update-synset');
            else this.$emit('update-relations');
          }
        });
      },
      addRelation(item, type) {
        if (type === 'omw' && this.hasEqOmw) {
          this.showWarning('Nozīmei jau ir viena atbilstoša angļu nozīme. Vai vēlies pievienot vēl vienu?', () => this.submitAddRelation(item, type));
        } else {
          this.submitAddRelation(item, type);
        }
      },
      hasOWNRelation() {

      },
      removeRelation(relationId) {
        axios.delete('/api/wordnet/synset/relations/' + relationId)
          .then(() => {
            this.$emit('update-relations');
          })
      },
      removeExternalLink(linkId) {
        axios.delete('/api/wordnet/synset/external_links/' + linkId)
          .then(() => {
            this.$emit('update-relations');
          })
      },
      removeFromGradset(synsetId) {
        axios.patch('/api/wordnet/synset/' + synsetId, {gradset_id: null})
          .then(() => {
            this.$emit('update-relations');
          })
      },
      openRelations(item) {
        if (item.synset_id && this.showRelations)
          this.$emit('open-relations', item.synset_id);
        else if (item.remote_id && this.showRelations)
          this.$emit('open-relations', item.remote_id, 'omw');
      }
    }
  }
</script>

<style>
  .relation-list .synset-list-wrapper {
    max-height: inherit;
  }

  .synset-list-wrapper {
    max-height: 50vh;
    overflow-y: auto;
  }
  .synset-list-wrapper.min {
    min-height: 330px;
  }

  .synset-list {
    background-color: #f6f6f6;
  }

  .list-content {
    border-bottom: 1px solid white;
    padding: .5rem .5rem .5rem 0 !important;
  }

  .synset-list-item:first-child {
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
  }

  .synset-list-item:last-child {
    border-bottom-right-radius: inherit;
    border-bottom-left-radius: inherit;
  }

  .synset-list-item:last-child .list-content {
    border-bottom: none;
  }

  .synset-list-item.show-list:hover {
    background-color: #e0e0e0;
  }

  .synset-list-item.show-list {
    cursor: pointer;
  }

  .title {
    font-weight: 400;
    font-size: 110%;
  }
</style>
