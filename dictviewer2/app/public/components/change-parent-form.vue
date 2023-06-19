<template>
  <b-modal :title="getTitle()" :id="this.id" :busy="this.submitting" @ok="this.submit" @hidden="this.reset"
           no-close-on-backdrop ok-title="Saglabāt" cancel-title="Atcelt" size="lg">
    <div class="alert alert-danger" v-if="error">{{error}}</div>

    <v-select v-model="selected" :options="senseOptions" label="nr">
      <template #option="{ nr, gloss }">
        <strong>{{ nr }}</strong> {{ gloss }}
      </template>
      <template #selected-option="{ nr, gloss }">
        <strong>{{ nr }}</strong> <span class="ml-1">{{ gloss }}</span>
      </template>
    </v-select>
  </b-modal>
</template>

<script>
  module.exports = {
    props: ['entry_id', 'senses'],
    mixins: [App.mixins.modalFormSaveShortcut],
    data: function () {
      return {
        entity: null,
        relation: null,
        sense_id: null,

        data: {},
        error: null,
        submitting: false,
        senseOptions: this.senses.reduce((acc, s) => {
          acc.push(this.createOption(s));
          if (s.subSenses)
            s.subSenses.forEach(ss => {
              acc.push(this.createSubOption(s, ss))
            });
          return acc;
        }, []),
        selected: null,
        id: 'changeParentForm'
      }
    },
    inject: ['setLoading'],
    watch: {
      selected: function (s) {
        this.data = {};
        if (s  && s.code) {
          this.data = s.code;
          if (this.entity === 'examples')
            this.data = Object.assign(this.relation, this.data);
          if (this.entity === 'entry_mwe_link')
            this.data.entry_id = this.relation.id;
        }
      },
      '$root.modals.changeParentForm': function (data) {
        this.sense_id = data.sense_id;
        this.relation = data.relation;
        this.entity = data.entity;

        if (this.senseOptions.length > 0 && this.senseOptions[0].nr === 'Šķirklis')
          this.senseOptions.shift();
        if (this.entity === 'sense_mwe_link')
          this.senseOptions.unshift({nr: 'Šķirklis', code: {entry_2_id: this.entry_id, type_id: 3, entry_1_id: this.relation.id}});
      }
    },
    methods: {
      truncate(source, size) {
        return source.length > size ? source.slice(0, size - 1) + "…" : source;
      },
      getTitle() {
        if (this.entity === 'examples')
          return 'Pārcelt piemēru pie citas nozīmes';
        else if (this.entity)
          return 'Pārcelt stabilu vārdu savienojumu';
        else
          return '';
      },
      createOption: function (s) {
        return {code: {sense_id: s.id}, nr: `${s.order_no}.`, gloss: s.gloss};
      },
      createSubOption: function (s, ss) {
        return {code: {sense_id: ss.id}, nr: `${s.order_no}.${ss.order_no}.`, gloss: ss.gloss};
      },
      submit: function (e) {
        e.preventDefault();
        // Opt1: change example sense (update example) (sense_id)
        // Opt2: change mwe sense (update sense mwe link) (sense_id)
        // Opt3: mwe from sense to entry (delete sense mwe link, create entry mwe link) (entry ids)
        // Opt4: mwe from entry to sense (delete entry mwe link, create sense mwe link)

        if (this.entity === 'entry_mwe_link' && this.data.sense_id) { // Opt4
          axios.delete(`/api/entries/${this.entry_id}/${this.entity}/${this.relation.id}`)
            .then(r => {
              if (!r.data.error) {
                submitForm(this, 'post', `/api/entries/${this.entry_id}/senses/${this.data.sense_id}/sense_mwe_link`, this.id);
              }
            });
        } else if (this.data.sense_id) { // Opt1, Opt2
          submitForm(this, 'patch', `/api/entries/${this.entry_id}/senses/${this.sense_id}/${this.entity}/${this.relation.id}`, this.id);
        } else if (this.entity === 'sense_mwe_link' && this.data.entry_1_id) { // Opt3
          axios.delete(`/api/entries/${this.entry_id}/senses/${this.sense_id}/sense_mwe_link/${this.relation.id}`)
            .then(r => {
              if (!r.data.error) {
                submitForm(this, 'post', `/api/entries/${this.entry_id}/relations`, this.id);
              }
            });
        }
      },
      reset: function () {
        this.data = {};
        this.error = null;
        this.selected = null;
      }
    },
  }
</script>
