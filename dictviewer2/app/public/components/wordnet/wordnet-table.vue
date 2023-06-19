<template>
  <b-container fluid>
    <b-row>
      <b-col lg="6" class="d-flex align-items-end mb-3">
        <b-input-group size="sm">
          <b-form-input
                  v-model="filter.text"
                  type="search"
                  id="filterInput"
                  align="left"
                  placeholder="Meklēt"
          ></b-form-input>
        </b-input-group>
      </b-col>

      <b-col lg="6">
        <b-form-group>
          <b-form-checkbox-group v-model="filter.status" align="right" stacked>
            <b-form-checkbox :value="0">
              Neiesākts ({{filteredStatusCounts[0]}}/{{statusCounts[0]}})
            </b-form-checkbox>
            <b-form-checkbox :value="1">
              Iesākts ({{filteredStatusCounts[1]}}/{{statusCounts[1]}})
            </b-form-checkbox>
            <b-form-checkbox :value="2">
              Pabeigta 1. fāze ({{filteredStatusCounts[2]}}/{{statusCounts[2]}})
            </b-form-checkbox>
            <b-form-checkbox :value="3">
              Pabeigta 2. fāze ({{filteredStatusCounts[3]}}/{{statusCounts[3]}})
            </b-form-checkbox>
          </b-form-checkbox-group>
        </b-form-group>
      </b-col>
    </b-row>

    <b-row class="mt-3 d-flex align-items-end">
      <b-col class="d-flex">
        <b-form-input class="d-inline mr-3" size="sm" v-model="currentPage" style="width:50px"></b-form-input>
        <b-pagination
                v-model="currentPage"
                :total-rows="totalRows"
                :per-page="perPage"
                align="left"
                first-number
                last-number
                size="sm"
        ></b-pagination>
      </b-col>
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
                  align="right"
                  :options="pageOptions"
          ></b-form-select>
        </b-form-group>
      </b-col>
    </b-row>

    <b-table
            small
            :items="entries"
            :fields="fields"
            :current-page="currentPage"
            :per-page="perPage"
            sort-by="no"
            :filter="filter"
            :filter-function="customFilter"
            @filtered="onFiltered"
    >
      <template v-slot:cell(entry)="row">
        <a target="_blank" :href="`/${encodeURIComponent(row.value)}`">{{ row.value }}</a>
      </template>

      <template v-slot:cell(senses_done)="row">
        <b-form-checkbox v-model="row.item.senses_done"
                         @change="changeStatusWrapper(row.item.entry, row.item.id, 'senses_done', ...arguments)"
        ></b-form-checkbox>
      </template>
      <template v-slot:cell(examples_done)="row">
        <b-form-checkbox v-model="row.item.examples_done"
                         @change="changeStatusWrapper(row.item.entry, row.item.id, 'examples_done', ...arguments)"
        ></b-form-checkbox>
      </template>
      <template v-slot:cell(visible_examples_done)="row">
        <b-form-checkbox v-model="row.item.visible_examples_done"
                         @change="changeStatusWrapper(row.item.entry,row.item.id, 'visible_examples_done', ...arguments)"
        ></b-form-checkbox>
      </template>
      <template v-slot:cell(inner_links_done)="row">
        <b-form-checkbox v-model="row.item.inner_links_done"
                         @change="changeStatusWrapper(row.item.entry, row.item.id, 'inner_links_done', ...arguments)"
        ></b-form-checkbox>
      </template>
      <template v-slot:cell(outer_links_done)="row">
        <b-form-checkbox v-model="row.item.outer_links_done"
                         @change="changeStatusWrapper(row.item.entry, row.item.id, 'outer_links_done', ...arguments)"
        ></b-form-checkbox>
      </template>

      <template v-slot:cell(assignee)="row">
        <b-input-group size="sm">
          <b-form-input
                  v-model="row.item.assignee"
                  @keyup.enter="$event.target.blur()"
                  @blur="saveAssigneeWrapper(row.item.entry, row.item.id, row.item.assignee)"></b-form-input>
          <b-button size="sm" v-if="!row.item.assignee && current_user"
                    class="ml-2" @click="saveAssigneeWrapper(row.item.entry, row.item.id, current_user)">es
            <b-icon icon="person-plus-fill"></b-icon>
          </b-button>
        </b-input-group>
      </template>

      <template v-slot:cell(comments)="row">
        <b-row>
          <b-col sm="10">
            <small style="white-space: pre-line;"> {{row.item.comments}}</small>
          </b-col>
          <b-col sm="2">
            <b-button
                    variant="outline-secondary border-0"
                    size="sm"
                    @click="openModal(row.item)"
            >
              <b-icon icon="pencil"></b-icon>
            </b-button>
          </b-col>
        </b-row>
      </template>
    </b-table>

    <b-row>
      <b-col>
        <b-form-group label-size="sm" label-align-sm="right"
                :label="'Kopā: ' + Object.values(filteredStatusCounts).reduce((a, c) => a+c)">
        </b-form-group>
      </b-col>
    </b-row>

    <wordnet-comment-form v-on:update="updateId" :wordnet-entry="commentModalEntry" :modal="true"></wordnet-comment-form>
  </b-container>
</template>

