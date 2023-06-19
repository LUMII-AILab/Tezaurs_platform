<template>
  <div v-show="show" class="wrapper mt-2 p-2">
    <div class="text-danger" v-if="error">{{error}}</div>

    <div v-else>
      <div class="d-flex justify-content-between">
        <div class="current mb-2" :class="current && current.entry_id ? 'text-success' : 'text-danger'">
          <small><b>Saite uz:</b> {{ current && current.entry_id ? current.entry.human_key : '???' }}</small>
          <small v-if="current && current.sense && current.sense_2_id">({{ current.sense.full_order_no }}
            {{ current.sense.gloss }})</small>
        </div>
        <div>
          <button class="px-2 close-btn btn-sm" @click="show = false">
            <i class="fas fa-angle-up"></i>
          </button>
        </div>
      </div>

      <hr class="my-2">

      <div class="row">
        <div class="col entry-col">
          <b-form-input class="mb-2 search-input"
                        size="small"
                        ref="search"
                        placeholder="Meklēt šķirkli"
                        autocomplete="off"
                        v-model="search"></b-form-input>
        </div>
        <div class="col">
          <b-list-group v-if="current && current.sense_2_id">
            <b-list-group-item class="link text-danger mt-2" tabindex="0" button @click="selectSense(null)">
              <i class="fas fa-times"></i><span class="ms-2">Noņemt nozīmi</span>
            </b-list-group-item>
          </b-list-group>
          <div v-else class="mt-2 ms-2 text-warning">Nozīme nav izvēlēta</div>
        </div>
      </div>

      <div class="row">
        <div class="col entry-col">
          <div class="ps-2 p-1 heading">
            <span class="text-uppercase">Šķirkļi</span>
            <small v-if="resultSearch" class="text-secondary"> :{{ resultSearch }}</small>
          </div>
          <b-list-group class="link-list p-2">
            <b-spinner v-show="loading" :small="true" class="mx-auto"></b-spinner>
            <b-list-group-item class="link"
                               tabindex="0"
                               button
                               @click="selectEntry(option.id)"
                               v-for="(option, i) in options.entry" :key="i">
              {{ option.text }}
            </b-list-group-item>
          </b-list-group>
        </div>
        <div class="col">
          <div class="ps-2 p-1 heading">
            <span class="text-uppercase">Nozīmes</span>
            <small class="text-secondary">šķirklim <i>{{ current ? current.entry.heading : '' }}</i></small>
          </div>
          <b-list-group class="link-list p-2">
            <b-list-group-item class="link"
                               :class="{selected: current.sense_2_id && option.id === current.sense_2_id}"
                               tabindex="0"
                               button
                               @click="selectSense(option.id)"
                               v-for="(option, i) in options.sense" :key="i">
              {{ option.text }}
            </b-list-group-item>
          </b-list-group>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
module.exports = {
  props: ['visible', 'glossLink', 'text', 'type', 'ignoreEntryId', 'searchInput', 'error'],
  data: function () {
    return {
      show: this.visible,
      search: null,
      options: {sense: [], entry: []},
      resultSearch: null,
      current: this.glossLink,
      loading: false
    }
  },
  watch: {
    search: function (value, old) {
      this.onSearch(value)
    },
    show: function (open) {
      if (open && this.glossLink) this.focusInput();
    },
    visible: function (open) {
      this.show = open;
    },
    glossLink: function (gl) {
      this.current = gl;
      if (gl && gl.sense && !gl.sense.full_order_no) {
        this.current.sense.full_order_no = (gl.sense.parent_order_no ? `${gl.sense.parent_order_no}.` : '') + gl.sense.order_no + '.';
      }
    },
    'current.entry_id': function (id) {
      if (id) this.loadSenses(id);
    },
    searchInput: function (value) {
      this.search = value;
    }
  },
  methods: {
    focusInput() {
      this.$nextTick(() => this.$refs.search.focus());
    },
    selectEntry: function (id) {
      let entry = {id};
      entry.heading = id ? this.options.entry.find(o => o.id === id).text : null;
      entry.human_key = entry.heading.replace(/\s+/g, '_');
      this.current.entry = entry;
      this.$emit('select-entry', entry, this.type);
      this.$emit('select-sense', null, this.type); // clear the old sense field
    },
    selectSense: function (id) {
      let sense = id ? this.options.sense.find(o => o.id === id) : null;
      this.current.sense = sense;
      this.$emit('select-sense', sense, this.type);
    },
    onSearch: _.debounce(function (value) {
      this.clearResults();
      this.loading = true;
      axios.get('/api/suggest/entries', {
        params: {
          q: value, entry_type_id: null, ignore: this.ignoreEntryId
        }
      })
        .then(r => this.options.entry = r.data)
        .finally(() => {
          this.resultSearch = value;
          this.loading = false
        });
    }, 100),
    loadSenses: function (entryId) {
      console.log('load senses', entryId);
      this.options.sense = [];
      if (entryId === null) return;
      axios.get(`/api/suggest/senses/${entryId}`)
        .then(r => {
          this.options.sense = r.data.map(s => {
            s.full_order_no = (s.parent_order_no ? `${s.parent_order_no}.` : '') + s.order_no + '.';
            s.text = s.full_order_no + ' ' + s.gloss;
            return s;
          }).sort((a, b) => a.full_order_no.localeCompare(b.full_order_no));
        });
    },
    clearResults: function () {
      this.options.entry = [];
      // this.options.sense = [];
    }
  }
}
</script>

<style scoped>
.wrapper {
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: white;
  position: absolute;
  z-index: 1000;
  width: calc(100% - 2rem);
  box-shadow: 0 12px 32px rgba(0, 0, 0, .1), 0 2px 6px rgba(0, 0, 0, .08);
}

.heading {
  font-weight: 500;
}

.link-list {
  max-height: 250px;
  overflow-y: auto;
}

.link {
  border: none;
  padding: 0.2rem 0.5rem;
}

.link:first-child {
  padding-top: 0;
}

.link:last-child {
  padding-bottom: 0;
}

.link.selected {
  font-weight: 500;
}

.search-input {
  padding: 0.2rem 0.75rem;
}

.search-input:focus {
  box-shadow: none;
  border-color: #ced4da;
}

.entry-col {
  border-right: 1px solid rgba(33, 37, 41, .25);
}
.close-btn {
  border: none;
  background-color: transparent;
  font-size: larger;
}
</style>
