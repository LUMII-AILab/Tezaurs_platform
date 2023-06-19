<!--
A wrapper around the list of relations for a single synset.
Includes the graph, some loading related info, and the actual list.
From here the call to load the relations is made (done when mounted).

Has two modes.
One for just displaying.
The other with edit functionality <- This also has subcategories: see synset-list.
-->
<template>
  <div>
    <div class="d-flex justify-content-between">
      <p class="sv_Section title mb-2">Saites</p>
      <div>
        <!--<b-button v-if="!displayOnly" id="wordnetGraphButton" size="sm" class="mr-2" variant="outline-secondary" title="Ctrl+g"-->
                  <!--modal="wordnetGraphModal" @click="openModal" :data="JSON.stringify({synset, synsetId})">-->
          <!--<b-icon-arrows-angle-expand></b-icon-arrows-angle-expand>-->
        <!--</b-button>-->
        <b-button size="sm" v-if="!displayOnly" @click="largeNetwork = !largeNetwork" title="Ctrl+g">
          <b-icon :icon="largeNetwork ? 'list-ul' : 'diagram3-fill'"></b-icon>
        </b-button>
      </div>
    </div>

    <!-- The wordnet graph. There is a toggle to open in fullscreen. -->
    <div v-if="!displayOnly" class="network-section" :class="{ large: largeNetwork, fullscreen: fullscreen }">
      <wordnet-graph class="network" :synset-id="synsetId" :synset="synset"></wordnet-graph>
    </div>

    <div class="relation-list" :class="{ large: largeNetwork, sm: small }">
      <div class="text-center">
        <b-spinner class="m-3" v-if="loading"></b-spinner>
      </div>
      <div v-if="!isEmpty()" v-for="(relations, relationType, i) in allRelations">
        <a class="sv_Section relation-link" v-b-toggle="i + '-' + synsetId">{{relationTypeTranslations[relationType]}}:</a>

        <b-collapse :id="i + '-' + synsetId" visible>
          <synset-list :items="relations"
                       :main-synset="synset"
                       :relation-list="true"
                       :display-only="displayOnly"
                       v-on:update-relations="getRelations">
            <template v-slot:default="props">
              <div v-if="relationType === 'gradset' || relationType === 'gradset_of_attribute'">
                <!-- Special case: the (optional) name of the gradset -->
                <div class="mr-2 font-weight-light underline small" v-if="props.item.gradset_attribute">Nosaukums</div>
                <!-- The actual gradset. Gradsets are a group of senses.
                     Note: here for convenience they are displayed as group of one-sense synsets.  -->
                <synset-info :synset="props.item" :details="props.item.gradset_attribute"></synset-info>
              </div>
              <div v-else>
                <synset-info :synset="props.item" :details="true"></synset-info>
              </div>
            </template>
          </synset-list>
        </b-collapse>
      </div>
      <div v-if="isEmpty() && !loading && synsetId">
        <p>Nav saišu.</p>
      </div>
    </div>
  </div>
</template>

<script>
  module.exports = {
    props: ['synsetId', 'externalLinkType', 'synset', 'small', 'displayOnly', 'fullscreen'],
    data() {
      return {
        allRelations: {},
        loading: false,
        relationTypeTranslations: {
          'external_links' :'Ārējās saites',
          'synsets' :'Sinonīmu kopas',
          'hypernym' :'Sinonīmu kopas hiperonīmi (virsjēdzieni)',
          'hyponym': 'Sinonīmu kopas hiponīmi (apakšjēdzieni)',
          'holonym': 'Sinonīmu kopas holonīmi (veselie)',
          'meronym': 'Sinonīmu kopas meronīmi (daļas no veselā)',
          'antonym': 'Sinonīmu kopas antonīmi',
          'similar': 'Sinonīmu kopas aptuvenie sinonīmi',
          'also': 'Sinonīmu kopa saistīta ar',
          'gradset': 'Gradācijas jēdzienu grupa',
          'gradset_of_attribute': 'Nosaukums gradācijas jēdzienu grupai',
        },
        largeNetwork: false
      }
    },
    inject: ['openModal'],
    watch: {
      synsetId: function (newValue) {
        if (newValue) {
          this.getRelations();
        } else {
          this.allRelations = {};
        }
      }
    },
    mounted() {
      this.getRelations();
    },
    methods: {
      isEmpty() {
        return Object.keys(this.allRelations).length === 0;
      },
      getRelations() {
        if (!this.synsetId) return;

        this.loading = true;
        this.getRelationsForId(this.synsetId, this.externalLinkType)
          .then((r) => {
            if (r.data.error) {
              this.allRelations = {};
            } else {
              this.allRelations = r.data;
            }
            this.checkIfHasEqExternalLink();
          })
          .catch((r) => console.log(r))
          .finally(() => {
            this.loading = false;
            this.$emit('list-changed', !this.isEmpty(), this.allRelations);
          });
      },
      getRelationsForId(synsetId, externalLinkType = null) {
        let url = externalLinkType
          ? `/api/wordnet/synset/external_links/relations/${synsetId}/${externalLinkType}`
          : `/api/wordnet/synset/relations/${synsetId}`;

        const request = axios.get(url);
        return request;
      },
      checkIfHasEqExternalLink() {
        if (this.allRelations && this.allRelations.external_links) {
          this.$emit('has-eq-omw', this.allRelations.external_links.filter(l => l.display_relation == null).length > 0);
        }
      }
    }
  }
</script>
<style scoped>
  .relation-link {
    cursor: pointer;
    color: inherit;
  }

  .relation-list {
    overflow: auto;
    max-height: 50vh;
  }

  .relation-list.sm {
    max-height: 40vh;
  }
  .relation-list.large {
    display: none;
  }

  .title {
    font-weight: 400;
    font-size: 110%;
  }

  .underline {
    text-decoration: underline;
  }
  .network-section {
    display: none;
  }
  .network-section.fullscreen {
    display: block;
    height: 100%;
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    background: white;
    z-index: 10000;
    padding: 10px;
  }
  .network-section.large {
    display: block;
  }
</style>