<script>
  module.exports = {
    props: ['entries', 'user', 'non_top'],
    data() {
      const fields = [
        {key: 'entry', label: 'Šķirklis', sortable: true, sortDirection: 'desc'},
        {key: 'senses_done', label: 'Pabeigtas nozīmes', class: 'text-center'},
        {key: 'examples_done', label: 'Pabeigti piemēri', class: 'text-center'},
        {key: 'visible_examples_done', label: 'Atlasīti rādāmie piemēri', class: 'text-center'},
        {key: 'inner_links_done', label: 'Savilktas iekšējās saites', class: 'text-center'},
        {key: 'outer_links_done', label: 'Savilktas ārējās saites', class: 'text-center'},
        {key: 'assignee', label: 'Atbildīgais', class: 'text-center', thStyle: {width: '130px'}},
        {key: 'comments', label: 'Komentāri', thStyle: {width: '700px'}}
      ];
      if (this.non_top !== true)
        fields.unshift({key: 'no', label: 'Nr.', sortable: true, sortDirection: 'asc'});
      return {
        fields: fields,
        totalRows: 1,
        currentPage: 1,
        perPage: 10,
        pageOptions: [10, 20, 50],
        filter: {
          text: null,
          status: [0, 1, 2, 3]
        },
        statusCounts: this.getCounts(this.entries),
        filteredStatusCounts: {0: 0, 1: 0, 2: 0, 3: 0},
        current_user: this.user.login === 'unknown' ? null : this.user.full_name,
        commentModalEntry: this.entries[0]
      }
    },
    mounted() {
      this.onFiltered(this.entries);
    },
    methods: {
      onFiltered(filteredItems) {
        this.totalRows = filteredItems.length;
        this.statusCounts = this.getCounts(this.entries);
        this.filteredStatusCounts = this.getCounts(filteredItems);
      },
      customFilter(item, filter) {
        if (filter.status.includes(this.getStatus(item))) {
          let re = new RegExp(filter.text ? filter.text : '');
          return item.entry.match(re) !== null
            || (item.assignee && item.assignee.match(re) !== null)
            || (item.comments && item.comments.match(re) !== null);
        }
        return false;
      },
      isDoneInner(item) {
        return item.senses_done && item.examples_done && item.visible_examples_done && item.inner_links_done;
      },
      isDone(item) {
        return item.senses_done && item.examples_done && item.visible_examples_done && item.inner_links_done && item.outer_links_done;
      },
      isInProgress(item) {
        return item.senses_done || item.examples_done || item.visible_examples_done || item.inner_links_done || item.outer_links_done;
      },
      getStatus(item) {
        if (this.isDone(item)) return 3;
        if (this.isDoneInner(item)) return 2;
        if (this.isInProgress(item)) return 1;
        return 0;
      },
      getCounts(entries) {
        let counts = {0: 0, 1: 0, 2: 0, 3: 0};
        entries.forEach((i) => {counts[this.getStatus(i)]++;});
        return counts;
      },
      rowClass(item, type) {
        if (!item || type !== 'row') return;
        if (this.isDone(item)) return 'table-success';
        if (this.isInProgress(item)) return 'table-warning';
      },
      changeStatus(id, statusType, newStatus) {
        this.update(id, statusType, newStatus);
      },
      changeStatusWrapper(entry, id, statusType, newStatus) {
        if (id == null) // if this entry is not yet in the wordnet_entries table
          axios.post('/api/wordnet/wordnet_entry', {entry})
            .then(r => {
              if (r.data.error) throw Error(r.data.error);
              this.entries[this.entries.findIndex(e => e.entry === entry)].id = r.data.id;
              id = r.data.id;
            })
            .then(() => this.changeStatus(id, statusType, newStatus))
            .catch((e) => console.log('ERROR', e));
        else
          this.changeStatus(id, statusType, newStatus);
      },
      saveAssigneeWrapper(entry, id, assignee) {
        if (id == null) // if this entry is not yet in the wordnet_entries table
          axios.post('/api/wordnet/wordnet_entry', {entry})
            .then(r => {
              if (r.data.error) throw Error(r.data.error);
              this.entries[this.entries.findIndex(e => e.entry === entry)].id = r.data.id;
              id = r.data.id;
            })
          .then(() => this.saveAssignee(id, assignee))
          .catch((e) => console.log('ERROR', e));
        else
          this.saveAssignee(id, assignee);
      },
      saveAssignee(id, assignee) {
        this.entries[this.entries.findIndex(e => e.id === id)].assignee = assignee;
        this.update(id, 'assignee', assignee, true);
      },
      update(id, column, value, withToast = false) {
        axios.patch(`/api/wordnet/${id}/${column}`, {value})
          .then((r) => {
            if (r.data.error) throw Error(r.data.error);
            else if (withToast) this.$bvToast.toast('Saglabāts', {variant: 'success', autoHideDelay: 1000})
          })
          .catch((e) => console.log('ERROR', r.data.error))
      },
      openModal(entry) {
        this.commentModalEntry = entry;
        this.$bvModal.show('modal-comments');
      },
      updateId(id) {
        this.entries[this.entries.findIndex(e => e.entry === this.commentModalEntry.entry)].id = id;
      }
    }
  }
</script>
