<template>
  <div>
    <div class="container my-3">
      <b-row>
        <b-col lg="6" class="d-flex align-items-end mb-3">
          <b-input-group size="sm">
            <b-form-input
              v-model="filter"
              type="search"
              id="filterInput"
              align="left"
              placeholder="Meklēt"
            ></b-form-input>
          </b-input-group>
        </b-col>
      </b-row>
      <b-row sm="7" md="6" class="my-3">
        <b-col>
          <b-pagination
            v-model="currentPage"
            :total-rows="totalRows"
            :per-page="perPage"
            align="fill"
            size="sm"
            class="my-0"
          ></b-pagination>
        </b-col>
      </b-row>
      <b-table
        :items="answers"
        :fields="fields"
        :current-page="currentPage"
        :per-page="perPage"
        :bordered="true"
        :filter="filter"
        :filter-included-fields="filterOn"
        @filtered="onFiltered"
        stacked="md"
        head-variant="light"
        show-empty
        small
      >
        <template #cell(sense)="row">
          <div class="synset-sense">{{ row.value.heading }}<sub>{{ row.value.parent_order_no ? `${row.value.parent_order_no},${row.value.order_no}` : row.value.order_no }}</sub></div>
          <div class="synset-gloss">{{ row.value.gloss }}</div>
          <a :href="'/_/wordnet/potential_links/'+row.value.potential_link_id" target="_blank">Skatīt</a>
        </template>
        <template #cell(answers)="row">
          <div class="answer-container" v-for="(ans, i) in row.value" :key="i">
<!--            <div>ID: {{ans.id}}</div>-->
            <div>{{ans.user}}</div>

            <div v-if="ans.answer_type === 1">
              <div>
                <span class="text-success">#{{ ans.no }}</span>
                <span>({{ ans.pwn_info.display_pos }})</span>
                <span class="synset-sense">{{ ans.pwn_info.senses.join(', ') }}</span>
                <span class="synset-gloss">- {{ ans.pwn_info.gloss }}</span>
              </div>
            </div>
            <div class="text-danger" v-else-if="ans.answer_type === 2">{{ ans.answer_type_str }}</div>
            <div class="text-yellow" v-else>{{ ans.answer_type_str }}</div>

            <div v-if="ans.manual">
              <span class="text-info">! Manuāla saite</span>
              <div class="ml-3" v-for="m in ans.manual">
                - <span v-if="m[0].relation">({{relationToString[m[0].relation]}})</span>
                <span class="synset-sense" v-html="synsetDisplayString(m)"></span>
              </div>
            </div>

          <div v-if="ans.other">
              <span class="text-info">! Iespējama saite</span>
              <div class="ml-3" v-for="o in ans.other">
                - <span class="synset-sense">{{ o.heading }}<sub>{{ o.parent_order_no ? `${o.parent_order_no},${o.order_no}` : o.order_no }}</sub></span>
                <span class="synset-gloss">{{ o.gloss }}</span>
              </div>
            </div>
          </div>
        </template>
      </b-table>
    </div>
  </div>
</template>

<script>
  module.exports = {
    props: ['answers'],
    data: function () {
      return {
        fields: [
          { key: 'sense', label: 'Nozīme', sortable: true, class: 'sense' },
          { key: 'votes', label: 'Balsis', class: 'votes', sortable: true },
          { key: 'status', label: 'Statuss', class: 'status', sortable: true},
          { key: 'in_wordnet', label: 'Pievienota', class: 'status', sortable: true},
          { key: 'answers', label: 'Atbildes', class: 'answers'}
        ],
        currentPage: 1,
        perPage: 10,
        filter: null,
        filterOn: ['sense'],
        totalRows: this.answers.length,
        relationToString: {
          'eq_has_hyperonym': 'LV šaurāka nozīme',
          'eq_has_hyponym': 'LV plašāka nozīme'
        }
      }
    },
    methods: {
      synsetDisplayString(senses) {
        return senses.map((s) => {
          return `${ s.heading }<sub>${ s.parent_order_no ? (s.parent_order_no + '.' + s.order_no) : s.order_no }</sub>`
        }).join(', ');
      },
      onFiltered(filteredItems) {
        // Trigger pagination to update the number of buttons/pages due to filtering
        this.totalRows = filteredItems.length
        this.currentPage = 1
      }
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
.votes, .status {
  text-align: center;
  width: 70px;
}
.sense {
  width: 300px;
}
.answer-container {
  /*border-radius: 0.25rem;*/
  border: 1px solid #e9ecef;
  /*background-color: #e9ecef;*/
  padding: 0.25rem;
}
.answer-container {
  margin-top: 0.25rem;
}
.answer-container:first-child {
  margin-top: 0;
}
.text-yellow {
  color: #eeb508;
}
</style>

