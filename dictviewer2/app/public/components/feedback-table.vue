<template>
  <b-container fluid>
    <b-row class="mb-3">
      <b-col lg="6">
        <b-input-group size="sm">
          <b-form-input
                  v-model="filter.text"
                  type="search"
                  align="left"
                  placeholder="Meklēt"
          ></b-form-input>
        </b-input-group>
      </b-col>
      <b-col>
        <b-form-group>
          <b-form-checkbox-group v-model="filter.status" align="right">
            <b-form-checkbox :value="0">Jauns</b-form-checkbox>
            <b-form-checkbox :value="1">Salabots</b-form-checkbox>
            <b-form-checkbox :value="2">Atlikts</b-form-checkbox>
            <b-form-checkbox :value="4">Deleģēts</b-form-checkbox>
            <b-form-checkbox :value="3">Atkritums</b-form-checkbox>
          </b-form-checkbox-group>
        </b-form-group>

      </b-col>
    </b-row>

    <b-table
            small
            :items="items"
            :fields="fields"
            :current-page="currentPage"
            :per-page="perPage"
            sort-by="feedbacks"
            :sort-desc="true"
            :filter-function="customFilter"
            :filter="filter"
            @filtered="onFiltered"
    >
      <template v-slot:cell(entry)="row">
        <a target="_blank" :href="`/${encodeURIComponent(row.item.human_key)}`">{{ row.value }}</a>
      </template>

      <template v-slot:cell(queries)="row">
        <ul>
          <li v-for="(query, i) in queries[row.item.entry_id]" :key="i" class="query">{{query.caption}}</li>
        </ul>
      </template>

      <template v-slot:cell(feedbacks)="row">
        <feedback-list
                v-on:no-feedbacks="removeRow(row.item.entry_id)"
                :feedbacks="row.item.feedbacks"
                :visible-status="filter.status"
        ></feedback-list>
      </template>

    </b-table>

    <b-row>
      <b-col md="2">
        <b-form-group
                label="Rādīt"
                label-cols-sm="4"
                label-size="sm"
                label-for="perPageSelect"
        >
          <b-form-select
                  v-model="perPage"
                  id="perPageSelect"
                  size="sm"
                  align="left"
                  :options="pageOptions"
          ></b-form-select>
        </b-form-group>
      </b-col>

      <b-col md="10">
        <b-pagination
                v-model="currentPage"
                :total-rows="totalRows"
                :per-page="perPage"
                align="center"
                first-number
                last-number
        ></b-pagination>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
  module.exports = {
    props: ['entries', 'queries'],
    data() {
      return {
        items: this.entries,
        fields: [
          {key: 'entry', label: 'Šķirklis', sortable: true, sortDirection: 'desc'},
          {key: 'queries', label: 'Vaicājumi'},
          {key: 'feedbacks', label: 'Ziņojumi',
            formatter: (feedbacks, key, item) => {
              return feedbacks[0].created_at; // latest
            },
            sortable: true,
            sortByFormatted: true
          }
        ],
        totalRows: 1,
        currentPage: 1,
        perPage: 20,
        pageOptions: [20, 50, 100],
        filter: {
          text: null,
          status: [0]
        }
      }
    },
    mounted() {
      this.filter.status = [0];
    },
    methods: {
      onFiltered(filteredItems) {
        this.totalRows = filteredItems.length;
      },
      removeRow(entry_id) {
        let index = this.items.findIndex((i) => i.entry_id === entry_id);
        this.items.splice(index, 1);
      },
      customFilter(item, filter) {
        if (item.feedbacks.map(f => f.status).filter(s => filter.status.includes(s)).length > 0) {
          let re = new RegExp(filter.text ? filter.text : '');
          return item.entry.match(re) !== null;
        }
        return false;
      }

    }
  }
</script>

<style scoped>
  .query {
    font-size: 0.9em;
  }
</style>
