<template>
  <div>
    <div>
      <b-form-checkbox-group class="d-inline-block" v-model="nodesFilterSelected" :options="nodesFilterOptions" :disabled="showHierarchy"></b-form-checkbox-group>
      <b-form-checkbox switch class="d-inline-block" v-model="showHierarchy">hierarhija</b-form-checkbox>
      <img class="d-inline mb-1 ml-4" src="img/tezaurs/graph-labels.svg" height="22">
    </div>
    <div>
      <div ref="network" class="network-container mt-1" :class="{lg: lg}"></div>
      <div class="network-extras">
        <div class="controls p-3">
          <b-button v-if="showHierarchy && initClusteredNodeCount > currentClusteredNodeCount"
                    class="p-2 d-inline-block"
                    size="sm"
                    v-on:click="clusterLargeNodes">Sagrupēt</b-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  module.exports = {
    props: ['synset', 'synsetId', 'lg'],
    data: function () {
      return {
        nodesFilterOptions: [
          { text: 'angļu', value: 'external_links' },
          { text: 'vārda nozīmes', value: 'entry' },
          { text: 'latviešu', value: 'other' }
        ],
        nodesFilterSelected: ['external_links', 'entry', 'other'],
        showHierarchy: false,
        initClusteredNodeCount: 0,
        currentClusteredNodeCount: 0,
        nodesView: null,
        relationLabels: {
          // 'external_links' :'PWN',
          'external_links' :'',
          // 'hypernym' :'virsjēdziens',
          'hypernym' :'',
          // 'hyponym': 'apakšjēdziens',
          'hyponym': '',
          // 'holonym': 'veselais',
          'holonym': '',
          // 'meronym': 'daļa',
          'meronym': '',
          'antonym': 'antonīms',
          'similar': 'sinonīms',
          'also': 'saistīta ar',
          'gradset': 'gradācijas grupa',
          'entry': 'vārda nozīme'
        },
        colors: {
          'main': '#7BE141',
          'entry': '#C2F1A7',
          'external_links': '#FB7E81'
        },
        edgeColor: {
          'main': '#7BE141',
          'entry': '#C2F1A7',
          'external_links': '#FB7E81',
          'holonym': '#FCD197',
          'meronym': '#FCD197'
        },
        relations: {}
      }
    },
    mounted() {
      this.makeGraph();
      this.$parent.$on('list-changed', this.makeGraph);
    },
    watch: {
      nodesFilterSelected: function () {
        // this.makeGraph(true);
        if (this.nodesView) this.nodesView.refresh();
      },
      showHierarchy: function () {
        this.makeGraph(true);
      }
    },
    methods: {
      getRelationsForId(synsetId) {
        return axios.get(`/api/wordnet/synset/relations/${synsetId}`)
          .then((res) => {
            if (!res.data.error) {
              return res.data;
            }
          });
      },
      synsetDisplayString(synset) {
        const truncate = (input) => input.length > 30 ? `${input.substring(0, 30)}...` : input;

        if (synset.remote_id) {
          return `{${synset.senses.map(s => s.text).join(', ')}}\n${truncate(synset.def)}`;
        }

        let text = synset.senses.map((s) => {
          return `${ s.text.replace('<em>', '').replace('</em>', '') }_${ s.parent_order_no ? (s.parent_order_no + '.' + s.order_no) : s.order_no }`
        }).join(', ');
        return `{${text}}`;
      },
      getEdgeStyle(rel) {
        // if (['meronym', 'holonym'].includes(rel)) return [1, 3];
        if (rel === 'entry') return true;
        return false;
      },
      getArrowStyle(rel, rel_type) {
        if (['antonym', 'similar', 'also'].includes(rel)) return 'to, from';
        if (['entry', 'gradset'].includes(rel)) return '';
        if (['hyponym', 'meronym'].includes(rel)) return 'to';
        if (['hypernym', 'holonym'].includes(rel)) return 'from';

        if (rel === 'external_links') {
          if (!rel_type) return '';
          if (rel_type === 'LV plašāka nozīme')
            return {from: {enabled: true, type: 'inv_triangle'}};
          return {to: {enabled: true, type: 'inv_triangle'}};
        }
      },
      getEdge(from, to, rel, rel_type) {
        if (from === to) return {};
        return {
          from, to,
          label: this.relationLabels[rel],
          arrows: this.getArrowStyle(rel, rel_type),
          dashes: this.getEdgeStyle(rel),
          color: this.edgeColor[rel] || '#97C2FC',
          font: { align: "top" }
        };
      },
      getNode(synset, rel='main', lvl, depth=null, is_entry=false) {
        let id = synset.remote_id || parseInt(synset.synset_id);
        return {
          id: id,
          label: this.synsetDisplayString(synset),
          shape: "box",
          color: this.colors[rel] || '#97C2FC',
          widthConstraint: { maximum: 250 },
          type: rel,
          level: lvl,
          depth,
          is_entry
        };
      },
      getNextLevel(lvl, rel) { // Levels are used to construct the hierarchical graph
        if (rel === 'hypernym') return lvl-1;
        if (rel === 'hyponym') return lvl+1;
        return lvl;
      },
      async drawGraph(nodes, edges, relations, synsetId, visited = [], depth = 1, only = [], is_entry = false, lvl = 10) {
        synsetId = parseInt(synsetId);
        visited.push(synsetId);

        for (const name in relations) {
          if (this.showHierarchy && !(name === 'hypernym' || name === 'hyponym' ||  name === 'main')) {
            continue;
          }
          const nextLvl = this.getNextLevel(lvl, name);
          if (only.length > 0 && !only.includes(name)) continue;

          for (const r of relations[name]) {
            let id = r.remote_id || parseInt(r.synset_id);
            if (id !== synsetId) {
              let idx = nodes.findIndex(n => n.id === id);
              if (idx === -1) {
                nodes.push(this.getNode(r, name, nextLvl, depth, is_entry));
              }
              idx = edges.findIndex(e => (e.from === id && e.to === synsetId) || (e.to === id && e.from === synsetId));
              if (idx === -1) {
                edges.push(this.getEdge(synsetId, id, name, r.display_relation));
              }
            }
            if (r.synset_id && depth !== 0 && !visited.includes(r.synset_id)) {
              let rels = await this.getRelationsForId(r.synset_id);
              if (rels) {
                if (name === 'entry') {
                  await this.drawGraph(nodes, edges, rels, r.synset_id, visited, 0, ['external_links'], true);
                } else {
                  await this.drawGraph(nodes, edges, rels, r.synset_id, visited, depth-1, [], false, nextLvl);
                }
              }
            }
          }
        }

        // visited.push(synsetId);
      },
      async makeGraph(force=false) {
        if (!this.synset || !this.synsetId) return;
        let relations = await this.getRelationsForId(this.synsetId);
        if (JSON.stringify(relations) === JSON.stringify(this.relations) && !force) return;

        this.relations = relations;

        let nodes = [], edges = [], visited = [parseInt(this.synsetId)];
        let depth = this.showHierarchy ? 10 : 1;

        nodes.push(this.getNode(this.synset, 'main', 10));
        await this.drawGraph(nodes, edges, {...relations, ...{entry: this.synset.entry_synsets}}, parseInt(this.synsetId), visited, depth);

        console.log(nodes);
        console.log(edges);

        nodes = new vis.DataSet(nodes);
        // Only show certain nodes depending on a user-chosen filter
        const nodesFilter = (node) => {
          if (node.type === 'main') return true;
          if (node.type === 'external_links') {
            return this.nodesFilterSelected.includes(node.type)
              && !(!this.nodesFilterSelected.includes('entry') && node.is_entry)
              && !(!this.nodesFilterSelected.includes('other') && node.depth !== 1);
          }
          if (node.type === 'entry') {
            return this.nodesFilterSelected.includes(node.type);
          }
          return this.nodesFilterSelected.includes('other');
        };
        this.nodesView = new vis.DataView(nodes, { filter: nodesFilter });

        // create a network
        var container = this.$refs.network;
        var data = {
          nodes: this.nodesView,
          edges: edges
        };
        var options = {
          physics: {
            barnesHut: {
              gravitationalConstant: -2500,
              springLength: 150,
              springConstant: 0.005,
              damping: 0.4
            },
            hierarchicalRepulsion: {
              avoidOverlap: 0.7,
              damping: 0.9,
              springConstant: 0.02,
            },
            minVelocity: 2,
            enabled: true
          }
        };

        if (this.showHierarchy) {
          options = Object.assign(options, {
            layout: {
              hierarchical: {
                enabled: true,
                direction: 'UD',
                sortMethod: 'directed',
                shakeTowards: 'leaves'
              }
            }
          });
        }

        this.network = new vis.Network(container, data, options);

        this.network.on("selectNode", (params) => {
          if (params.nodes.length == 1) {
            if (this.network.isCluster(params.nodes[0]) == true) {
              this.network.openCluster(params.nodes[0]);
              this.currentClusteredNodeCount = Object.keys(this.network.clustering.clusteredNodes).length;
            }
          }
        });

        if (this.showHierarchy) {
          this.clusterLargeNodes();
        }

      },
      clusterLargeNodes () {
        let largeNodes = this.nodesView.getIds({filter: n => this.network.getConnectedEdges(n.id).length > 5});

        let clusterOptionsByData;
        for (const largeNode of largeNodes) {
          clusterOptionsByData = {
            joinCondition: (childOptions) => {
              if (!this.network.getConnectedNodes(childOptions.id).includes(largeNode)) return false;
              let edges = this.network.getConnectedEdges(childOptions.id);
              return edges.length === 1;
            },
            processProperties: function (clusterOptions, childNodes) {
              clusterOptions.level = childNodes[0].level;
              clusterOptions.label = "[" + childNodes.length + "]";
              return clusterOptions;
            },
            clusterNodeProperties: {
              borderWidth: 2,
              shape: "box",
              font: {size: 21},
            },
          };
          this.network.cluster(clusterOptionsByData);
        }

        this.currentClusteredNodeCount = this.initClusteredNodeCount = Object.keys(this.network.clustering.clusteredNodes).length;
      }
    },
  }
</script>

<style>
  .network-container {
    border: solid 1px rgba(0, 0, 0, 0.125);
    border-radius: 4px;
    height: 60vh;
    width: 800px;
  }
  .network-container.lg {
    height: calc(100vh - 120px);
    width: 100%;
  }
  .fullscreen .network-container {
    height: calc(100% - 50px);
    width: calc(100% - 20px);
    position: fixed;
  }
  .network-extras {
    position: relative;
    top: 0;
    left: 0;
    z-index: 100;
  }
  .network-extras .controls {
    display: inline-block;
  }
  .network-extras .controls .btn {
    box-shadow: 0px 3px 1px -2px rgba(0, 0, 0, 0.2),0px 2px 2px 0px rgba(0, 0, 0, 0.14),0px 1px 5px 0px rgba(0,0,0,.12);
  }
</style>